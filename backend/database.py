import os
import json
import re
from typing import Optional, List, Dict, Any

try:
    from backend.config import settings
except ImportError:
    from config import settings

LOCAL_DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "db.json"))

def _read_local_db() -> dict:
    if not os.path.exists(LOCAL_DB_PATH):
        return {"users": [], "resumes": [], "history": [], "jobs": []}
    try:
        with open(LOCAL_DB_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            data.setdefault("users", [])
            data.setdefault("resumes", [])
            data.setdefault("history", [])
            data.setdefault("jobs", [])
            return data
    except Exception as e:
        print(f"Error reading local db.json: {e}")
        return {"users": [], "resumes": [], "history": [], "jobs": []}

def _write_local_db(data: dict):
    try:
        with open(LOCAL_DB_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Error writing local db.json: {e}")

# Motor Async Database Connection
mongo_client = None
mongo_db = None
connection_attempted = False

async def get_db():
    global mongo_client, mongo_db, connection_attempted
    if mongo_db is not None:
        return mongo_db
    
    if connection_attempted:
        return None
        
    connection_attempted = True
    uri = settings.MONGODB_URI
    if not uri or "YOUR_MONGODB_URI" in uri:
        print("MongoDB URI unconfigured. Operating with high-speed local JSON store.")
        return None
        
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        client = AsyncIOMotorClient(uri, serverSelectionTimeoutMS=3000)
        await client.admin.command('ping')
        print("Successfully connected to MongoDB Atlas!")
        mongo_client = client
        mongo_db = client.get_database()
        await _auto_migrate_local_to_mongo(mongo_db)
        return mongo_db
    except Exception as e:
        print(f"MongoDB Atlas connection unavailable ({e}). Using local fallback store.")
        mongo_client = None
        mongo_db = None
        return None

async def _auto_migrate_local_to_mongo(db):
    try:
        user_count = await db.users.count_documents({})
        if user_count > 0:
            return
        local_data = _read_local_db()
        if not any(local_data.values()):
            return
        print("Migrating local JSON database to MongoDB...")
        if local_data.get("users"):
            await db.users.insert_many(local_data["users"])
        if local_data.get("resumes"):
            await db.resumes.insert_many(local_data["resumes"])
        if local_data.get("history"):
            await db.history.insert_many(local_data["history"])
        if local_data.get("jobs"):
            await db.jobs.insert_many(local_data["jobs"])
        print("Migration to MongoDB completed successfully!")
    except Exception as e:
        print(f"Migration to MongoDB failed: {e}")

# Data Operations Layer

async def save_user(user_dict: dict):
    db = await get_db()
    if db is not None:
        try:
            await db.users.update_one({"id": user_dict["id"]}, {"$set": user_dict}, upsert=True)
            return
        except Exception as e:
            print(f"Mongo save_user error: {e}")
    data = _read_local_db()
    for i, u in enumerate(data.get("users", [])):
        if u["id"] == user_dict["id"]:
            data["users"][i] = user_dict
            _write_local_db(data)
            return
    data["users"].append(user_dict)
    _write_local_db(data)

async def get_user_by_email(email: str) -> Optional[dict]:
    db = await get_db()
    if db is not None:
        try:
            regex_pattern = re.compile(f"^{re.escape(email)}$", re.IGNORECASE)
            user = await db.users.find_one({"email": {"$regex": regex_pattern}})
            if user:
                user.pop("_id", None)
                return user
        except Exception as e:
            print(f"Mongo get_user_by_email error: {e}")
    data = _read_local_db()
    for u in data.get("users", []):
        if u.get("email", "").lower() == email.lower():
            return u
    return None

async def get_user_by_id(user_id: str) -> Optional[dict]:
    db = await get_db()
    if db is not None:
        try:
            user = await db.users.find_one({"id": user_id})
            if user:
                user.pop("_id", None)
                return user
        except Exception as e:
            print(f"Mongo get_user_by_id error: {e}")
    data = _read_local_db()
    for u in data.get("users", []):
        if u.get("id") == user_id:
            return u
    return None

async def get_resumes(user_id: str) -> List[dict]:
    db = await get_db()
    if db is not None:
        try:
            cursor = db.resumes.find({"userId": user_id}).sort("updatedAt", -1)
            resumes = await cursor.to_list(length=1000)
            for r in resumes:
                r.pop("_id", None)
            return resumes
        except Exception as e:
            print(f"Mongo get_resumes error: {e}")
    data = _read_local_db()
    user_resumes = [r for r in data.get("resumes", []) if r.get("userId") == user_id]
    user_resumes.sort(key=lambda x: x.get("updatedAt", ""), reverse=True)
    return user_resumes

async def get_resume_by_id(resume_id: str) -> Optional[dict]:
    db = await get_db()
    if db is not None:
        try:
            resume = await db.resumes.find_one({"id": resume_id})
            if resume:
                resume.pop("_id", None)
                return resume
        except Exception as e:
            print(f"Mongo get_resume_by_id error: {e}")
    data = _read_local_db()
    for r in data.get("resumes", []):
        if r.get("id") == resume_id:
            return r
    return None

async def save_resume(resume_dict: dict):
    db = await get_db()
    if db is not None:
        try:
            await db.resumes.update_one({"id": resume_dict["id"]}, {"$set": resume_dict}, upsert=True)
            return
        except Exception as e:
            print(f"Mongo save_resume error: {e}")
    data = _read_local_db()
    resumes = data.get("resumes", [])
    for idx, r in enumerate(resumes):
        if r["id"] == resume_dict["id"]:
            resumes[idx] = resume_dict
            _write_local_db(data)
            return
    resumes.append(resume_dict)
    _write_local_db(data)

async def delete_resume(resume_id: str):
    db = await get_db()
    if db is not None:
        try:
            await db.resumes.delete_one({"id": resume_id})
            await db.history.delete_many({"resumeId": resume_id})
            return
        except Exception as e:
            print(f"Mongo delete_resume error: {e}")
    data = _read_local_db()
    data["resumes"] = [r for r in data.get("resumes", []) if r.get("id") != resume_id]
    data["history"] = [h for h in data.get("history", []) if h.get("resumeId") != resume_id]
    _write_local_db(data)

async def save_history(history_dict: dict):
    db = await get_db()
    if db is not None:
        try:
            await db.history.update_one({"id": history_dict["id"]}, {"$set": history_dict}, upsert=True)
            return
        except Exception as e:
            print(f"Mongo save_history error: {e}")
    data = _read_local_db()
    data["history"].append(history_dict)
    _write_local_db(data)

async def get_history(resume_id: str) -> List[dict]:
    db = await get_db()
    if db is not None:
        try:
            cursor = db.history.find({"resumeId": resume_id}).sort("timestamp", -1)
            history_list = await cursor.to_list(length=500)
            for h in history_list:
                h.pop("_id", None)
            return history_list
        except Exception as e:
            print(f"Mongo get_history error: {e}")
    data = _read_local_db()
    h_list = [h for h in data.get("history", []) if h.get("resumeId") == resume_id]
    h_list.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    return h_list

async def save_job(job_dict: dict):
    db = await get_db()
    if db is not None:
        try:
            await db.jobs.update_one({"id": job_dict["id"]}, {"$set": job_dict}, upsert=True)
            return
        except Exception as e:
            print(f"Mongo save_job error: {e}")
    data = _read_local_db()
    data["jobs"].append(job_dict)
    _write_local_db(data)

async def get_system_stats() -> dict:
    db = await get_db()
    if db is not None:
        try:
            total_users = await db.users.count_documents({})
            total_resumes = await db.resumes.count_documents({})
            total_history = await db.history.count_documents({})
            total_jobs = await db.jobs.count_documents({})
            
            cursor = db.history.find({})
            history_list = await cursor.to_list(length=10000)
            categories = {}
            sum_ats = 0
            ats_count = 0
            for h in history_list:
                analysis = h.get("analysis")
                if analysis:
                    cat = analysis.get("category", "General")
                    categories[cat] = categories.get(cat, 0) + 1
                    sum_ats += int(analysis.get("atsScore", 0))
                    ats_count += 1
            
            if ats_count > 0:
                avg_score = round(sum_ats / ats_count)
            else:
                resumes_cursor = db.resumes.find({})
                resumes_list = await resumes_cursor.to_list(length=10000)
                if resumes_list:
                    scores = [int(r.get("atsScore", 70)) for r in resumes_list if r.get("atsScore") is not None]
                    avg_score = round(sum(scores) / len(scores)) if scores else 70
                else:
                    avg_score = 70

            return {
                "totalUsers": total_users,
                "totalResumes": total_resumes,
                "totalHistory": total_history,
                "totalJobs": total_jobs,
                "categories": categories,
                "averageAtsScore": avg_score
            }
        except Exception as e:
            print(f"Mongo get_system_stats error: {e}")
    
    data = _read_local_db()
    total_users = len(data.get("users", []))
    total_resumes = len(data.get("resumes", []))
    total_history = len(data.get("history", []))
    total_jobs = len(data.get("jobs", []))
    categories = {}
    sum_ats = 0
    ats_count = 0
    for h in data.get("history", []):
        analysis = h.get("analysis")
        if analysis:
            cat = analysis.get("category", "General")
            categories[cat] = categories.get(cat, 0) + 1
            sum_ats += int(analysis.get("atsScore", 0))
            ats_count += 1
            
    if ats_count > 0:
        avg_score = round(sum_ats / ats_count)
    else:
        resumes_list = data.get("resumes", [])
        if resumes_list:
            scores = [int(r.get("atsScore", 70)) for r in resumes_list if r.get("atsScore") is not None]
            avg_score = round(sum(scores) / len(scores)) if scores else 70
        else:
            avg_score = 70

    return {
        "totalUsers": total_users,
        "totalResumes": total_resumes,
        "totalHistory": total_history,
        "totalJobs": total_jobs,
        "categories": categories,
        "averageAtsScore": avg_score
    }
