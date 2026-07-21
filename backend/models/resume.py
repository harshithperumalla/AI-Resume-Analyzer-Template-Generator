from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict

class PersonalInfo(BaseModel):
    fullName: str = ""
    email: str = ""
    phone: str = ""
    location: str = ""
    website: str = ""
    github: str = ""
    linkedin: str = ""
    summary: str = ""
    title: str = ""

class EducationItem(BaseModel):
    id: str
    institution: str = ""
    degree: str = ""
    fieldOfStudy: str = ""
    startDate: str = ""
    endDate: str = ""
    grade: Optional[str] = ""
    description: Optional[str] = ""

class ExperienceItem(BaseModel):
    id: str
    company: str = ""
    position: str = ""
    location: str = ""
    startDate: str = ""
    endDate: str = ""
    current: bool = False
    description: str = ""

class ProjectItem(BaseModel):
    id: str
    title: str = ""
    role: str = ""
    technologies: str = ""
    link: Optional[str] = ""
    description: str = ""

class SkillsData(BaseModel):
    technical: List[str] = Field(default_factory=list)
    soft: List[str] = Field(default_factory=list)

class CertificationItem(BaseModel):
    id: str
    name: str = ""
    issuer: str = ""
    date: str = ""
    link: Optional[str] = ""

class LanguageItem(BaseModel):
    id: str
    name: str = ""
    proficiency: str = ""

class ResumeData(BaseModel):
    personalInfo: PersonalInfo = Field(default_factory=PersonalInfo)
    education: List[EducationItem] = Field(default_factory=list)
    experience: List[ExperienceItem] = Field(default_factory=list)
    projects: List[ProjectItem] = Field(default_factory=list)
    skills: SkillsData = Field(default_factory=SkillsData)
    certifications: List[CertificationItem] = Field(default_factory=list)
    languages: List[LanguageItem] = Field(default_factory=list)
    interests: List[str] = Field(default_factory=list)

class ResumeCustomization(BaseModel):
    fontFamily: str = "sans"
    fontSize: str = "base"
    colorTheme: str = "#1e293b"
    margins: str = "normal"
    lineSpacing: str = "normal"
    showIcons: bool = True
    sectionOrder: List[str] = Field(
        default_factory=lambda: [
            "personalInfo", "experience", "projects", "education", "skills", "certifications", "languages"
        ]
    )

class ResumeCreate(BaseModel):
    title: Optional[str] = "Untitled Resume"
    templateId: Optional[str] = "template-classic"
    customization: Optional[ResumeCustomization] = None
    data: Optional[ResumeData] = None

class ResumeUpdate(BaseModel):
    title: Optional[str] = None
    templateId: Optional[str] = None
    customization: Optional[ResumeCustomization] = None
    data: Optional[ResumeData] = None

class ResumeModel(BaseModel):
    id: str
    userId: str
    title: str
    templateId: str
    customization: ResumeCustomization
    data: ResumeData
    createdAt: str
    updatedAt: str
    atsScore: Optional[int] = None
    scoreType: Optional[str] = None

class ParseResumeRequest(BaseModel):
    fileData: str  # Base64 string
    fileName: str
    fileType: Optional[str] = None
