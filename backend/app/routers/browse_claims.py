import os
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Any, List, Optional
import logging
from pydantic import BaseModel
from dotenv import load_dotenv
import json

load_dotenv()

from app.db import supabase
from app.services.auth import get_current_user_optional, User

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/claims",
    tags=["claims", "browse"],
    responses={404: {"description": "Not found"}},
)

class UserPreview(BaseModel):
    id: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

class CommentOut(BaseModel):
    id: str
    content: str
    upvotes: int
    downvotes: int
    is_expert_response: bool
    created_at: str
    updated_at: Optional[str] = None
    user: Optional[UserPreview] = None

class AnalysisOut(BaseModel):
    id: Optional[str] = None
    verdict: Optional[str] = None
    confidence_score: Optional[float] = None
    summary: Optional[str] = None
    evidence: List[Any] = []
    sources: List[Any] = []
    ai_reasoning: Optional[str] = None
    created_at: Optional[str] = None

class ClaimOut(BaseModel):
    id: str
    content: str
    content_type: str
    status: str
    created_at: str
    comment_count: int
    upvote_count: int
    comments: List[CommentOut] = []
    analysis: Optional[AnalysisOut] = None

    class Config:
        from_attributes = True

@router.get("/browse", response_model=List[ClaimOut])
async def browse_claims(
    sort: Optional[str] = Query("newest", enum=["newest", "popular", "relevant"]),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    """Retrieve a list of claims enriched with comments, upvotes, and analysis."""
    logger.info(f"--- Received request to /browse with sort='{sort}', skip={skip}, limit={limit} ---")
    try:
        query = supabase.table("claims").select(
            "id, content, content_type, status, created_at, comment_count, upvote_count, "
            "comments:claim_comments(id, content, upvotes, downvotes, is_expert_response, created_at, updated_at, user:user_profiles(id, full_name, avatar_url)), "
            "analysis:claim_analyses(*)"
        )

        if sort == "popular":
            query = query.order("comment_count", desc=True)
        elif sort == "relevant":
            query = query.order("upvote_count", desc=True)
        else:
            query = query.order("created_at", desc=True)

        result = query.range(skip, skip + limit - 1).execute()

        if hasattr(result, 'error') and result.error:
            logger.error(f"!!! Supabase query failed: {result.error} !!!")
            raise HTTPException(status_code=500, detail="Database query failed")

        claims_out: List[ClaimOut] = []
        for item in result.data or []:
            # Process comments
            comment_rows = item.get("comments") or []
            comments_processed: List[CommentOut] = []
            if isinstance(comment_rows, list):
                for comment in comment_rows:
                    if not isinstance(comment, dict):
                        logger.warning(f"Skipping invalid comment data for claim {item.get('id')}: {comment}")
                        continue

                    user_payload = comment.get("user")
                    user_preview = None
                    if isinstance(user_payload, dict):
                        user_preview = UserPreview(
                            id=user_payload.get("id"),
                            full_name=user_payload.get("full_name"),
                            avatar_url=user_payload.get("avatar_url"),
                        )

                    comments_processed.append(
                        CommentOut(
                            id=comment.get("id", ""),
                            content=comment.get("content", ""),
                            upvotes=comment.get("upvotes", 0),
                            downvotes=comment.get("downvotes", 0),
                            is_expert_response=comment.get("is_expert_response", False),
                            created_at=comment.get("created_at", ""),
                            updated_at=comment.get("updated_at"),
                            user=user_preview,
                        )
                    )

            # Process analysis - handle both dict and list
            analysis = None
            analysis_data = item.get("analysis")

            analysis_dict_to_process = None
            if isinstance(analysis_data, dict):
                # Single result as dict
                analysis_dict_to_process = analysis_data
                logger.debug(f"Analysis for claim {item.get('id')} is dict")
            elif isinstance(analysis_data, list) and len(analysis_data) > 0:
                # Multiple results as list
                if isinstance(analysis_data[0], dict):
                    analysis_dict_to_process = analysis_data[0]
                    logger.debug(f"Analysis for claim {item.get('id')} is list[0]")
                else:
                    logger.warning(f"Unexpected item format in analysis list for claim {item.get('id')}: {analysis_data[0]}")

            if analysis_dict_to_process:
                try:
                    # Parse evidence field
                    raw_evidence = analysis_dict_to_process.get("evidence")
                    evidence_list = []
                    if isinstance(raw_evidence, str):
                        try:
                            evidence_list = json.loads(raw_evidence)
                        except json.JSONDecodeError:
                            logger.warning(f"Failed to parse evidence JSON for claim {item.get('id')}")
                            evidence_list = []
                    elif isinstance(raw_evidence, list):
                        evidence_list = raw_evidence
                    elif raw_evidence is None:
                        evidence_list = []
                    
                    # Parse sources field
                    raw_sources = analysis_dict_to_process.get("sources")
                    sources_list = []
                    if isinstance(raw_sources, str):
                        try:
                            sources_list = json.loads(raw_sources)
                        except json.JSONDecodeError:
                            logger.warning(f"Failed to parse sources JSON for claim {item.get('id')}")
                            sources_list = []
                    elif isinstance(raw_sources, list):
                        sources_list = raw_sources
                    elif raw_sources is None:
                        sources_list = []

                    analysis = AnalysisOut(
                        id=analysis_dict_to_process.get("id"),
                        verdict=analysis_dict_to_process.get("verdict"),
                        confidence_score=analysis_dict_to_process.get("confidence_score"),
                        summary=analysis_dict_to_process.get("summary"),
                        evidence=evidence_list,
                        sources=sources_list,
                        ai_reasoning=analysis_dict_to_process.get("ai_reasoning"),
                        created_at=analysis_dict_to_process.get("created_at"),
                    )
                    logger.debug(f"Successfully created analysis for claim {item.get('id')}")
                except Exception as e:
                    logger.error(f"Error creating AnalysisOut for claim {item.get('id')}: {e}", exc_info=True)
                    analysis = None

            claims_out.append(
                ClaimOut(
                    id=item.get("id", ""),
                    content=item.get("content", ""),
                    content_type=item.get("content_type", "text"),
                    status=item.get("status", ""),
                    created_at=item.get("created_at", ""),
                    comment_count=item.get("comment_count", 0),
                    upvote_count=item.get("upvote_count", 0),
                    comments=comments_processed,
                    analysis=analysis,
                )
            )

        logger.info(f"Returning {len(claims_out)} claims")
        return claims_out

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"!!! An error occurred while fetching claims: {e} !!!", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")