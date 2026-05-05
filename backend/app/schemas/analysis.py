from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, ConfigDict


class EntityItem(BaseModel):
    text: str
    label: str


class QualityCheckItem(BaseModel):
    name: str
    passed: bool
    detail: str


class AnalysisResponse(BaseModel):
    model_config = ConfigDict(json_encoders={datetime: lambda v: v.isoformat()})

    structured_extraction: Dict[str, Any] = Field(default_factory=dict)
    resume_text_preview: str
    extracted_text: str = ""
    ats_score: int
    semantic_match_percentage: float
    technical_match_percentage: float = 0.0
    experience_relevance_percentage: float = 0.0
    education_relevance_percentage: float = 0.0
    matched_skills: List[str] = Field(default_factory=list)
    missing_skills: List[str] = Field(default_factory=list)
    soft_skills: List[str] = Field(default_factory=list)
    education_keywords: List[str] = Field(default_factory=list)
    experience_keywords: List[str] = Field(default_factory=list)
    skill_frequency: Dict[str, int] = Field(default_factory=dict)
    missing_keywords: List[str] = Field(default_factory=list)
    suggestions: List[str] = Field(default_factory=list)
    resume_strengths: List[str] = Field(default_factory=list)
    keyword_coverage: float
    keyword_density: float = 0.0
    technical_skill_score: float
    structure_score: float
    impact_score: float
    contact_score: float
    job_description_keywords: List[str] = Field(default_factory=list)
    job_description_analysis: Dict[str, Any] = Field(default_factory=dict)
    extracted_entities: List[EntityItem] = Field(default_factory=list)
    skills_by_category: Dict[str, List[str]] = Field(default_factory=dict)
    identified_sections: List[str] = Field(default_factory=list)
    missing_sections: List[str] = Field(default_factory=list)
    section_content: Dict[str, str] = Field(default_factory=dict)
    action_verb_analysis: Dict[str, Any] = Field(default_factory=dict)
    quality_checks: List[QualityCheckItem] = Field(default_factory=list)
    nlp_insights: Dict[str, Any] = Field(default_factory=dict)
    total_words: int


class HistoryItem(BaseModel):
    model_config = ConfigDict(json_encoders={datetime: lambda v: v.isoformat()})

    id: str
    filename: str
    uploaded_at: datetime
    job_description: Optional[str] = None
    analysis: AnalysisResponse


class AnalyzeResumeResponse(BaseModel):
    success: bool = True
    message: str
    data: AnalysisResponse
