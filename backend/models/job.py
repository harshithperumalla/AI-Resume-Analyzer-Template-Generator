from pydantic import BaseModel
from typing import Optional

class JobDescription(BaseModel):
    id: str
    userId: str
    title: str
    company: str
    descriptionText: str
    createdAt: str

class AnalyzeJobRequest(BaseModel):
    jobDescription: str
    jobTitle: Optional[str] = "Target Role"

class SuggestRequest(BaseModel):
    jobDescription: Optional[str] = None
