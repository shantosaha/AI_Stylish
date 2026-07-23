from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://user:password@localhost:5432/ai_stylish"
    secret_key: str = "your-secret-key-change-in-production"
    debug: bool = True

    class Config:
        env_file = ".env"


settings = Settings()
