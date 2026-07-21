import os
import sys
import uvicorn

# Ensure the root directory and backend directory are in sys.path
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
ROOT_DIR = os.path.abspath(os.path.join(BASE_DIR, ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

try:
    from backend.config import settings
    from backend.routes import auth, resumes, stats
except ImportError:
    from config import settings
    from routes import auth, resumes, stats

app = FastAPI(
    title="AI Resume Analyzer API",
    description="Python Full-Stack AI Resume Analyzer powered by FastAPI, MongoDB, spaCy, Scikit-Learn, and Gemini API",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth.router)
app.include_router(resumes.router)
app.include_router(stats.router)

# Production Static File Mounting for React Frontend Single Page App (SPA)
DIST_DIR = os.path.abspath(os.path.join(ROOT_DIR, "dist"))
if os.path.exists(DIST_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(DIST_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        if full_path.startswith("api"):
            return JSONResponse(status_code=404, content={"detail": "API route not found"})
        file_path = os.path.join(DIST_DIR, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(DIST_DIR, "index.html"))
else:
    @app.get("/")
    async def root():
        return {
            "status": "online",
            "message": "AI Resume Analyzer FastAPI Server running on port 8000.",
            "docs": "/docs"
        }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=settings.PORT)
