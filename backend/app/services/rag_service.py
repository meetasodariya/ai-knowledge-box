from typing import Any

import google.generativeai as genai
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logger import logger
from app.db.models import Chunk, Item
from app.services.embedding_service import embed_query
from app.services.vector_store import vector_store


async def answer_question(
    question: str,
    db: AsyncSession,
    top_k: int = 5,
) -> tuple[str, list[dict[str, Any]]]:
    """
    RAG Pipeline:
    1. Embed query
    2. Vector similarity search
    3. Retrieve context chunks from DB
    4. Call LLM with grounded prompt
    5. Return answer + deduplicated sources
    """
    # 1. Embed query
    query_vec = await embed_query(question)

    # 2. Search vector store
    chunk_ids = vector_store.search(query_vec, top_k=top_k)

    if not chunk_ids:
        raise HTTPException(
            status_code=400,
            detail={"code": "NO_CONTENT", "message": "No content ingested yet. Add notes or URLs first."}
        )

    # 3. Retrieve chunks with parent items
    stmt = (
        select(Chunk, Item)
        .join(Item, Chunk.item_id == Item.id)
        .where(Chunk.id.in_(chunk_ids))
    )
    result = await db.execute(stmt)
    rows = result.all()

    if not rows:
        raise HTTPException(
            status_code=400,
            detail={"code": "NO_CONTENT", "message": "No content found for matched chunks."}
        )

    # 4. Construct context prompt
    context_blocks = []
    for idx, (chunk, item) in enumerate(rows, 1):
        context_blocks.append(f"[{idx}] Title: {item.title or 'Untitled'}\n{chunk.content}")

    context_str = "\n\n---\n\n".join(context_blocks)
    prompt = (
        "You are a helpful AI assistant that answers questions strictly based on the provided context.\n"
        "If the answer is not in the context, say so clearly. Do not make up information. Be concise and factual.\n\n"
        f"Context:\n{context_str}\n\n"
        f"Question: {question}\n\n"
        "Answer:"
    )

    # 5. Call LLM with fallback support
    candidate_models = [settings.CHAT_MODEL, "gemini-3.8-flash", "gemini-flash-latest"]
    answer_text = ""
    last_err = None

    for m in candidate_models:
        try:
            model = genai.GenerativeModel(
                model_name=f"models/{m}",
                generation_config={"temperature": 0.1, "max_output_tokens": 1024}
            )
            response = model.generate_content(prompt)
            answer_text = response.text.strip()
            break
        except Exception as e:
            logger.warning(f"Model {m} failed: {e}. Trying fallback...")
            last_err = e

    if not answer_text:
        raise HTTPException(
            status_code=502,
            detail={"code": "AI_ERROR", "message": f"AI completion error: {last_err}"}
        )

    # 6. Deduplicate sources by itemId
    seen_items = set()
    sources = []
    for chunk, item in rows:
        if item.id not in seen_items:
            seen_items.add(item.id)
            sources.append({
                "itemId": item.id,
                "title": item.title or "Untitled",
                "sourceType": item.source_type,
                "sourceUrl": item.source_url,
                "snippet": chunk.content[:200],
            })

    return answer_text, sources
