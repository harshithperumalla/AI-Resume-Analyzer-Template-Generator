import os

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

class Settings:
    MONGODB_URI: str = os.getenv(
        "MONGODB_URI",
        "mongodb+srv://harshithdb_user:harshithdb876@cluster0.4itp6tk.mongodb.net/ai_resume_analyzer?retryWrites=true&w=majority"
    )
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "ai_resume_analyzer_secret_jwt_key_2026")
    JWT_ALGORITHM: str = "HS256"
    PORT: int = int(os.getenv("PORT", "8000"))
    NODE_ENV: str = os.getenv("NODE_ENV", "development")

settings = Settings()
