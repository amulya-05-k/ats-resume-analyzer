import asyncio
import logging
from datetime import datetime, timezone
from pathlib import Path

from bson import ObjectId
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.core.config import settings
from app.core.database import get_database_or_none, is_mongo_connected
from app.schemas.analysis import AnalysisResponse, AnalyzeResumeResponse, HistoryItem
from app.services.analyzer import analyze_resume
from app.utils.file_parser import save_and_extract_text

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Resume Analysis"])


def _default_analysis_payload() -> dict:
    return {
        "resume_text_preview": "",
        "extracted_text": "",
        "ats_score": 0,
        "semantic_match_percentage": 0.0,
        "technical_match_percentage": 0.0,
        "experience_relevance_percentage": 0.0,
        "education_relevance_percentage": 0.0,
        "matched_skills": [],
        "missing_skills": [],
        "soft_skills": [],
        "education_keywords": [],
        "experience_keywords": [],
        "skill_frequency": {},
        "missing_keywords": [],
        "suggestions": [],
        "resume_strengths": [],
        "keyword_coverage": 0.0,
        "keyword_density": 0.0,
        "technical_skill_score": 0.0,
        "structure_score": 0.0,
        "impact_score": 0.0,
        "contact_score": 0.0,
        "job_description_keywords": [],
        "job_description_analysis": {},
        "extracted_entities": [],
        "skills_by_category": {},
        "identified_sections": [],
        "missing_sections": [],
        "section_content": {},
        "action_verb_analysis": {},
        "quality_checks": [],
        "nlp_insights": {},
        "total_words": 0,
    }


def _serialize_history(document: dict) -> HistoryItem:
    analysis_data = document.get("analysis", {})
    if isinstance(analysis_data, dict):
        merged_analysis = _default_analysis_payload()
        merged_analysis.update(analysis_data)
        analysis = AnalysisResponse(**merged_analysis)
    else:
        analysis = analysis_data
    return HistoryItem(
        id=str(document["_id"]),
        filename=document.get("filename", "resume"),
        uploaded_at=document.get("uploaded_at"),
        job_description=document.get("job_description"),
        analysis=analysis,
    )


@router.get("/health")
async def health_check() -> dict:
    return {
        "status": "ok",
        "mongo_connected": is_mongo_connected(),
        "api_host": settings.api_host,
        "api_port": settings.api_port,
    }


@router.post("/analyze", response_model=AnalyzeResumeResponse)
async def analyze_resume_file(
    resume: UploadFile | None = File(default=None),
    file: UploadFile | None = File(default=None),
    job_description: str = Form(""),
    database=Depends(get_database_or_none),
) -> AnalyzeResumeResponse:
    try:
        upload = resume or file
        if upload is None:
            raise HTTPException(status_code=400, detail="A resume file is required")

        logger.info(
            "Upload received: filename=%s content_type=%s job_description_length=%s",
            upload.filename,
            upload.content_type,
            len(job_description or ""),
        )

        file_path, resume_text = await save_and_extract_text(upload, settings.upload_dir)
        if not resume_text:
            logger.warning("No text extracted from %s", upload.filename)
            raise HTTPException(status_code=400, detail="Could not extract text from the uploaded file")

        logger.info("Extracted %s characters from resume text", len(resume_text))
        logger.info("Starting NLP analysis for %s", upload.filename)
        analysis_dict = await asyncio.to_thread(analyze_resume, resume_text, job_description)
        analysis_response = AnalysisResponse(**analysis_dict)
        document = {
            "filename": upload.filename or Path(file_path).name,
            "stored_path": str(file_path),
            "uploaded_at": datetime.now(timezone.utc),
            "job_description": job_description or None,
            "extracted_text": resume_text,
            "analysis": analysis_response.model_dump(),
        }

        if database is not None:
            try:
                result = await database.analysis_history.insert_one(document)
                document["_id"] = result.inserted_id
                logger.info("MongoDB save successful for %s", upload.filename)
            except Exception as save_error:
                logger.warning("MongoDB save failed for %s: %s", upload.filename, save_error)
        else:
            logger.warning("MongoDB is unavailable; skipping history save for %s", upload.filename)

        logger.info("Analysis complete for %s, ATS score: %s", upload.filename, analysis_response.ats_score)
        return AnalyzeResumeResponse(
            success=True,
            message="Resume analyzed successfully",
            data=analysis_response,
        )
    except HTTPException as http_error:
        logger.warning(
            "Upload rejected: filename=%s status=%s detail=%s",
            (resume or file).filename if (resume or file) else None,
            http_error.status_code,
            http_error.detail,
        )
        raise
    except Exception as e:
        logger.exception(
            "Error analyzing resume: filename=%s content_type=%s error=%s",
            (resume or file).filename if (resume or file) else None,
            (resume or file).content_type if (resume or file) else None,
            str(e),
        )
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.get("/history", response_model=list[HistoryItem])
async def get_history(database=Depends(get_database_or_none)) -> list[dict]:
    if database is None:
        logger.warning("MongoDB unavailable; returning empty history list")
        return []
    documents = await database.analysis_history.find().sort("uploaded_at", -1).to_list(length=50)
    return [_serialize_history(document) for document in documents]


@router.get("/history/{item_id}", response_model=HistoryItem)
async def get_history_item(item_id: str, database=Depends(get_database_or_none)) -> dict:
    if database is None:
        raise HTTPException(status_code=503, detail="MongoDB history is currently unavailable")
    if not ObjectId.is_valid(item_id):
        raise HTTPException(status_code=400, detail="Invalid history id")
    document = await database.analysis_history.find_one({"_id": ObjectId(item_id)})
    if document is None:
        raise HTTPException(status_code=404, detail="History item not found")
    return _serialize_history(document)
