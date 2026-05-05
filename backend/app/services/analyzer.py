from typing import Any, Dict

from app.services.nlp.processor import analyze_resume_nlp


def analyze_resume(resume_text: str, job_description: str | None = None) -> Dict[str, Any]:
    return analyze_resume_nlp(resume_text, job_description)
