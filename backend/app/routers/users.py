# backend/app/routers/users.py

from fastapi import APIRouter, Depends, HTTPException, status
import uuid

# Use the centralized Supabase client and schemas
from app.db import supabase
from app.models.schemas import UserProfile, UserProfileUpdate
from app.services.auth import get_current_user, User

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me", response_model=UserProfile)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Get or create the current user's profile."""
    result = supabase.table("user_profiles").select("*").eq("id", str(current_user.id)).maybe_single().execute()
    
    if not result.data:
        # Create profile if it doesn't exist
        profile_data = {
            "id": str(current_user.id),
            "email": current_user.email,
            "full_name": current_user.full_name, # Comes from JWT
        }
        insert_result = supabase.table("user_profiles").insert(profile_data).select("*").single().execute()
        if not insert_result.data:
            raise HTTPException(status_code=500, detail="Could not create user profile.")
        return UserProfile(**insert_result.data)
    
    return UserProfile(**result.data)

@router.put("/me", response_model=UserProfile)
async def update_user_profile(
    profile_update: UserProfileUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update current user's profile using a Pydantic model."""
    update_data = profile_update.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update.")

    result = supabase.table("user_profiles").update(update_data).eq("id", str(current_user.id)).select("*").single().execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="User profile not found.")

    return UserProfile(**result.data)

@router.get("/{user_id}/profile")
async def get_user_profile(user_id: uuid.UUID):
    """Get public profile data including recent claims and comments."""
    # Get user profile - create if it doesn't exist
    profile_result = supabase.table("user_profiles").select("*").eq("id", str(user_id)).maybe_single().execute()

    if not profile_result.data:
        # Try to get user info from auth.users to create profile
        try:
            # This is a simplified approach - in production you'd want to get user info from JWT or auth context
            # For now, we'll create a basic profile
            profile_data = {
                "id": str(user_id),
                "email": f"user_{user_id}@example.com",  # Placeholder - should come from auth
                "full_name": None,
            }
            insert_result = supabase.table("user_profiles").insert(profile_data).select("*").single().execute()
            if not insert_result.data:
                raise HTTPException(status_code=500, detail="Could not create user profile.")
            profile = insert_result.data
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Could not create user profile: {str(e)}")
    else:
        profile = profile_result.data

    # Get recent claims (last 5)
    claims_result = supabase.table("claims").select(
        "id, content, status, created_at"
    ).eq("user_id", str(user_id)).order("created_at", desc=True).limit(5).execute()

    # Get analyses for these claims
    claim_ids = [str(claim["id"]) for claim in claims_result.data]
    analyses_result = {}
    if claim_ids:
        analyses = supabase.table("claim_analyses").select(
            "claim_id, verdict, confidence_score"
        ).in_("claim_id", claim_ids).execute()
        analyses_result = {str(a["claim_id"]): a for a in analyses.data}

    # Get comment counts for claims
    comment_counts = {}
    if claim_ids:
        counts = supabase.table("claim_comments").select(
            "claim_id", count="exact"
        ).in_("claim_id", claim_ids).execute()
        comment_counts = {str(c["claim_id"]): c["count"] or 0 for c in counts}

    # Format recent claims with analysis data
    recent_claims = []
    for claim in claims_result.data:
        claim_id = str(claim["id"])
        analysis = analyses_result.get(claim_id)
        recent_claims.append({
            "id": claim_id,
            "content": claim["content"],
            "status": claim["status"],
            "created_at": claim["created_at"],
            "verdict": analysis.get("verdict") if analysis else None,
            "confidence_score": analysis.get("confidence_score") if analysis else None,
            "comment_count": comment_counts.get(claim_id, 0)
        })

    # Get recent comments (last 5)
    comments_result = supabase.table("claim_comments").select(
        "id, content, created_at, upvotes, downvotes, claims(content)"
    ).eq("user_id", str(user_id)).order("created_at", desc=True).limit(5).execute()

    recent_comments = []
    for comment in comments_result.data:
        recent_comments.append({
            "id": str(comment["id"]),
            "content": comment["content"],
            "created_at": comment["created_at"],
            "upvotes": comment["upvotes"],
            "downvotes": comment["downvotes"],
            "claim_content": comment["claims"]["content"],
            "claim_id": str(comment["claims"]["id"])
        })

    # Get stats
    total_claims_result = supabase.table("claims").select("id", count="exact").eq("user_id", str(user_id)).execute()
    total_comments_result = supabase.table("claim_comments").select("id", count="exact").eq("user_id", str(user_id)).execute()
    verified_claims_result = supabase.table("claims").select(
        "claim_analyses(verdict)", count="exact"
    ).eq("user_id", str(user_id)).eq("claim_analyses.verdict", "true").execute()

    stats = {
        "total_claims": total_claims_result.count or 0,
        "total_comments": total_comments_result.count or 0,
        "verified_claims": verified_claims_result.count or 0
    }

    return {
        "profile": profile,
        "recent_claims": recent_claims,
        "recent_comments": recent_comments,
        "stats": stats
    }