import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent.parent
IS_VERCEL = bool(os.getenv("VERCEL") or os.getenv("VERCEL_ENV"))
STORAGE_DIR = Path(os.getenv("STORAGE_DIR", "/tmp/civicpulse_storage")) if IS_VERCEL else (BASE_DIR / "storage")
ORIGINALS_DIR = STORAGE_DIR / "originals"
ANNOTATED_DIR = STORAGE_DIR / "annotated"
THUMBNAILS_DIR = STORAGE_DIR / "thumbnails"

ORIGINALS_DIR.mkdir(parents=True, exist_ok=True)
ANNOTATED_DIR.mkdir(parents=True, exist_ok=True)
THUMBNAILS_DIR.mkdir(parents=True, exist_ok=True)


def _resolve_database_url() -> str:
    env_url = os.getenv("DATABASE_URL")
    if env_url:
        if env_url.startswith("postgres://"):
            return env_url.replace("postgres://", "postgresql://", 1)
        return env_url
    if IS_VERCEL:
        return "sqlite:////tmp/civicpulse.db"
    return f"sqlite:///{BASE_DIR}/civicpulse.db"


class Settings(BaseSettings):
    PROJECT_NAME: str = "CivicPulse AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "civicpulse-secret-key-production-ready-2026-bengaluru")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days for demo
    
    # Database
    DATABASE_URL: str = _resolve_database_url()
    
    # Storage
    STORAGE_PATH: str = str(STORAGE_DIR)
    ORIGINALS_PATH: str = str(ORIGINALS_DIR)
    ANNOTATED_PATH: str = str(ANNOTATED_DIR)
    THUMBNAILS_PATH: str = str(THUMBNAILS_DIR)
    
    # Vision & Gemini AI
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
    ROAD_DAMAGE_DETECTOR_URL: str = os.getenv("ROAD_DAMAGE_DETECTOR_URL", "")
    ROAD_DAMAGE_DETECTOR_TOKEN: str = os.getenv("ROAD_DAMAGE_DETECTOR_TOKEN", "")
    
    # Geocoding
    NOMINATIM_USER_AGENT: str = os.getenv("NOMINATIM_USER_AGENT", "CivicPulse-AI-Platform/1.0 (infrastructure-intelligence)")
    NOMINATIM_BASE_URL: str = os.getenv("NOMINATIM_BASE_URL", "https://nominatim.openstreetmap.org")
    
    # Admin Credentials for Seeding
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "admin@civicpulse.ai")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "Admin@CivicPulse2026!")
    ADMIN_NAME: str = os.getenv("ADMIN_NAME", "Chief Operations Officer")
    
    # Risk weights (version 1.0)
    RISK_WEIGHT_SEVERITY: float = 0.35
    RISK_WEIGHT_EXPOSURE: float = 0.25
    RISK_WEIGHT_CRITICALITY: float = 0.20
    RISK_WEIGHT_HAZARD: float = 0.10
    RISK_WEIGHT_TIME_UNRESOLVED: float = 0.10

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()

