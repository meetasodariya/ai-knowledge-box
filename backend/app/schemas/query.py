from typing import Any

from pydantic import BaseModel, Field, field_validator


class QueryRequest(BaseModel):
    question: str = Field(..., max_length=500)

    @field_validator("question")
    @classmethod
    def validate_question(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Question cannot be empty or whitespace only")
        return trimmed


class QueryResponse(BaseModel):
    question: str
    answer: str
    sources: list[dict[str, Any]]
    timestamp: str
