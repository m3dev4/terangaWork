import logging
from fastapi import FastAPI
from app.config import settings
from app.routes import router as matching_router

logging.basicConfig(
    level=settings.LOG_LEVEL,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

app = FastAPI(
    title="Jëfly Matching Intelligent Microservice",
    description="Microservice stateless de calcul de pertinence et matching à deux étages (Scoring déterministe + LLM OpenRouter)",
    version="1.0.0",
)

app.include_router(matching_router)


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "service": "matching-intelligent"}
