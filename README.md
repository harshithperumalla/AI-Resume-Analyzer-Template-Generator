# AI Resume Analyzer & Template Generator

An AI-powered Resume Analyzer and Resume Builder that helps users build ATS-friendly resumes, analyze uploaded resumes, receive AI-powered suggestions, and generate professional resume templates.

---

# Live Demo

**Frontend:**Frontend:** 🚧 Coming Soon

> Backend deployment is currently in progress. 

---

# Features

- 🤖 AI Resume Analysis
- 📊 ATS Score Calculation
- 💡 AI Resume Suggestions
- 📄 Resume Builder
- 🎨 Multiple Resume Templates
- 📂 Upload Resume (PDF/DOCX)
- 🔍 Resume Parsing
- 📈 Resume Strength & Weakness Analysis
- 🧠 Missing Skills Detection
- 🎯 Keyword Matching
- 📋 Live Resume Preview
- 📥 PDF Resume Download
- 👤 User Authentication (JWT)
- 📁 Resume History
- 🌙 Dark / Light Mode
- 📱 Fully Responsive UI

---

# Tech Stack

## Frontend

- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Framer Motion
- Recharts

## Backend

- Python
- FastAPI
- Uvicorn
- Pydantic
- JWT Authentication

## Database

- MongoDB Atlas

## AI & NLP

- Google Gemini API
- TF-IDF Vectorizer
- Cosine Similarity
- Resume Parsing
- ATS Scoring Engine
- NLP Keyword Extraction

---

# Folder Structure

```text
AI-Resume-Analyzer-Template-Generator/

backend/
├── routes/
├── models/
├── config.py
├── main.py
├── requirements.txt

client/
├── src/
├── public/
├── package.json

README.md
render.yaml
```

---

# Environment Variables

Create a `.env` file.

```env
MONGODB_URI=your_mongodb_uri

JWT_SECRET=your_secret

GEMINI_API_KEY=your_gemini_api_key

PORT=8000

VITE_API_URL=http://localhost:8000
```

---

# Installation

Clone the repository

```bash
git clone https://github.com/harshithperumalla/AI-Resume-Analyzer-Template-Generator.git
```

```bash
cd AI-Resume-Analyzer-Template-Generator
```

---

# Frontend

```bash
cd client
npm install
npm run dev
```

Runs on

```
http://localhost:3000
```

---

# Backend

```bash
cd backend

pip install -r requirements.txt

python -m uvicorn main:app --reload
```

Runs on

```
http://localhost:8000
```

---

# AI Resume Analysis

The analyzer provides:

- ATS Score
- Resume Category Prediction
- Resume Strengths
- Resume Weaknesses
- Missing Skills
- Missing Keywords
- Keyword Density
- Resume Formatting Analysis
- Section Analysis
- Improvement Suggestions

---

# Resume Builder

- Live Resume Preview
- ATS-Friendly Templates
- Multiple Themes
- PDF Download
- Resume History
- Modern UI

---

# Upcoming Features

- Job Description Matching
- AI Resume Rewrite
- Cover Letter Generator
- LinkedIn Profile Analyzer
- Interview Preparation
- Portfolio Generator
- Skill Gap Analysis

---

# Deployment

| Service | Status |
|----------|--------|
| Frontend (Vercel) | ✅ Live |
| Backend (Render) | 🚧 Deploying |
| MongoDB Atlas | 🚧 Configuring |
| Gemini API | 🚧 Integration |

---

# Author

## Harshith Perumalla

GitHub:
https://github.com/harshithperumalla

---

⭐ If you like this project, please give it a Star.
