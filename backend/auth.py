import random
import string
from typing import Optional, Dict
from fastapi import Request, HTTPException, Security, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

try:
    from backend.config import settings
except ImportError:
    from config import settings

try:
    import jwt
    HAS_JWT = True
except ImportError:
    HAS_JWT = False
    jwt = None

# Active session tokens dictionary (token -> userId)
active_sessions: Dict[str, str] = {}

security = HTTPBearer(auto_error=False)

def generate_id() -> str:
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=12))

def create_access_token(user_id: str) -> str:
    if HAS_JWT and jwt:
        try:
            token_payload = {"sub": user_id}
            token = jwt.encode(token_payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
            if isinstance(token, bytes):
                token = token.decode("utf-8")
            active_sessions[token] = user_id
            return token
        except Exception:
            pass
    token = f"tok-{generate_id()}"
    active_sessions[token] = user_id
    return token

def verify_password(plain_password: str, password_hash: str) -> bool:
    return plain_password == password_hash

def hash_password(password: str) -> str:
    return password

async def get_current_user_id(credentials: Optional[HTTPAuthorizationCredentials] = Security(security)) -> str:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized. Authorization token required."
        )
    token = credentials.credentials
    
    if token in active_sessions:
        return active_sessions[token]
    
    if HAS_JWT and jwt:
        try:
            payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
            user_id: str = payload.get("sub")
            if user_id:
                active_sessions[token] = user_id
                return user_id
        except Exception:
            pass
    
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired session token."
    )
