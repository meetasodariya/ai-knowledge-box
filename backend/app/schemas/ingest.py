import re
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class IngestRequest(BaseModel):
    type: Literal["note", "url"]
    content: str = Field(..., min_length=1, max_length=50000)

    @field_validator("content")
    @classmethod
    def validate_content_and_url(cls, v: str, info) -> str:
        trimmed = v.strip()
        # If url type, validate URL structure
        source_type = info.data.get("type")
        if source_type == "url":
            if not trimmed:
                raise ValueError("URL cannot be empty")
            url_pattern = re.compile(
                r"^https?://[a-zA-Z0-9.-]+(?:\.[a-zA-Z]{2,})+(?:/.*)?$", re.IGNORECASE
            )
            if not url_pattern.match(trimmed):
                raise ValueError("Invalid URL format")

        return v


class IngestResponse(BaseModel):
    id: str
    title: str | None
    sourceType: str
    chunkCount: int
    createdAt: str
