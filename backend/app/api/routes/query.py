from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logger import logger
from app.db.session import get_db
from app.schemas.query import QueryRequest, QueryResponse
from app.services.rag_service import answer_question

router = APIRouter()


@router.post("/query", response_model=QueryResponse)
async def query_knowledge(
    payload: QueryRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    RAG semantic search and answer generation.
    """
    logger.info(f"Query request: '{payload.question}'")
    answer_text, sources = await answer_question(payload.question, db)

    return QueryResponse(
        question=payload.question,
        answer=answer_text,
        sources=sources,
        timestamp=datetime.now(UTC).isoformat(),
    )
