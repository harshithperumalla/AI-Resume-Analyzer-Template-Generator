from fastapi import APIRouter, Depends

try:
    from backend.auth import get_current_user_id
    from backend.database import get_system_stats
except ImportError:
    from auth import get_current_user_id
    from database import get_system_stats

router = APIRouter(prefix="/api/stats", tags=["System Statistics"])

@router.get("", response_model=dict)
async def fetch_stats(user_id: str = Depends(get_current_user_id)):
    stats = await get_system_stats()
    return stats
