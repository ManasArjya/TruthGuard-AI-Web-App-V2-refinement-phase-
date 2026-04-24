# backend/app/routers/dashboard.py

from fastapi import APIRouter, Depends
from app.db import supabase
from app.models.schemas import DashboardStats
from app.services.auth import get_current_user, User

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


# ------------------- DASHBOARD STATS -------------------
@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    """
    Get dashboard statistics for the current user.
    Safely handles all RPC response cases (empty, dict, list).
    """

    try:
        result = supabase.rpc(
            "get_user_dashboard_stats",
            {"user_id_param": str(current_user.id)}
        ).execute()

        data = result.data

        # 🛡️ Case 1: Empty or None
        if not data:
            data = {}

        # 🛡️ Case 2: If list → take first item
        if isinstance(data, list):
            data = data[0] if len(data) > 0 else {}

        # 🛡️ Case 3: Ensure dict
        if not isinstance(data, dict):
            data = {}

        # ✅ Safe return with defaults
        return DashboardStats(
            total_claims=data.get("total_claims", 0),
            pending_claims=data.get("pending_claims", 0),
            completed_claims=data.get("completed_claims", 0),
            rti_requests=data.get("rti_requests", 0),
            recent_claims=data.get("recent_claims", []) or []
        )

    except Exception as e:
        print("Dashboard Error:", str(e))

        return DashboardStats(
            total_claims=0,
            pending_claims=0,
            completed_claims=0,
            rti_requests=0,
            recent_claims=[]
        )


# ------------------- USER CLAIMS (NEW FIX) -------------------
@router.get("/my-claims")
async def get_my_claims(current_user: User = Depends(get_current_user)):
    """
    Get ONLY the claims created by the logged-in user.
    This fixes the issue where all app claims were shown.
    """

    try:
        result = (
            supabase.table("claims")
            .select("*")
            .eq("user_id", str(current_user.id))
            .order("created_at", desc=True)
            .execute()
        )

        return result.data or []

    except Exception as e:
        print("My Claims Error:", str(e))
        return []