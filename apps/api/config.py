from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Defaults to local SQLite so the API runs standalone without a live
    # Postgres/Supabase connection; set DATABASE_URL to a postgresql:// URL
    # (e.g. Supabase connection string) in production.
    database_url: str = "sqlite:///./ai_stylish.db"
    secret_key: str = "your-secret-key-change-in-production"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days
    debug: bool = True

    weather_cache_ttl_minutes: int = 60
    open_meteo_base_url: str = "https://api.open-meteo.com/v1/forecast"

    repeat_avoidance_window_days: int = 7

    # AI Provider Router (Phase 9): unset by default - cloud_preferred/auto
    # gracefully fall back to the local seam functions when no key is
    # configured, exactly like every other cloud-optional path in this app
    # (weather provider failures, realistic preview). Never required.
    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-sonnet-5"

    class Config:
        env_file = ".env"


settings = Settings()
