import json
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logger import logger
from app.db.models import Chunk, Item
from app.db.session import get_db
from app.schemas.ingest import IngestRequest, IngestResponse
from app.services.chunking_service import chunk_text
from app.services.embedding_service import generate_embeddings
from app.services.ingestion_service import process_content
from app.services.vector_store import vector_store

router = APIRouter()


@router.post("/ingest", response_model=IngestResponse, status_code=status.HTTP_201_CREATED)
async def ingest_content(
    payload: IngestRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Ingests text note or URL:
    1. Parse content
    2. Chunk text
    3. Generate embeddings
    4. Persist Item + Chunks atomically in DB
    5. Update in-memory VectorStore
    """
    logger.info(f"Ingest request received: type={payload.type}")

    # 1. Process content (scrape URL or format note)
    title, raw_content = await process_content(payload.type, payload.content)

    # 2. Chunk text
    chunks = chunk_text(raw_content)
    if not chunks:
        raise HTTPException(
            status_code=422,
            detail={"code": "CONTENT_TOO_SHORT", "message": "Content is too short to be indexed."}
        )

    # 3. Generate embeddings
    embeddings = await generate_embeddings(chunks)

    # 4. Atomic database insert
    item_id = str(uuid.uuid4())
    now_iso = datetime.now(UTC).isoformat()

    new_item = Item(
        id=item_id,
        source_type=payload.type,
        source_url=payload.content if payload.type == "url" else None,
        raw_content=raw_content,
        title=title,
        created_at=now_iso,
    )
    db.add(new_item)

    chunk_models = []
    chunk_ids = []
    for idx, (content_chunk, emb) in enumerate(zip(chunks, embeddings, strict=True)):
        c_id = str(uuid.uuid4())
        chunk_ids.append(c_id)
        chunk_models.append(
            Chunk(
                id=c_id,
                item_id=item_id,
                chunk_index=idx,
                content=content_chunk,
                embedding=json.dumps(emb),
            )
        )
    db.add_all(chunk_models)
    await db.commit()

    # 5. Add to in-memory vector store
    vector_store.add_batch(chunk_ids, embeddings)

    logger.info(f"Ingested item {item_id} with {len(chunks)} chunks.")

    return IngestResponse(
        id=item_id,
        title=title,
        sourceType=payload.type,
        chunkCount=len(chunks),
        createdAt=now_iso,
    )
