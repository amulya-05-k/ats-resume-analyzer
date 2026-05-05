import logging
import time
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import router as api_router
from app.core.config import settings
from app.core.database import close_mongo_connection, connect_to_mongo

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Resume Analyzer API",
    version="1.0.0",
    description="NLP-powered resume analysis API with ATS scoring and MongoDB history storage",
)

default_cors_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
]

cors_origins = list(dict.fromkeys((settings.cors_origins or []) + default_cors_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Type", "Content-Length"],
)


@app.middleware("http")
async def log_requests(request, call_next):
    start_time = time.perf_counter()
    logger.info("Incoming request: %s %s", request.method, request.url.path)
    try:
        response = await call_next(request)
    except Exception:
        logger.exception("Unhandled request error for %s %s", request.method, request.url.path)
        raise
    duration_ms = (time.perf_counter() - start_time) * 1000
    logger.info(
        "Request complete: %s %s -> %s in %.2fms",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response

app.include_router(api_router, prefix="/api")
app.mount("/uploads", StaticFiles(directory=str(settings.upload_dir)), name="uploads")


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    logger.warning(
        "HTTP exception: %s %s -> %s (%s)",
        request.method,
        request.url.path,
        exc.status_code,
        exc.detail,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": "Request failed",
            "detail": exc.detail,
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    logger.warning("Validation error: %s %s -> %s", request.method, request.url.path, exc.errors())
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "message": "Validation failed",
            "detail": exc.errors(),
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled server error for %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Internal server error",
            "detail": str(exc),
        },
    )


@app.on_event("startup")
async def startup_event() -> None:
    logger.info("Starting Resume Analyzer API on %s:%s", settings.api_host, settings.api_port)
    await connect_to_mongo()


@app.on_event("shutdown")
async def shutdown_event() -> None:
    await close_mongo_connection()


@app.get("/")
async def root() -> dict:
    return {"message": "Resume Analyzer API is running"}
