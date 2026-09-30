import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    INTERNAL_API_KEY: str = os.getenv("INTERNAL_API_KEY", "dev-secret-internal-key")
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    OPENROUTER_MODEL: str = os.getenv("OPENROUTER_MODEL", "google/gemini-2.5-flash")
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1/chat/completions"
    OPENROUTER_TIMEOUT: float = 10.0
    LOG_LEVEL: str = "INFO"

    # === Intégration Assistant Conversationnel ===
    # Endpoint Django base (API) — utilisé pour rapatrier les données métier autorisées
    DJANGO_BASE_URL: str = os.getenv("DJANGO_BASE_URL", "http://localhost:8000/api")
    # Même clé partagée que FASTAPI_INTERNAL_API_KEY côté Django
    DJANGO_INTERNAL_API_KEY: str = os.getenv(
        "DJANGO_INTERNAL_API_KEY",
        os.getenv("INTERNAL_API_KEY", "dev-secret-internal-key"),
    )
    # Modèle Hugging Face (chat completions via AsyncInferenceClient)
    HUGGINGFACE_MODEL: str = os.getenv("HUGGINGFACE_MODEL", "mistralai/Mistral-7B-Instruct-v0.3")
    HF_TIMEOUT: float = 30.0

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
