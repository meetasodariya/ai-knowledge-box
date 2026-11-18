
from pydantic import BaseModel


class ItemOut(BaseModel):
    id: str
    sourceType: str
    sourceUrl: str | None
    title: str | None
    createdAt: str
    chunkCount: int


class ItemsListResponse(BaseModel):
    items: list[ItemOut]
    total: int
    limit: int
    offset: int
