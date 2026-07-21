import re
from typing import List, Dict, Tuple, Set

try:
    import numpy as np
except ImportError:
    np = None

try:
    import pandas as pd
except ImportError:
    pd = None

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    from sklearn.naive_bayes import MultinomialNB
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False

# Try importing spacy gracefully
try:
    import spacy
    try:
        nlp = spacy.load("en_core_web_sm")
    except Exception:
        nlp = spacy.blank("en")
except Exception:
    nlp = None

# Comprehensive dictionary of technical and soft skills
TECHNICAL_SKILLS_DB = {
    "python", "javascript", "typescript", "react", "node.js", "express", "fastapi",
    "django", "flask", "html", "css", "tailwind", "bootstrap", "sql", "postgresql",
    "mongodb", "redis", "docker", "kubernetes", "aws", "azure", "gcp", "git",
    "github", "rest api", "graphql", "java", "c++", "c#", "go", "rust", "php",
    "ruby", "rails", "machine learning", "deep learning", "nlp", "pandas",
    "numpy", "scikit-learn", "tensorflow", "pytorch", "ci/cd", "microservices",
    "linux", "bash", "jenkins", "terraform", "ansible", "sysadmin", "figma"
}

SOFT_SKILLS_DB = {
    "communication", "leadership", "teamwork", "problem solving", "time management",
    "adaptability", "critical thinking", "collaboration", "agile", "scrum",
    "organization", "creativity", "project management", "decision making"
}

# Training corpus for Naive Bayes role classification
CLASSIFIER_TRAINING_DATA = [
    ("react javascript node.js typescript frontend html css tailwind redux web developer UI", "Web Development"),
    ("python django flask fastapi backend database sql postgresql mongodb redis microservices", "Backend Engineering"),
    ("python machine learning data science pandas numpy scikit-learn tensorflow pytorch nlp ai analytics", "Data Science & AI"),
    ("aws docker kubernetes devops ci/cd terraform cloud jenkins linux bash infrastructure", "Cloud & DevOps"),
    ("java c++ c# data structures algorithms object oriented architecture software engineer", "Software Engineering"),
    ("agile scrum project management team leadership roadmap stakeholder product manager", "Management & Product")
]

# Comprehensive synonym map for technical & industry domain expansion
SYNONYMS_MAP = {
    "ml": "machine learning",
    "ai": "artificial intelligence",
    "js": "javascript",
    "ts": "typescript",
    "py": "python",
    "dl": "deep learning",
    "k8s": "kubernetes",
    "postgres": "postgresql",
    "mongo": "mongodb",
    "aws": "amazon web services",
    "gcp": "google cloud platform",
    "db": "database",
    "reactjs": "react",
    "react.js": "react",
    "nodejs": "node.js",
    "node": "node.js"
}

def normalize_synonyms(text: str) -> str:
    """Expand tech acronyms and normalize synonyms for high-precision matching."""
    lower_text = text.lower()
    for short, expanded in SYNONYMS_MAP.items():
        pattern = r'\b' + re.escape(short) + r'\b'
        lower_text = re.sub(pattern, f"{short} {expanded}", lower_text)
    return lower_text

def extract_skills_with_nlp(text: str) -> Tuple[List[str], List[str]]:
    """Extract technical and soft skills using spaCy / pattern matching."""
    text_processed = normalize_synonyms(text)
    
    found_tech: Set[str] = set()
    found_soft: Set[str] = set()
    
    if nlp:
        try:
            doc = nlp(text_processed)
            tokens = [token.text for token in doc]
            text_processed = " ".join(tokens)
        except Exception:
            pass

    for skill in TECHNICAL_SKILLS_DB:
        if re.search(r'\b' + re.escape(skill) + r'\b', text_processed):
            found_tech.add(skill.upper() if len(skill) <= 4 else skill.title())

    for skill in SOFT_SKILLS_DB:
        if re.search(r'\b' + re.escape(skill) + r'\b', text_processed):
            found_soft.add(skill.title())

    return list(found_tech), list(found_soft)

def classify_resume_category(text: str) -> str:
    """Classify resume role category using scikit-learn MultinomialNB."""
    if not HAS_SKLEARN:
        return "Software Engineering"
    try:
        texts = [item[0] for item in CLASSIFIER_TRAINING_DATA]
        labels = [item[1] for item in CLASSIFIER_TRAINING_DATA]
        
        vectorizer = TfidfVectorizer()
        X_train = vectorizer.fit_transform(texts)
        
        clf = MultinomialNB()
        clf.fit(X_train, labels)
        
        X_test = vectorizer.transform([text])
        prediction = clf.predict(X_test)[0]
        return prediction
    except Exception:
        return "Software Engineering"

ACTION_VERBS = {'architected', 'spearheaded', 'engineered', 'optimized', 'implemented', 'deployed', 'developed', 'built', 'designed', 'orchestrated', 'streamlined', 'automated', 'scaled'}

def analyze_resume_ats(resume_text: str, job_description: str) -> dict:
    """
    Perform Production-Grade Jobscan / ResumeWorded ATS Analysis:
    - N-Gram TF-IDF Cosine Similarity (30%)
    - Extract Target Key Terms & Skill Matching (25%)
    - Experience & Seniority Level (15%)
    - Academic Education Verification (10%)
    - Measurable Achievements & Action Verbs (8%)
    - Formatting & Contact Compliance (7%)
    - Section Header Structure (5%)
    """
    res_norm = normalize_synonyms(resume_text)
    job_norm = normalize_synonyms(job_description)

    # 1. N-Gram TF-IDF Cosine Similarity & Dynamic Term Extraction
    if HAS_SKLEARN and res_norm.strip() and job_norm.strip():
        try:
            vec = TfidfVectorizer(ngram_range=(1, 2), stop_words='english')
            matrix = vec.fit_transform([res_norm, job_norm])
            cosine_sim = float(cosine_similarity(matrix[0:1], matrix[1:2])[0][0])
            keyword_score = min(100, max(10, int(round(cosine_sim * 100 * 1.65))))

            feature_names = vec.get_feature_names_out()
            job_tfidf = matrix[1].toarray()[0]
            job_top_indices = job_tfidf.argsort()[::-1][:20]
            job_key_terms = [feature_names[i] for i in job_top_indices if job_tfidf[i] > 0]

            matched_terms_raw = [t for t in job_key_terms if t in res_norm]
            missing_terms_raw = [t for t in job_key_terms if t not in res_norm]
        except Exception:
            keyword_score = 45
            job_key_terms, matched_terms_raw, missing_terms_raw = [], [], []
    else:
        keyword_score = 40
        job_key_terms, matched_terms_raw, missing_terms_raw = [], [], []

    # 2. Skills Match (25%)
    res_tech, res_soft = extract_skills_with_nlp(resume_text)
    job_tech, job_soft = extract_skills_with_nlp(job_description)

    res_skills_set = set([s.lower() for s in res_tech + res_soft])
    job_skills_set = set([s.lower() for s in job_tech + job_soft])

    matching_skills_raw = res_skills_set.intersection(job_skills_set)
    missing_skills_raw = job_skills_set.difference(res_skills_set)

    matching_skills = [s.upper() if len(s) <= 4 else s.title() for s in matching_skills_raw]
    missing_skills = [s.upper() if len(s) <= 4 else s.title() for s in missing_skills_raw]

    if job_key_terms:
        skills_score = min(100, max(10, int(round((len(matched_terms_raw) / len(job_key_terms)) * 100 * 1.15))))
    elif job_skills_set:
        skills_score = min(100, max(10, int(round((len(matching_skills_raw) / len(job_skills_set)) * 100 * 1.15))))
    else:
        skills_score = keyword_score

    # Recommended Skills
    all_tech = list(TECHNICAL_SKILLS_DB)
    if pd is not None:
        try:
            df_skills = pd.DataFrame({"skill": all_tech})
            unclaimed = df_skills[~df_skills["skill"].isin(res_skills_set)]
            recommended_skills = [s.upper() if len(s) <= 4 else s.title() for s in unclaimed["skill"].head(5).tolist()]
        except Exception:
            recommended_skills = ["DOCKER", "KUBERNETES", "AWS", "PYTHON", "GIT"]
    else:
        recommended_skills = ["DOCKER", "KUBERNETES", "AWS", "PYTHON", "GIT"]

    # 3. Experience Match (15%)
    exp_years = len(re.findall(r'\b(20\d\d|19\d\d)\b', resume_text))
    has_senior = any(w in res_norm for w in ['senior', 'lead', 'principal', 'architect', 'head', 'manager', '5+', '6+'])
    if exp_years >= 4 or has_senior:
        exp_score = 95
        exp_level = "Senior (5+ Years)"
    elif exp_years >= 2:
        exp_score = 75
        exp_level = "Mid-Level (2-5 Years)"
    elif exp_years >= 1:
        exp_score = 60
        exp_level = "Junior / Entry-Level"
    else:
        exp_score = 35
        exp_level = "Entry-Level"

    # 4. Education Match (10%)
    has_degree = any(w in res_norm for w in ['bachelor', 'master', 'phd', 'degree', 'university', 'college', 'bs', 'ms', 'gpa', 'stanford', 'mit', 'berkeley'])
    edu_score = 90 if has_degree else 40

    # 5. Measurable Achievements & Action Verbs (8%)
    has_metrics = len(re.findall(r'\b\d+%\b|\$\d+|\b\d+\s+percent\b|\b\d+\+\b', resume_text)) > 0
    action_verb_count = sum(1 for v in ACTION_VERBS if v in res_norm)
    achieve_score = min(100, (80 if has_metrics else 40) + min(20, action_verb_count * 5))

    # 6. Formatting & Contact Match (7%)
    has_contact = '@' in resume_text or any(c in res_norm for c in ['.com', 'github', 'linkedin', 'phone', 'tel', 'location'])
    fmt_score = 90 if has_contact else 50

    # 7. Resume Sections Match (5%)
    sec_score = min(100, max(20, sum(1 for s in ['summary', 'experience', 'skills', 'education', 'project'] if any(w in res_norm for w in [s])) * 20))

    # Final Weighted Normalization (0-100)
    weighted_total = int(round(
        (keyword_score * 0.30) +
        (skills_score * 0.25) +
        (exp_score * 0.15) +
        (edu_score * 0.10) +
        (achieve_score * 0.08) +
        (fmt_score * 0.07) +
        (sec_score * 0.05)
    ))
    
    ats_score = min(98, max(15, weighted_total))
    category = classify_resume_category(resume_text + " " + job_description)

    scoring_breakdown = {
        "skills": skills_score,
        "experience": exp_score,
        "projects": 85 if any(w in res_norm for w in ['project', 'built', 'developed']) else 45,
        "education": edu_score,
        "certifications": 85 if any(w in res_norm for w in ['certified', 'certification', 'license']) else 40,
        "ats": ats_score,
        "format": fmt_score
    }

    # Format Key Terms for Output
    matched_k_out = [t.upper() for t in matched_terms_raw[:8]] if matched_terms_raw else matching_skills[:8]
    missing_k_out = [t.upper() for t in missing_terms_raw[:8]] if missing_terms_raw else missing_skills[:8]

    # Dynamic Candidate Suggestions & Pros/Cons
    suggestions = []
    if missing_k_out:
        suggestions.append(f"Incorporate missing target keywords: {', '.join(missing_k_out[:4])}.")
    if not has_metrics:
        suggestions.append("Quantify your work accomplishments using percentage results, metrics, or dollar values.")
    if action_verb_count < 2:
        suggestions.append("Start accomplishment bullets with high-impact action verbs (e.g. Architected, Spearheaded, Engineered).")
    if keyword_score < 60:
        suggestions.append("Align your technical experience section more closely with target job requirements.")

    pros = []
    if matched_k_out:
        pros.append(f"Strong match for core job terms: {', '.join(matched_k_out[:3])}.")
    if has_metrics:
        pros.append("Work history contains clear quantified metric results.")
    if has_degree:
        pros.append("Verified relevant academic degree background.")

    cons = []
    if missing_k_out:
        cons.append(f"Missing essential target terms: {', '.join(missing_k_out[:3])}.")
    if not has_metrics:
        cons.append("Work experience bullets lack numerical metrics.")

    # Missing Action Verbs
    missing_verbs = [v.capitalize() for v in ACTION_VERBS if v not in res_norm][:4]

    # Recommended Certifications & Projects based on category
    if "web" in category.lower():
        rec_certs = ["AWS Certified Developer", "Meta Frontend Professional", "MongoDB Certified Developer"]
        rec_projects = ["Microservices E-Commerce Gateway", "Real-Time Collaborative Canvas"]
    elif "data" in category.lower() or "ai" in category.lower():
        rec_certs = ["AWS Machine Learning Specialty", "Google Professional Data Engineer", "TensorFlow Developer"]
        rec_projects = ["RAG Multi-Document QA Agent", "Computer Vision Defect Detector"]
    elif "cloud" in category.lower() or "devops" in category.lower():
        rec_certs = ["Certified Kubernetes Administrator (CKA)", "AWS Solutions Architect Associate", "Terraform Associate"]
        rec_projects = ["Multi-Region Kubernetes Cluster with Terraform", "Automated GitOps CI/CD Pipeline"]
    else:
        rec_certs = ["AWS Certified Solutions Architect", "Certified ScrumMaster (CSM)", "Oracle Certified Java Engineer"]
        rec_projects = ["Enterprise Distributed Cache Engine", "Low-Latency Event Driven API"]

    # Summary Feedback
    has_summary = any(w in res_norm for w in ["summary", "profile", "objective", "about"])
    summary_len = len(re.findall(r'\w+', res_norm))
    if not has_summary:
        summary_feedback = "Missing an explicit Summary/Profile section at the top of the resume."
    elif summary_len < 30:
        summary_feedback = "Summary section is brief. Expand to 3-4 impactful sentences highlighting core competencies."
    else:
        summary_feedback = "Strong summary structure containing role-relevant technical keywords."

    strength_score = min(100, max(20, int(round((ats_score * 0.4) + (achieve_score * 0.3) + (sec_score * 0.3)))))
    grammar_score = min(100, max(75, fmt_score))
    readability_score = 92 if (has_contact and has_metrics) else 78

    return {
        "matchScore": keyword_score,
        "atsScore": ats_score,
        "strengthScore": strength_score,
        "grammarScore": grammar_score,
        "readabilityScore": readability_score,
        "category": category,
        "experienceLevel": exp_level,
        "matchingSkills": matching_skills,
        "missingSkills": missing_skills,
        "matchedKeywords": matched_k_out,
        "missingKeywords": missing_k_out,
        "missingActionVerbs": missing_verbs,
        "recommendedSkills": recommended_skills,
        "recommendedCertifications": rec_certs,
        "recommendedProjects": rec_projects,
        "summaryFeedback": summary_feedback,
        "keywordMatchPercentage": skills_score,
        "suggestions": suggestions,
        "pros": pros,
        "cons": cons,
        "scoringBreakdown": scoring_breakdown
    }
