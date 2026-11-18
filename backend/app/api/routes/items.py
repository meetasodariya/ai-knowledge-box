from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Chunk, Item
from app.db.session import get_db
from app.schemas.items import ItemOut, ItemsListResponse

router = APIRouter()


@router.get("/items", response_model=ItemsListResponse)
async def list_items(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns paginated list of items with their chunk counts.
    """
    # Count total items
    count_stmt = select(func.count(Item.id))
    total = (await db.execute(count_stmt)).scalar() or 0

    # Query items with chunk counts via LEFT JOIN
    stmt = (
        select(
            Item,
            func.count(Chunk.id).label("chunk_count")
        )
        .outerjoin(Chunk, Item.id == Chunk.item_id)
        .group_by(Item.id)
        .order_by(desc(Item.created_at))
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(stmt)
    rows = result.all()

    items_out = []
    for item, chunk_count in rows:
        items_out.append(
            ItemOut(
                id=item.id,
                sourceType=item.source_type,
                sourceUrl=item.source_url,
                title=item.title,
                createdAt=item.created_at,
                chunkCount=chunk_count,
            )
        )

    return ItemsListResponse(
        items=items_out,
        total=total,
        limit=limit,
        offset=offset,
    )
