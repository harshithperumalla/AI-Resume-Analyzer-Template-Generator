import base64
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, status

try:
    from backend.models.resume import (
        ResumeModel, ResumeCreate, ResumeUpdate, ParseResumeRequest, ResumeData, ResumeCustomization
    )
    from backend.models.job import AnalyzeJobRequest, SuggestRequest
    from backend.auth import get_current_user_id, generate_id
    from backend.database import (
        get_resumes, get_resume_by_id, save_resume, delete_resume,
        get_history, save_history, save_job
    )
    from backend.nlp.parser import (
        extract_text_from_pdf, extract_text_from_docx, heuristic_parse_resume
    )
    from backend.nlp.ats import analyze_resume_ats
    from backend.nlp.gemini import (
        parse_resume_with_gemini, generate_suggestions_with_gemini
    )
except ImportError:
    from models.resume import (
        ResumeModel, ResumeCreate, ResumeUpdate, ParseResumeRequest, ResumeData, ResumeCustomization
    )
    from models.job import AnalyzeJobRequest, SuggestRequest
    from auth import get_current_user_id, generate_id
    from database import (
        get_resumes, get_resume_by_id, save_resume, delete_resume,
        get_history, save_history, save_job
    )
    from nlp.parser import (
        extract_text_from_pdf, extract_text_from_docx, heuristic_parse_resume
    )
    from nlp.ats import analyze_resume_ats
    from nlp.gemini import (
        parse_resume_with_gemini, generate_suggestions_with_gemini
    )

router = APIRouter(prefix="/api/resumes", tags=["Resumes"])

STANDARD_BASELINE_JOB = (
    "Looking for a Software Engineer / Developer skilled in JavaScript, React, Node.js, Python, SQL, REST APIs, "
    "system architecture, databases, version control, unit testing, microservices, and problem solving."
)

def extract_all_text_from_resume_dict(data: dict) -> str:
    if not data:
        return ""
    pi = data.get("personalInfo", {})
    skills = data.get("skills", {})
    exp = data.get("experience", [])
    proj = data.get("projects", [])
    edu = data.get("education", [])
    cert = data.get("certifications", [])

    text_parts = [
        pi.get("fullName", ""),
        pi.get("title", ""),
        pi.get("summary", ""),
        " ".join(skills.get("technical", []) if isinstance(skills.get("technical"), list) else []),
        " ".join(skills.get("soft", []) if isinstance(skills.get("soft"), list) else []),
        " ".join(f"{e.get('position','')} {e.get('company','')} {e.get('description','')}" for e in exp if isinstance(e, dict)),
        " ".join(f"{p.get('title','')} {p.get('role','')} {p.get('technologies','')} {p.get('description','')}" for p in proj if isinstance(p, dict)),
        " ".join(f"{e.get('degree','')} in {e.get('fieldOfStudy','')} at {e.get('institution','')}" for e in edu if isinstance(e, dict)),
        " ".join(c.get("name", "") for c in cert if isinstance(c, dict))
    ]
    return "\n".join(text_parts)

async def enrich_resume_with_score(resume: dict) -> dict:
    history = await get_history(resume["id"])
    latest_analysis = next((h for h in history if h.get("analysis") and h["analysis"].get("atsScore") is not None), None)
    
    if latest_analysis and latest_analysis.get("analysis"):
        analysis = latest_analysis["analysis"]
        score = int(analysis["atsScore"])
        score_type = "ats"
    elif resume.get("lastAnalysis"):
        analysis = resume["lastAnalysis"]
        score = int(analysis["atsScore"])
        score_type = "ats"
    else:
        resume_text = extract_all_text_from_resume_dict(resume.get("data", {}))
        analysis = analyze_resume_ats(resume_text, STANDARD_BASELINE_JOB)
        score = int(analysis["atsScore"])
        score_type = "ats"
        
    res_copy = dict(resume)
    res_copy["atsScore"] = score
    res_copy["scoreType"] = score_type
    res_copy["analysis"] = analysis
    return res_copy

@router.get("", response_model=List[dict])
async def list_resumes(user_id: str = Depends(get_current_user_id)):
    resumes = await get_resumes(user_id)
    enriched = [await enrich_resume_with_score(r) for r in resumes]
    return enriched

@router.post("/parse")
async def parse_resume(body: ParseResumeRequest):
    if not body.fileData or not body.fileName:
        raise HTTPException(
            status_code=400,
            detail="File data (Base64) and file name are required."
        )
    
    try:
        file_bytes = base64.b64decode(body.fileData)
        fn_lower = body.fileName.lower()
        
        if fn_lower.endswith(".pdf"):
            extracted_text = extract_text_from_pdf(file_bytes)
        elif fn_lower.endswith(".docx"):
            extracted_text = extract_text_from_docx(file_bytes)
        else:
            raise HTTPException(
                status_code=400,
                detail="Unsupported file format. Please upload a PDF or DOCX file."
            )
            
        if not extracted_text or len(extracted_text.strip()) == 0:
            raise HTTPException(
                status_code=400,
                detail="No readable text could be extracted from this document."
            )

        # Try Gemini AI enhancement first
        ai_parsed = await parse_resume_with_gemini(extracted_text)
        if ai_parsed:
            return {
                "rawText": extracted_text,
                "parsedData": ai_parsed
            }

        # Fallback to local heuristic parser
        parsed_data = heuristic_parse_resume(extracted_text)
        return {
            "rawText": extracted_text,
            "parsedData": parsed_data
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server parsing error: {str(e)}")

@router.get("/{id}", response_model=dict)
async def get_single_resume(id: str, user_id: str = Depends(get_current_user_id)):
    resume = await get_resume_by_id(id)
    if not resume or resume.get("userId") != user_id:
        raise HTTPException(status_code=404, detail="Resume not found.")
    return await enrich_resume_with_score(resume)

@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_resume(body: ResumeCreate, user_id: str = Depends(get_current_user_id)):
    default_customization = {
        "fontFamily": "sans",
        "fontSize": "base",
        "colorTheme": "#1e293b",
        "margins": "normal",
        "lineSpacing": "normal",
        "showIcons": True,
        "sectionOrder": ["personalInfo", "experience", "projects", "education", "skills", "certifications", "languages"]
    }
    
    default_data = {
        "personalInfo": {"fullName": "Your Name", "email": "your.email@example.com", "phone": "", "location": "", "website": "", "github": "", "linkedin": "", "summary": "", "title": ""},
        "education": [],
        "experience": [],
        "projects": [],
        "skills": {"technical": [], "soft": []},
        "certifications": [],
        "languages": [],
        "interests": []
    }

    resume_id = f"res-{generate_id()}"
    resume_data = body.data.dict() if body.data else default_data
    
    # Calculate dynamic baseline ATS analysis for the newly created resume
    text_content = extract_all_text_from_resume_dict(resume_data)
    initial_analysis = analyze_resume_ats(text_content, STANDARD_BASELINE_JOB)

    new_resume = {
        "id": resume_id,
        "userId": user_id,
        "title": body.title or "Untitled Resume",
        "templateId": body.templateId or "template-classic",
        "customization": body.customization.dict() if body.customization else default_customization,
        "data": resume_data,
        "atsScore": initial_analysis["atsScore"],
        "lastAnalysis": initial_analysis,
        "createdAt": datetime.utcnow().isoformat(),
        "updatedAt": datetime.utcnow().isoformat()
    }

    await save_resume(new_resume)
    return await enrich_resume_with_score(new_resume)

@router.put("/{id}", response_model=dict)
async def update_resume(id: str, body: ResumeUpdate, user_id: str = Depends(get_current_user_id)):
    resume = await get_resume_by_id(id)
    if not resume or resume.get("userId") != user_id:
        raise HTTPException(status_code=404, detail="Resume not found.")

    # Save previous version to history
    history_entry = {
        "id": f"his-{generate_id()}",
        "resumeId": resume["id"],
        "userId": resume["userId"],
        "timestamp": datetime.utcnow().isoformat(),
        "title": resume["title"],
        "templateId": resume["templateId"],
        "data": resume["data"]
    }
    await save_history(history_entry)

    # Update resume fields
    if body.title is not None: resume["title"] = body.title
    if body.templateId is not None: resume["templateId"] = body.templateId
    if body.customization is not None: resume["customization"] = body.customization.dict()
    if body.data is not None: resume["data"] = body.data.dict()
    resume["updatedAt"] = datetime.utcnow().isoformat()

    await save_resume(resume)
    return await enrich_resume_with_score(resume)

@router.delete("/{id}")
async def remove_resume(id: str, user_id: str = Depends(get_current_user_id)):
    resume = await get_resume_by_id(id)
    if not resume or resume.get("userId") != user_id:
        raise HTTPException(status_code=404, detail="Resume not found.")
    await delete_resume(id)
    return {"success": True, "message": "Resume and history deleted."}

@router.get("/{id}/history", response_model=List[dict])
async def list_resume_history(id: str, user_id: str = Depends(get_current_user_id)):
    resume = await get_resume_by_id(id)
    if not resume or resume.get("userId") != user_id:
        raise HTTPException(status_code=404, detail="Resume not found.")
    return await get_history(id)

@router.post("/{id}/restore", response_model=dict)
async def restore_resume_history(id: str, body: dict, user_id: str = Depends(get_current_user_id)):
    history_id = body.get("historyId")
    resume = await get_resume_by_id(id)
    if not resume or resume.get("userId") != user_id:
        raise HTTPException(status_code=404, detail="Resume not found.")

    history_list = await get_history(id)
    selected_version = next((h for h in history_list if h["id"] == history_id), None)
    if not selected_version:
        raise HTTPException(status_code=404, detail="History version not found.")

    resume["data"] = selected_version["data"]
    resume["title"] = selected_version["title"]
    resume["templateId"] = selected_version["templateId"]
    resume["updatedAt"] = datetime.utcnow().isoformat()

    await save_resume(resume)
    return await enrich_resume_with_score(resume)

@router.post("/{id}/analyze")
async def analyze_resume(id: str, body: AnalyzeJobRequest, user_id: str = Depends(get_current_user_id)):
    if not body.jobDescription:
        raise HTTPException(status_code=400, detail="Job description text is required for comparison.")

    resume = await get_resume_by_id(id)
    if not resume or resume.get("userId") != user_id:
        raise HTTPException(status_code=404, detail="Resume not found.")

    data = resume.get("data", {})
    pi = data.get("personalInfo", {})
    skills = data.get("skills", {})
    exp = data.get("experience", [])
    proj = data.get("projects", [])
    edu = data.get("education", [])
    cert = data.get("certifications", [])

    text_parts = [
        pi.get("fullName", ""),
        pi.get("title", ""),
        pi.get("summary", ""),
        " ".join(skills.get("technical", [])),
        " ".join(skills.get("soft", [])),
        " ".join(f"{e.get('position','')} {e.get('company','')} {e.get('description','')}" for e in exp),
        " ".join(f"{p.get('title','')} {p.get('role','')} {p.get('technologies','')} {p.get('description','')}" for p in proj),
        " ".join(f"{e.get('degree','')} in {e.get('fieldOfStudy','')} at {e.get('institution','')}" for e in edu),
        " ".join(c.get("name", "") for c in cert)
    ]
    flattened_resume_text = "\n".join(text_parts)

    ml_analysis = analyze_resume_ats(flattened_resume_text, body.jobDescription)

    job_title = body.jobTitle if body.jobTitle else "Analyzed Target Role"

    job_entry = {
        "id": f"job-{generate_id()}",
        "userId": user_id,
        "title": job_title,
        "company": "Target Company",
        "descriptionText": body.jobDescription,
        "createdAt": datetime.utcnow().isoformat()
    }
    await save_job(job_entry)

    history_entry = {
        "id": f"his-{generate_id()}",
        "resumeId": resume["id"],
        "userId": user_id,
        "timestamp": datetime.utcnow().isoformat(),
        "title": resume["title"],
        "templateId": resume["templateId"],
        "data": resume["data"],
        "analysis": ml_analysis,
        "jobTitle": job_title
    }
    await save_history(history_entry)

    resume["updatedAt"] = datetime.utcnow().isoformat()
    await save_resume(resume)

    return {
        "analysis": ml_analysis,
        "historyId": history_entry["id"]
    }

@router.post("/{id}/suggest")
async def suggest_resume_improvements(id: str, body: SuggestRequest = SuggestRequest(), user_id: str = Depends(get_current_user_id)):
    job_description = body.jobDescription
    resume = await get_resume_by_id(id)
    if not resume or resume.get("userId") != user_id:
        raise HTTPException(status_code=404, detail="Resume not found.")

    data = resume.get("data", {}) or {}
    current_score = int(resume.get("atsScore", 60))
    
    if job_description:
        pi = data.get("personalInfo", {})
        skills = data.get("skills", {})
        exp = data.get("experience", [])
        proj = data.get("projects", [])
        edu = data.get("education", [])
        cert = data.get("certifications", [])

        text_parts = [
            pi.get("fullName", ""),
            pi.get("title", ""),
            pi.get("summary", ""),
            " ".join(skills.get("technical", [])),
            " ".join(skills.get("soft", [])),
            " ".join(f"{e.get('position','')} {e.get('company','')} {e.get('description','')}" for e in exp),
            " ".join(f"{p.get('title','')} {p.get('role','')} {p.get('technologies','')} {p.get('description','')}" for p in proj),
            " ".join(f"{e.get('degree','')} in {e.get('fieldOfStudy','')} at {e.get('institution','')}" for e in edu),
            " ".join(c.get("name", "") for c in cert)
        ]
        flattened_text = "\n".join(text_parts)
        local_analysis = analyze_resume_ats(flattened_text, job_description)
        current_score = int(local_analysis.get("atsScore", current_score))

    suggestions_res = await generate_suggestions_with_gemini(data, current_score, job_description)
    return suggestions_res
