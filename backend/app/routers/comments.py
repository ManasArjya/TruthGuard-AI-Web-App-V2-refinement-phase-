# backend/app/routers/comments.py

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
import uuid

# Use the centralized Supabase client and schemas
from app.db import supabase
from app.models.schemas import CommentCreate, CommentResponse, CommentVote, VoteType
from app.services.auth import get_current_user, get_current_user_optional, User

router = APIRouter(prefix="/comments", tags=["comments"])

@router.get("/{claim_id}", response_model=List[CommentResponse])
async def get_claim_comments(
    claim_id: uuid.UUID,
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Get all comments for a claim with user data and vote status."""
    
    query = supabase.table("claim_comments").select(
        "*, user:user_profiles(*)"
    ).eq("claim_id", str(claim_id)).order("created_at", desc=True)
    
    result = query.execute()

    if not result.data:
        return []

    # --- FIX: Get user votes for these comments (if user is logged in) ---
    user_votes = {}
    if current_user:
        try:
            comment_ids = [comment['id'] for comment in result.data]
            vote_result = supabase.table("comment_votes").select("comment_id, vote_type").in_("comment_id", comment_ids).eq("user_id", str(current_user.id)).execute()
            user_votes = {vote['comment_id']: vote['vote_type'] for vote in vote_result.data}
        except Exception as e:
            # Log the error but don't fail the request
            print(f"Error fetching user votes for comments: {e}")

    # Combine data
    comments_with_votes = []
    for comment in result.data:
        comment_model = CommentResponse(**comment)
        comment_model.user_vote = user_votes.get(comment['id'])
        comments_with_votes.append(comment_model)

    return comments_with_votes
    # --- END FIX ---

@router.post("/", response_model=CommentResponse)
async def create_comment(
    comment: CommentCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new comment and return the full object in one query."""
    comment_data = comment.model_dump()
    
    # --- FIX for TypeError: UUID is not JSON serializable ---
    # Manually convert all UUIDs to strings
    comment_data["claim_id"] = str(comment_data["claim_id"])
    comment_data["user_id"] = str(current_user.id)
    if comment_data.get("parent_comment_id"):
        comment_data["parent_comment_id"] = str(comment_data["parent_comment_id"])
    # --- END FIX ---

    comment_data["is_expert_response"] = current_user.is_expert
    
    # --- FIX for v1.x syntax ---
    # This uses two database calls, which is less efficient but
    # will work with your old 'supabase-python' v1.x library.
    
    # Step 1: Insert the data.
    insert_result = supabase.table("claim_comments").insert(comment_data).execute()

    if not insert_result.data:
         raise HTTPException(status_code=500, detail="Failed to create comment record.")
    
    # Get the new comment's ID from the insert response
    new_comment_id = insert_result.data[0]['id']

    # Step 2: Fetch the full comment data (with user profile)
    result = supabase.table("claim_comments").select(
        "*, user:user_profiles(*)"
    ).eq("id", new_comment_id).single().execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to fetch newly created comment.")
    
    return CommentResponse(**result.data)
    # --- END FIX ---


@router.post("/{comment_id}/vote")
async def vote_on_comment(
    comment_id: uuid.UUID,
    vote: CommentVote,
    current_user: User = Depends(get_current_user)
):
    """
    Vote on a comment.
    This now correctly upserts the vote AND triggers a recalculation.
    """
    vote_data = {
        "comment_id": str(comment_id),
        "user_id": str(current_user.id),
        "vote_type": vote.vote_type.value,
    }
    
    # Upsert ensures the vote is created or updated in one go
    supabase.table("comment_votes").upsert(vote_data).execute()
    
    # --- FIX ---
    # Trigger the recalculation function in the database
    try:
        supabase.rpc("recalculate_comment_votes", {"c_id": str(comment_id)}).execute()
    except Exception as e:
        # Log the error, but the vote was still cast.
        print(f"Error recalculating votes for comment {comment_id}: {e}")
        # Depending on requirements, you could raise an HTTPException here
    
    return {"status": "success", "message": "Vote submitted and counts updated."}