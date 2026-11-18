import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.routes.health import router as health_router
from app.api.routes.ingest import router as ingest_router
from app.api.routes.items import router as items_router
from app.api.routes.query import router as query_router
from app.core.config import settings
from app.core.logger import logger
from app.db.session import AsyncSessionLocal, init_db
from app.services.vector_store import vector_store


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: init DB and warm vector store
    logger.info("Initializing database...")
    await init_db()

    logger.info("Warming up VectorStore from persisted SQLite database...")
    async with AsyncSessionLocal() as session:
        await vector_store.load_from_db(session)

    yield
    # Shutdown clean up
    logger.info("Shutting down FastAPI Knowledge Inbox...")


app = FastAPI(
    title="AI Knowledge Inbox",
    description="High-performance async RAG Knowledge Inbox powered by FastAPI & Gemini",
    version="2.0.0",
    lifespan=lifespan,
)

# 1. CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. GZip Compression
app.add_middleware(GZipMiddleware, minimum_size=1000)


# 3. Request Logging & Timing Middleware
@app.middleware("http")
async def request_logger_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration_ms = round((time.time() - start_time) * 1000, 2)

    logger.info(
        f"{request.method} {request.url.path} -> {response.status_code} ({duration_ms} ms)"
    )
    response.headers["X-Process-Time"] = f"{duration_ms}ms"
    return response


# 4. Centralized Error Handlers matching frontend contract
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Translates Pydantic validation errors to clean 400 shape."""
    first_err = exc.errors()[0] if exc.errors() else {}
    msg = first_err.get("msg", "Invalid input")
    if msg.startswith("Value error, "):
        msg = msg.replace("Value error, ", "")

    # Clean details for JSON serialization
    safe_details = []
    for err in exc.errors():
        clean_err = {k: v for k, v in err.items() if k != "ctx"}
        safe_details.append(clean_err)

    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": msg,
                "details": safe_details,
            }
        },
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handles HTTPExceptions formatted as structured error payloads."""
    if isinstance(exc.detail, dict) and "code" in exc.detail:
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.detail},
        )

    # Standard status mappings
    code_map = {
        404: "NOT_FOUND",
        400: "BAD_REQUEST",
        422: "UNPROCESSABLE_ENTITY",
        502: "AI_ERROR",
        500: "INTERNAL_ERROR",
    }
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": code_map.get(exc.status_code, "ERROR"),
                "message": str(exc.detail),
            }
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled Exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected server error occurred.",
            }
        },
    )


# 5. Mount API Routes under /api
app.include_router(health_router, prefix="/api", tags=["Health"])
app.include_router(ingest_router, prefix="/api", tags=["Ingest"])
app.include_router(items_router, prefix="/api", tags=["Items"])
app.include_router(query_router, prefix="/api", tags=["Query"])
