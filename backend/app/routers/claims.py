from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, File, UploadFile, Form, Request
from typing import List, Optional
import uuid
import os
import json
import logging

from app.db import supabase, anon_key, supabase_url
from app.models.schemas import (
    ClaimResponse, ClaimDetail, ClaimAnalysis, SearchResult,
    ContentType, ClaimStatus, Verdict, EvidenceItem, CommentVote, VoteType
)
from app.services.auth import get_current_user, get_current_user_optional, User
from app.services.claim_processor import process_claim_async

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/claims", tags=["claims"])
STORAGE_BUCKET_NAME = "claim_files"

@router.post("/submit", response_model=ClaimResponse)
async def submit_claim(
    request: Request,
    background_tasks: BackgroundTasks,
    content: str = Form(...),
    content_type: ContentType = Form(...),
    original_url: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user)
):
    storage_file_path = None
    auth_header = request.headers.get("Authorization")
    user_jwt = None
    if auth_header and auth_header.startswith("Bearer "):
        user_jwt = auth_header.split(" ")[1]

    if not user_jwt:
        logger.error(f"Submit claim failed: No JWT found for user {current_user.id}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authentication token.")

    if file:
        try:
            content_bytes = await file.read()
            file_extension = file.filename.split(".")[-1] if '.' in file.filename else 'bin'
            unique_filename = f"{current_user.id}/{uuid.uuid4()}.{file_extension}"

            supabase.auth.set_session(access_token=user_jwt, refresh_token='dummy_refresh_token')

            try:
                upload_response = supabase.storage.from_(STORAGE_BUCKET_NAME).upload(
                    path=unique_filename, file=content_bytes, file_options={"content-type": file.content_type or 'application/octet-stream'}
                )
                storage_file_path = unique_filename
                logger.info(f"File uploaded successfully for user {current_user.id}: {unique_filename}")
            finally:
                supabase.postgrest.auth(anon_key)
                supabase.auth.sign_out()

        except Exception as e:
            logger.error(f"Failed to upload file for user {current_user.id}: {str(e)}", exc_info=True)
            try:
                supabase.postgrest.auth(anon_key)
                supabase.auth.sign_out()
            except Exception as reset_e:
                logger.error(f"Failed to reset auth after upload error: {reset_e}")
            raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")

    claim_data = {
        # --- FIX for TypeError: UUID is not JSON serializable ---
        "user_id": str(current_user.id),
        # --- END FIX ---
        "content": content, 
        "content_type": content_type.value,
        "original_url": original_url, 
        "file_path": storage_file_path, 
        "status": ClaimStatus.PENDING.value
    }

    result = None
    try:
        supabase.postgrest.auth(user_jwt)
        
        # --- FIX for v1.x syntax ---
        # Use v1.x syntax: insert([...]).execute()
        # We must pass a list, and we can't chain .select()
        result = supabase.table("claims").insert([claim_data]).execute()
        # --- END FIX ---

        logger.info(f"Claim inserted successfully for user {current_user.id}")

        if not result or not result.data:
            logger.error(f"Failed to create claim DB record for user {current_user.id}. Response: {result}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create claim record.")

    except Exception as e:
        logger.error(f"Database error inserting claim for user {current_user.id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Database error during claim creation.")
    finally:
        try:
            supabase.postgrest.auth(anon_key)
            logger.debug("Supabase client auth reset to anon key after claim insert.")
        except Exception as reset_e:
            logger.error(f"Failed to reset auth after claim insert: {reset_e}")

    claim = result.data[0]

    supabase_url_for_task = supabase_url 
    supabase_service_key_for_task = os.getenv("SUPABASE_SERVICE_KEY") 

    if not supabase_url_for_task or not supabase_service_key_for_task:
        logger.error(f"Cannot schedule background task for claim {claim['id']}: Missing env vars.")
        try:
            supabase.table("claims").update({"status": ClaimStatus.FAILED.value}).eq("id", claim['id']).execute()
            logger.warning(f"Marked claim {claim['id']} as FAILED due to missing env vars for background task.")
        except Exception as update_e:
            logger.error(f"Failed to mark claim {claim['id']} as FAILED: {update_e}")
    else:
        background_tasks.add_task(
            process_claim_async,
            claim["id"],
            supabase_url=supabase_url_for_task,
            supabase_service_key=supabase_service_key_for_task
        )
        logger.info(f"Background processing task scheduled for claim {claim['id']}")

    return ClaimResponse(**claim)


@router.get("/{claim_id}", response_model=ClaimDetail)
async def get_claim(
    claim_id: uuid.UUID,
    current_user: Optional[User] = Depends(get_current_user_optional) # <-- UPDATED
):
    """Get claim details with analysis, comment count, and vote status"""
    try:
        logger.info(f"📥 Fetching claim {claim_id}")
        result = supabase.table("claims").select(
            "*, claim_analyses(*), claim_comments(count)"
        ).eq("id", str(claim_id)).single().execute()

        if not result.data:
            logger.warning(f"❌ Claim {claim_id} not found")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found")

        claim_data = result.data
        logger.info(f"✅ Got claim data - status: {claim_data.get('status')}")

        analysis_data_list = claim_data.get("claim_analyses")
        analysis = None
        
        logger.info(f"🔍 Analysis data type: {type(analysis_data_list)}, empty: {not analysis_data_list}")
        
        # Handle both dict (single result) and list (multiple results) from Supabase
        analysis_dict = None
        if isinstance(analysis_data_list, dict):
            # Single result returned as dict
            analysis_dict = analysis_data_list
            logger.info(f"📊 Found analysis as dict with keys: {analysis_dict.keys()}")
        elif isinstance(analysis_data_list, list) and analysis_data_list:
            # Multiple results returned as list
            analysis_dict = analysis_data_list[0]
            logger.info(f"📊 Found analysis in list with keys: {analysis_dict.keys() if isinstance(analysis_dict, dict) else 'NOT A DICT'}")
            
        if analysis_dict and isinstance(analysis_dict, dict):
                try:
                    # Log raw evidence and sources before parsing
                    raw_evidence = analysis_dict.get('evidence')
                    raw_sources = analysis_dict.get('sources')
                    logger.info(f"🔬 Raw evidence type: {type(raw_evidence)}, length: {len(raw_evidence) if isinstance(raw_evidence, (list, str)) else 'N/A'}")
                    logger.info(f"🔗 Raw sources type: {type(raw_sources)}, length: {len(raw_sources) if isinstance(raw_sources, (list, str)) else 'N/A'}")
                    
                    # Parse JSON fields
                    if isinstance(raw_evidence, str):
                        logger.info(f"🔄 Parsing evidence from JSON string")
                        try:
                            raw_evidence = json.loads(raw_evidence)
                            logger.info(f"✅ Parsed evidence: {len(raw_evidence)} items")
                        except json.JSONDecodeError as je:
                            logger.warning(f"❌ Failed to parse evidence JSON for claim {claim_id}: {je}")
                            raw_evidence = []
                    
                    if raw_evidence is None:
                        raw_evidence = []
                    
                    evidence_value = []
                    if isinstance(raw_evidence, list):
                        logger.info(f"📝 Processing {len(raw_evidence)} evidence items")
                        for idx, item in enumerate(raw_evidence):
                            if isinstance(item, dict):
                                evidence_value.append(EvidenceItem(
                                    source=item.get('source', ''),
                                    excerpt=item.get('excerpt', ''),
                                    credibility_score=item.get('credibility_score'),
                                    url=item.get('url')
                                ))
                                logger.debug(f"  ✅ Evidence {idx+1}: source={item.get('source', 'Unknown')[:30]}")
                    
                    if isinstance(raw_sources, str):
                        logger.info(f"🔄 Parsing sources from JSON string")
                        try:
                            raw_sources = json.loads(raw_sources)
                            logger.info(f"✅ Parsed sources: {len(raw_sources)} items")
                        except json.JSONDecodeError as je:
                            logger.warning(f"❌ Failed to parse sources JSON for claim {claim_id}: {je}")
                            raw_sources = []
                    
                    if raw_sources is None:
                        raw_sources = []

                    logger.info(f"📦 Final evidence count: {len(evidence_value)}, sources count: {len(raw_sources) if isinstance(raw_sources, list) else 0}")

                    analysis = ClaimAnalysis(
                        id=analysis_dict.get('id'),
                        claim_id=analysis_dict.get('claim_id'),
                        verdict=analysis_dict.get('verdict') or Verdict.UNCERTAIN,
                        confidence_score=analysis_dict.get('confidence_score') or 0.0,
                        summary=analysis_dict.get('summary') or 'Analysis incomplete.',
                        evidence=evidence_value,
                        sources=raw_sources if isinstance(raw_sources, list) else [],
                        ai_reasoning=analysis_dict.get('ai_reasoning') or 'N/A',
                        created_at=analysis_dict.get('created_at')
                    )
                    logger.info(f"✅ Analysis created successfully with {len(evidence_value)} evidence items and {len(analysis.sources)} sources")
                except Exception as pydantic_e:
                    logger.error(f"❌ Pydantic validation failed for analysis {analysis_dict.get('id')} on claim {claim_id}: {pydantic_e}", exc_info=True)
                    analysis = None
        
        if not analysis_dict:
            logger.info(f"ℹ️ No analysis found for claim {claim_id}")

        comment_count_data = claim_data.get("claim_comments")
        comment_count = 0
        if isinstance(comment_count_data, list) and comment_count_data:
            count_dict = comment_count_data[0]
            if isinstance(count_dict, dict):
                comment_count = count_dict.get("count", 0)

        # --- START: NEW VOTE LOGIC ---
        user_vote_status: Optional[VoteType] = None
        if current_user:
            try:
                vote_result = supabase.table("claim_votes").select("vote_type").eq(
                    "claim_id", str(claim_id)
                ).eq("user_id", str(current_user.id)).single().execute()
                
                if vote_result.data:
                    user_vote_status = vote_result.data.get("vote_type")
                    logger.info(f"🗳️ User {current_user.id} has voted: {user_vote_status}")
            except Exception as vote_e:
                # Log the error but don't fail the request (e.g., if no vote found)
                logger.warning(f"Could not fetch user vote status: {vote_e}")
        # --- END: NEW VOTE LOGIC ---

        logger.info(f"🎯 Returning claim detail - has_analysis: {analysis is not None}, comment_count: {comment_count}, user_vote: {user_vote_status}")
        
        return ClaimDetail(
            claim=ClaimResponse(**claim_data), # upvote_count is now part of this
            analysis=analysis,
            comment_count=comment_count,
            user_vote=user_vote_status # <-- Pass the vote status
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"💥 Error fetching claim details for {claim_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error fetching claim details.")


@router.get("/", response_model=SearchResult)
async def search_claims(
    q: Optional[str] = None,
    status: Optional[ClaimStatus] = None,
    page: int = 1,
    per_page: int = 20
):
    """Search and filter claims"""
    offset = (page - 1) * per_page
    try:
        query = supabase.table("claims").select(
            "*, claim_analyses(*), claim_comments(count)",
            count="exact"
        )

        if q:
            query = query.ilike("content", f"%{q}%")

        if status:
            query = query.eq("status", status.value)

        result = query.order("created_at", desc=True).range(offset, offset + per_page - 1).execute()

        if result.data is None:
            result.data = []
        if result.count is None:
            result.count = 0

        claim_details = []
        for item in result.data:
            analysis_data_list = item.get("claim_analyses")
            analysis = None
            
            # Handle both dict and list from Supabase
            analysis_dict = None
            if isinstance(analysis_data_list, dict):
                analysis_dict = analysis_data_list
            elif isinstance(analysis_data_list, list) and analysis_data_list:
                analysis_dict = analysis_data_list[0]
                
            if analysis_dict and isinstance(analysis_dict, dict):
                    try:
                        # Parse JSON fields
                        raw_evidence = analysis_dict.get('evidence')
                        if isinstance(raw_evidence, str):
                            try:
                                raw_evidence = json.loads(raw_evidence)
                            except:
                                raw_evidence = []
                        
                        evidence_value = []
                        if isinstance(raw_evidence, list):
                            for ev_item in raw_evidence:
                                if isinstance(ev_item, dict):
                                    evidence_value.append(EvidenceItem(
                                        source=ev_item.get('source', ''),
                                        excerpt=ev_item.get('excerpt', ''),
                                        credibility_score=ev_item.get('credibility_score'),
                                        url=ev_item.get('url')
                                    ))
                        
                        raw_sources = analysis_dict.get('sources')
                        if isinstance(raw_sources, str):
                            try:
                                raw_sources = json.loads(raw_sources)
                            except:
                                raw_sources = []

                        analysis = ClaimAnalysis(
                            id=analysis_dict.get('id'),
                            claim_id=analysis_dict.get('claim_id'),
                            verdict=analysis_dict.get('verdict') or Verdict.UNCERTAIN,
                            confidence_score=analysis_dict.get('confidence_score') or 0.0,
                            summary=analysis_dict.get('summary') or 'Analysis incomplete.',
                            evidence=evidence_value,
                            sources=raw_sources if isinstance(raw_sources, list) else [],
                            ai_reasoning=analysis_dict.get('ai_reasoning', 'N/A'),
                            created_at=analysis_dict.get('created_at')
                        )
                    except Exception as pydantic_e:
                        logger.warning(f"Pydantic validation failed for analysis {analysis_dict.get('id')} on claim {item.get('id')}: {pydantic_e}")
                        analysis = None

            comment_count_data = item.get("claim_comments")
            comment_count = 0
            if isinstance(comment_count_data, list) and comment_count_data:
                count_dict = comment_count_data[0]
                if isinstance(count_dict, dict):
                    comment_count = count_dict.get("count", 0)

            claim_details.append(ClaimDetail(
                claim=ClaimResponse(**item),
                analysis=analysis,
                comment_count=comment_count
                # user_vote is not populated in search results for performance
            ))

        return SearchResult(
            claims=claim_details,
            total_count=result.count,
            page=page,
            per_page=per_page
        )
    except Exception as e:
        logger.error(f"Error during claim search/filtering: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error during claim search.")


@router.get("/{claim_id}/status")
async def get_claim_status(claim_id: uuid.UUID):
    """Get current processing status of a claim"""
    try:
        result = supabase.table("claims").select("status").eq("id", str(claim_id)).single().execute()
        if not result.data:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found")
        return {"status": result.data["status"]}
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error fetching status for claim {claim_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch claim status"
        )

@router.post("/{claim_id}/vote", status_code=status.HTTP_200_OK)
async def vote_on_claim(
    claim_id: uuid.UUID,
    vote: CommentVote,  # We can reuse the CommentVote schema
    current_user: User = Depends(get_current_user)
):
    """
    Vote on a claim. This endpoint only supports 'up' votes for now.
    """
    
    # We only allow 'up' votes on claims
    if vote.vote_type.value != 'up':
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only upvotes are allowed on claims.")

    vote_data = {
        "claim_id": str(claim_id),
        "user_id": str(current_user.id),
        "vote_type": vote.vote_type.value,
    }
    
    # Upsert the vote
    supabase.table("claim_votes").upsert(vote_data).execute()
    
    # Trigger the recalculation
    try:
        supabase.rpc("recalculate_claim_votes", {"c_id": str(claim_id)}).execute()
    except Exception as e:
        logger.error(f"Error recalculating claim votes for {claim_id}: {e}")
        # Don't fail the whole request, the vote was still cast
    
    return {"status": "success", "message": "Vote submitted and counts updated."}