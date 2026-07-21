import json
import os
import re
from typing import Optional, Dict, Any

try:
    from backend.config import settings
except ImportError:
    from config import settings

def get_gemini_client():
    api_key = settings.GEMINI_API_KEY
    if not api_key or api_key == "MY_GEMINI_API_KEY" or api_key == "your_gemini_api_key_here":
        return None
    
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        return genai
    except Exception as e:
        print(f"Failed to initialize google.generativeai: {e}")
        try:
            from google import genai
            client = genai.Client(api_key=api_key)
            return client
        except Exception as ex:
            print(f"Failed to initialize google-genai client: {ex}")
            return None

async def parse_resume_with_gemini(raw_text: str) -> Optional[dict]:
    client = get_gemini_client()
    if not client:
        return None
        
    prompt = f"""You are an expert ATS resume extractor. Analyze the following raw text extracted from a candidate resume and convert it into a valid JSON object matching this schema:
{{
  "personalInfo": {{
    "fullName": "Name",
    "email": "Email",
    "phone": "Phone number",
    "location": "City, State or Country",
    "website": "Personal portfolio url if present",
    "github": "Github link if present",
    "linkedin": "Linkedin link if present",
    "summary": "Short 2-3 sentence professional summary",
    "title": "Professional title (e.g., Senior Software Engineer)"
  }},
  "education": [
    {{
      "id": "edu-unique-1",
      "institution": "University/College name",
      "degree": "Degree earned",
      "fieldOfStudy": "Field of study",
      "startDate": "YYYY-MM format",
      "endDate": "YYYY-MM format or Present",
      "grade": "GPA or grade",
      "description": "Details"
    }}
  ],
  "experience": [
    {{
      "id": "exp-unique-1",
      "company": "Company Name",
      "position": "Job Title",
      "location": "Location",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM or Present",
      "current": true/false,
      "description": "Professional accomplishment bullet points"
    }}
  ],
  "projects": [
    {{
      "id": "proj-unique-1",
      "title": "Project Name",
      "role": "Role",
      "technologies": "Comma-separated technologies",
      "link": "Project url",
      "description": "Short details"
    }}
  ],
  "skills": {{
    "technical": ["SKILL1", "SKILL2"],
    "soft": ["Skill1", "Skill2"]
  }},
  "certifications": [
    {{
      "id": "cert-unique-1",
      "name": "Certification Name",
      "issuer": "Issuer",
      "date": "YYYY-MM"
    }}
  ],
  "languages": [
    {{
      "id": "lang-unique-1",
      "name": "Language",
      "proficiency": "Level"
    }}
  ],
  "interests": ["Interest 1"]
}}

Raw Text:
{raw_text[:8000]}

Return ONLY valid JSON and nothing else. No markdown block formatting."""

    try:
        if hasattr(client, 'GenerativeModel'):
            model = client.GenerativeModel('gemini-1.5-flash')
            response = model.generate_content(prompt)
            text_out = response.text
        else:
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt
            )
            text_out = response.text

        clean_json = re.sub(r'```(?:json)?', '', text_out).strip()
        return json.loads(clean_json)
    except Exception as e:
        print(f"Gemini resume parsing failed: {e}")
        return None

async def generate_suggestions_with_gemini(
    resume_data: dict,
    current_score: int,
    job_description: Optional[str] = None
) -> dict:
    client = get_gemini_client()
    
    if client:
        job_desc_str = f"Target Job Description:\n{job_description}" if job_description else ""
        prompt = f"""You are a professional executive resume writer and career coach. Review the candidate's resume and optionally the target Job Description to provide personalized, concise, practical, and recruiter-friendly ATS improvement suggestions.

Rules:
1. NEVER invent or hallucinate new skills, experience, projects, or certifications that are not present in the candidate's resume. Only provide suggestions based strictly on the uploaded resume data.
2. If no issues are found, praise what the user did well and suggest advanced, real-world optimizations.
3. Keep all suggestions practical, concise, and focused on recruiter and ATS preferences.
4. Calculate a realistic "estimatedScore" (between {current_score} and 100) that the candidate can achieve after applying the suggestions. Set "potentialIncrease" to (estimatedScore - {current_score}).

Return a single valid JSON object matching this schema:
{{
  "suggestions": [
    {{
      "priority": "High" | "Medium" | "Low",
      "issueFound": "Specific issue in the resume",
      "whyAffects": "Explain how and why this negatively affects ATS score",
      "howToFix": "Step-by-step practical advice to fix it",
      "exampleImproved": "Concrete improved text using ONLY existing resume info"
    }}
  ],
  "top5Improvements": [
    "Top quick fix 1",
    "Top quick fix 2",
    "Top quick fix 3",
    "Top quick fix 4",
    "Top quick fix 5"
  ],
  "scoreImpact": {{
    "currentScore": {current_score},
    "estimatedScore": estimatedScore,
    "potentialIncrease": potentialIncrease
  }},
  "positiveFeedback": "Detailed feedback on candidate achievements and next steps"
}}

Resume Data:
{json.dumps(resume_data, indent=2)}

{job_desc_str}

Return ONLY valid JSON. No markdown wrappers."""

        try:
            if hasattr(client, 'GenerativeModel'):
                model = client.GenerativeModel('gemini-1.5-flash')
                response = model.generate_content(prompt)
                text_out = response.text
            else:
                response = client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=prompt
                )
                text_out = response.text

            clean_json = re.sub(r'```(?:json)?', '', text_out).strip()
            return json.loads(clean_json)
        except Exception as e:
            print(f"Gemini suggestion generation failed: {e}")

    # Fallback Smart Rule Engine when Gemini API is unconfigured or unavailable
    pi = resume_data.get("personalInfo", {})
    skills = resume_data.get("skills", {})
    experience = resume_data.get("experience", [])
    projects = resume_data.get("projects", [])
    certifications = resume_data.get("certifications", [])

    suggestions = []
    top5 = []

    if not pi.get("phone") or not pi.get("email"):
        suggestions.append({
            "priority": "High",
            "issueFound": "Incomplete contact details",
            "whyAffects": "ATS parsers use contact information to verify applicant identity and matching details.",
            "howToFix": "Add your professional phone number and personal email to the header.",
            "exampleImproved": f"{pi.get('fullName', 'Candidate')} | {pi.get('email', 'email@example.com')} | {pi.get('phone', '(123) 456-7890')}"
        })
        top5.append("Fill in your complete contact details (phone, email).")

    if not pi.get("linkedin") and not pi.get("github"):
        suggestions.append({
            "priority": "Medium",
            "issueFound": "Missing professional networking links",
            "whyAffects": "Recruiters and modern ATS platforms look for GitHub or LinkedIn links to verify portfolio claims.",
            "howToFix": "Include clean URLs to your LinkedIn and GitHub profiles in the header.",
            "exampleImproved": "LinkedIn: linkedin.com/in/username | GitHub: github.com/username"
        })
        top5.append("Add your LinkedIn profile link to the header.")

    if not pi.get("summary") or len(pi.get("summary", "")) < 50:
        suggestions.append({
            "priority": "High",
            "issueFound": "Brief or missing professional summary",
            "whyAffects": "ATS scans the summary section to find primary keywords and match your core technical level.",
            "howToFix": "Write a strong 3-sentence professional summary highlighting your core skills, years of experience, and value.",
            "exampleImproved": "Results-driven developer with proven experience in full-stack architecture, optimizing databases, and deploying robust user interfaces."
        })
        top5.append("Write a highly focused 3-sentence professional summary.")

    tech_count = len(skills.get("technical", []))
    if tech_count < 5:
        suggestions.append({
            "priority": "High",
            "issueFound": "Low technical keyword density",
            "whyAffects": "ATS matching scores are heavily weighted on matching exact technical terms listed in the skills section.",
            "howToFix": "Expand your Technical Skills list with all languages, frameworks, databases, and tools you have used.",
            "exampleImproved": "Technical Skills: HTML5, CSS3, JavaScript, TypeScript, React, Node.js, Git, SQL"
        })
        top5.append("Add at least 5 key technical skills to your Skills list.")

    has_metrics = any(re.search(r'\d+%|\d+\s+percent|\$', exp.get("description", "")) for exp in experience)
    if not has_metrics and experience:
        suggestions.append({
            "priority": "Medium",
            "issueFound": "Non-quantified impact in work accomplishments",
            "whyAffects": "Recruiters and ATS platforms look for quantified metrics to gauge candidate capability.",
            "howToFix": "Add numeric results to your bullet points showing the direct outcome of your efforts.",
            "exampleImproved": "Optimized application runtime speed, increasing database performance by 25% and saving 10+ developer hours weekly."
        })
        top5.append("Quantify at least two bullet points with metrics (%, $, numbers).")

    default_top5 = [
        "Use strong action verbs like 'Architected', 'Optimized', 'Spearheaded'.",
        "Align your skills list with the target job posting keywords.",
        "Quantify your impact on work history with numeric achievements.",
        "Ensure clear, simple formatting without complex tables or images.",
        "Write a compelling, professional executive summary."
    ]
    for d in default_top5:
        if len(top5) < 5 and d not in top5:
            top5.append(d)

    if not suggestions:
        suggestions.append({
            "priority": "Low",
            "issueFound": "None detected! Solid baseline resume structural health.",
            "whyAffects": "Your current format satisfies all standard parsing guidelines perfectly.",
            "howToFix": "Continue focusing on incorporating advanced cloud certificates or publishing open-source projects.",
            "exampleImproved": "Advanced Goal: Contribute to React or Docker open-source modules to highlight deep engineering competency."
        })

    estimated_score = min(100, current_score + 15)
    return {
        "suggestions": suggestions,
        "top5Improvements": top5[:5],
        "scoreImpact": {
            "currentScore": current_score,
            "estimatedScore": estimated_score,
            "potentialIncrease": estimated_score - current_score
        },
        "positiveFeedback": "Your resume follows standard professional guidelines. To make it even stronger, focus on adding advanced enterprise cloud architecture projects, or write high-performance tuning articles."
    }
