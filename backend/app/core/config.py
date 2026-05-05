from pathlib import Path
import os


class Settings:
    def __init__(self) -> None:
        base_dir = Path(__file__).resolve().parents[2]
        self.project_root = base_dir.parent
        self.upload_dir = self.project_root / "backend" / "uploads"
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
        self.mongo_db_name = os.getenv("MONGODB_DB", "resume_analyzer")
        self.mongo_timeout_ms = int(os.getenv("MONGODB_TIMEOUT_MS", "5000"))
        self.api_host = os.getenv("API_HOST", "0.0.0.0")
        self.api_port = int(os.getenv("API_PORT", "8000"))
        self.max_upload_mb = int(os.getenv("MAX_UPLOAD_MB", "15"))
        origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://localhost:5175,http://127.0.0.1:5173,http://127.0.0.1:3000,http://127.0.0.1:5175")
        self.cors_origins = [origin.strip() for origin in origins.split(",") if origin.strip()]


settings = Settings()
