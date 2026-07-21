from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from backend.models.resume import ResumeData

class ScoringBreakdown(BaseModel):
    skills: int = 0
    experience: int = 0
    projects: int = 0
    education: int = 0
    certifications: int = 0
    ats: int = 0
    format: int = 0

class MLAnalysis(BaseModel):
    matchScore: int
    atsScore: int
    category: str
    experienceLevel: str
    matchingSkills: List[str] = Field(default_factory=list)
    missingSkills: List[str] = Field(default_factory=list)
    recommendedSkills: List[str] = Field(default_factory=list)
    keywordMatchPercentage: int
    suggestions: List[str] = Field(default_factory=list)
    pros: Optional[List[str]] = Field(default_factory=list)
    cons: Optional[List[str]] = Field(default_factory=list)
    scoringBreakdown: ScoringBreakdown = Field(default_factory=ScoringBreakdown)

class ResumeHistory(BaseModel):
    id: str
    resumeId: str
    userId: str
    timestamp: str
    title: str
    templateId: str
    data: ResumeData
    analysis: Optional[MLAnalysis] = None
