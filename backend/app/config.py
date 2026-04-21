from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_env: str = "development"
    app_secret_key: str = "dev-secret-key"
    frontend_url: str = "http://localhost:3000"
    cors_origins: str = ""  # comma-separated; empty = use defaults

    database_url: str = "sqlite+aiosqlite:///./smelt.db"
    redis_url: str = "redis://localhost:6379/0"

    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "us-east-1"
    s3_bucket: str = "smelt-uploads"

    anthropic_api_key: str = ""
    llm_model: str = "claude-sonnet-4-6"
    llm_max_tokens: int = 4096

    openrouter_api_key: str = ""
    openrouter_model: str = "deepseek/deepseek-chat"

    salesforce_client_id: str = ""
    salesforce_client_secret: str = ""
    hubspot_api_key: str = ""

    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""

    sentry_dsn: str = ""
    posthog_api_key: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
