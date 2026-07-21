import io
import re

try:
    import pdfplumber
except ImportError:
    pdfplumber = None

try:
    import docx
except ImportError:
    docx = None

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract full text from PDF buffer using pdfplumber."""
    if not pdfplumber:
        try:
            return file_bytes.decode('utf-8', errors='ignore')
        except Exception:
            return ""
    extracted_pages = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                extracted_pages.append(text)
    return "\n".join(extracted_pages)

def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract full text from DOCX buffer using python-docx."""
    if not docx:
        try:
            return file_bytes.decode('utf-8', errors='ignore')
        except Exception:
            return ""
    doc = docx.Document(io.BytesIO(file_bytes))
    full_text = []
    for para in doc.paragraphs:
        if para.text:
            full_text.append(para.text)
    for table in doc.tables:
        for row in table.rows:
            row_text = [cell.text.strip() for cell in row.cells if cell.text.strip()]
            if row_text:
                full_text.append(" | ".join(row_text))
    return "\n".join(full_text)

def heuristic_parse_resume(text: str) -> dict:
    """Rule-based heuristic parser for resume text fallback."""
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    
    # Extract Email
    email_match = re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', text)
    email = email_match.group(0) if email_match else ""
    
    # Extract Phone
    phone_match = re.search(r'(\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}', text)
    phone = phone_match.group(0) if phone_match else ""
    
    # Extract Links
    github_match = re.search(r'github\.com/[a-zA-Z0-9_-]+', text, re.IGNORECASE)
    github = f"https://{github_match.group(0)}" if github_match else ""
    
    linkedin_match = re.search(r'linkedin\.com/in/[a-zA-Z0-9_-]+', text, re.IGNORECASE)
    linkedin = f"https://{linkedin_match.group(0)}" if linkedin_match else ""
    
    # Estimate Name from top 3 lines
    name = lines[0] if lines else "Candidate Name"
    if email and name == email:
        name = "Candidate Name"
    
    # Extract Technical Skills via common keywords
    tech_keywords = [
        "python", "javascript", "typescript", "react", "node.js", "express",
        "fastapi", "django", "flask", "html", "css", "tailwind", "sql", "mongodb",
        "postgresql", "docker", "kubernetes", "aws", "git", "rest api", "graphql",
        "java", "c++", "c#", "machine learning", "nlp", "pandas", "numpy", "scikit-learn"
    ]
    text_lower = text.lower()
    found_tech = []
    for kw in tech_keywords:
        if re.search(r'\b' + re.escape(kw) + r'\b', text_lower):
            found_tech.append(kw.upper() if len(kw) <= 4 else kw.title())
            
    soft_skills = ["Communication", "Problem Solving", "Team Leadership", "Agile Methodologies"]
    
    return {
        "personalInfo": {
            "fullName": name,
            "email": email,
            "phone": phone,
            "location": "",
            "website": "",
            "github": github,
            "linkedin": linkedin,
            "summary": lines[1] if len(lines) > 1 else "",
            "title": "Software Developer"
        },
        "education": [],
        "experience": [
            {
                "id": "exp-1",
                "company": "Professional Experience",
                "position": "Software Engineer",
                "location": "",
                "startDate": "2021-01",
                "endDate": "Present",
                "current": True,
                "description": text[:500] if len(text) > 500 else text
            }
        ],
        "projects": [],
        "skills": {
            "technical": found_tech if found_tech else ["PYTHON", "JAVASCRIPT", "SQL", "GIT"],
            "soft": soft_skills
        },
        "certifications": [],
        "languages": [{"id": "lang-1", "name": "English", "proficiency": "Fluent"}],
        "interests": []
    }
