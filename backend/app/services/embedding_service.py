
import google.generativeai as genai
from fastapi import HTTPException

from app.core.config import settings
from app.core.logger import logger

# Configure Google Generative AI
if settings.OPENAI_API_KEY:
    genai.configure(api_key=settings.OPENAI_API_KEY)

BATCH_SIZE = 50


async def generate_embeddings(texts: list[str]) -> list[list[float]]:
    """
    Generates embedding vectors for a list of strings via Gemini embedding model.
    """
    if not texts:
        return []

    if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY.startswith("your_"):
        raise HTTPException(
            status_code=502,
            detail={"code": "AI_ERROR", "message": "API key not configured or invalid."}
        )

    results = []
    try:
        for i in range(0, len(texts), BATCH_SIZE):
            batch = texts[i:i + BATCH_SIZE]
            for text in batch:
                resp = genai.embed_content(
                    model=f"models/{settings.EMBEDDING_MODEL}",
                    content=text,
                    task_type="retrieval_document"
                )
                results.append(resp["embedding"])

        return results
    except Exception as e:
        logger.error(f"Error generating embeddings: {e}")
        raise HTTPException(
            status_code=502,
            detail={"code": "AI_ERROR", "message": f"AI embedding service error: {e!s}"}
        ) from e


async def embed_query(query: str) -> list[float]:
    """Generates embedding for query using task_type='retrieval_query'."""
    try:
        resp = genai.embed_content(
            model=f"models/{settings.EMBEDDING_MODEL}",
            content=query,
            task_type="retrieval_query"
        )
        return resp["embedding"]
    except Exception as e:
        logger.error(f"Error embedding query: {e}")
        raise HTTPException(
            status_code=502,
            detail={"code": "AI_ERROR", "message": f"AI query embedding error: {e!s}"}
        ) from e
