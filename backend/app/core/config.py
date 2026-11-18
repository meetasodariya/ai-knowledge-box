
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    OPENAI_API_KEY: str = ""
    PORT: int = 3001
    HOST: str = "127.0.0.1"  # Localhost binding for secure local development
    NODE_ENV: str = "development"
    FRONTEND_URL: str = "http://localhost:5173"
    DATABASE_URL: str = "sqlite+aiosqlite:///./knowledge.db"
    RATE_LIMIT_PER_MINUTE: int = 200

    # Gemini model configurations
    EMBEDDING_MODEL: str = "gemini-embedding-001"
    CHAT_MODEL: str = "gemini-3.5-flash-lite"


settings = Settings()
