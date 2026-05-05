from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field

from app.schemas.analysis import AnalysisResponse


class AnalysisHistoryRecord(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    filename: str
    stored_path: str
    uploaded_at: datetime
    job_description: Optional[str] = None
    analysis: AnalysisResponse
    metadata: dict[str, Any] = Field(default_factory=dict)
