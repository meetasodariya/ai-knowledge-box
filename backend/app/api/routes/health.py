import time
from datetime import UTC, datetime

from fastapi import APIRouter

from app.services.vector_store import vector_store

router = APIRouter()
START_TIME = time.time()


@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "timestamp": datetime.now(UTC).isoformat(),
        "uptime": round(time.time() - START_TIME, 2),
        "vectorStoreSize": vector_store.size,
    }
