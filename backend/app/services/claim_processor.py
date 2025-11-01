import os
import httpx
from uuid import UUID
from supabase import create_client, Client
from typing import Optional
from dotenv import load_dotenv
from app.models.schemas import ClaimStatus, ContentType, AIAnalysisRequest
import logging
import json

logger = logging.getLogger(__name__)
load_dotenv()

async def add_analysis_to_knowledge_base(claim: dict, analysis: dict, supabase_service_client: Optional[Client]):
    """Formats an analysis and sends it to the AI service to be learned."""
    if not supabase_service_client:
        logger.warning(f"Service client was not available when trying to add analysis for claim {claim.get('id', 'N/A')} to KB.")
    
    ai_service_url = os.getenv("AI_SERVICE_URL", "http://localhost:8001")
    if not ai_service_url:
        logger.error("AI_SERVICE_URL not configured. Cannot add analysis to knowledge base.")
        return

    try:
        new_article = {
            "title": f"Fact-Check for claim: '{claim.get('content', '')[:50]}...'",
            "content": analysis.get("summary", "") + "\n\nReasoning: " + analysis.get("ai_reasoning", ""),
            "source_url": f"http://localhost:3000/claims/{claim.get('id', '')}",
            "source_type": "fact-check",
            "verified": True
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(f"{ai_service_url}/add-article", json=new_article)
            response.raise_for_status()
            logger.info(f"Successfully requested addition of analysis for claim {claim.get('id', 'N/A')} to knowledge base.")
    except httpx.HTTPStatusError as http_err:
        logger.error(f"HTTP error occurred when adding analysis for claim {claim.get('id', 'N/A')} to knowledge base: {http_err.response.status_code} - {http_err.response.text}")
    except Exception as e:
        logger.error(f"Could not add analysis for claim {claim.get('id', 'N/A')} to knowledge base: {e}", exc_info=True)


async def process_claim_async(claim_id: UUID, supabase_url: str, supabase_service_key: str):
    """
    Asynchronously process a claim using a dedicated service client.
    """
    claim_id_str = str(claim_id)
    supabase_service_client: Optional[Client] = None
    analysis_saved_successfully = False

    try:
        # Initialize service client
        if not supabase_url or not supabase_service_key:
            logger.error(f"SUPABASE_URL or SUPABASE_SERVICE_KEY missing for claim {claim_id_str}.")
            raise ValueError("Supabase URL and Service Key are not configured.")

        supabase_service_client = create_client(supabase_url, supabase_service_key)
        logger.info(f"Service client initialized for processing claim {claim_id_str}")

        # Mark as PROCESSING
        update_result = supabase_service_client.table("claims").update(
            {"status": ClaimStatus.PROCESSING.value}
        ).eq("id", claim_id_str).execute()
        
        if hasattr(update_result, 'error') and update_result.error:
            logger.error(f"Failed to update claim {claim_id_str} status to PROCESSING: {update_result.error}")
            raise Exception(f"Failed to set status to PROCESSING: {update_result.error}")

        # Fetch claim details
        claim_result = supabase_service_client.table("claims").select("*").eq("id", claim_id_str).single().execute()
        if hasattr(claim_result, 'error') and claim_result.error:
            logger.error(f"Failed to fetch claim details for {claim_id_str}: {claim_result.error}")
            raise Exception(f"Failed to fetch claim details: {claim_result.error}")
        if not claim_result.data:
            logger.error(f"Claim {claim_id_str} not found after marking as processing.")
            return

        claim = claim_result.data

        # Get file URL if exists
        file_url = None
        if claim.get("file_path"):
            try:
                file_url = supabase_service_client.storage.from_("claim_files").get_public_url(claim["file_path"])
            except Exception as storage_e:
                logger.error(f"Failed to get public URL for file {claim['file_path']}: {storage_e}")
                file_url = None

        # Prepare request for AI service
        ai_request = AIAnalysisRequest(
            claim_id=claim_id_str,
            content=claim["content"],
            content_type=ContentType(claim["content_type"]),
            file_url=file_url
        )

        ai_service_url = os.getenv("AI_SERVICE_URL", "http://localhost:8001")
        if not ai_service_url:
            logger.error("AI_SERVICE_URL not configured. Cannot perform analysis.")
            raise ValueError("AI Service URL is not configured.")

        # Call AI Service with longer timeout
        logger.info(f"Calling AI service for claim {claim_id_str}...")
        ai_result = None
        async with httpx.AsyncClient(timeout=300.0) as client:
            response = await client.post(
                f"{ai_service_url}/analyze",
                json=ai_request.model_dump(mode='json')
            )
            response.raise_for_status()
            ai_result = response.json()
            logger.info(f"AI service returned result for claim {claim_id_str}")

        if not ai_result:
            logger.error(f"AI service did not return a valid result for claim {claim_id_str}.")
            raise Exception("AI service analysis failed or returned empty result.")

        # FIX: Ensure evidence and sources are properly serialized as JSON strings
        evidence_data = ai_result.get("evidence", [])
        sources_data = ai_result.get("sources", [])
        
        # Serialize to JSON strings if they're not already
        if isinstance(evidence_data, list):
            evidence_json = json.dumps(evidence_data)
        else:
            evidence_json = evidence_data if isinstance(evidence_data, str) else "[]"
            
        if isinstance(sources_data, list):
            sources_json = json.dumps(sources_data)
        else:
            sources_json = sources_data if isinstance(sources_data, str) else "[]"

        # Prepare analysis data for DB
        analysis_data = {
            "claim_id": claim_id_str,
            "verdict": ai_result.get("verdict", "uncertain"),
            "confidence_score": ai_result.get("confidence_score", 0.0),
            "summary": ai_result.get("summary", "Analysis failed or incomplete."),
            "evidence": evidence_json,  # Store as JSON string
            "sources": sources_json,    # Store as JSON string
            "ai_reasoning": ai_result.get("reasoning", "N/A")
        }

        # Save Analysis
        logger.info(f"Saving analysis for claim {claim_id_str}...")
        insert_result = supabase_service_client.table("claim_analyses").insert(analysis_data).execute()
        if hasattr(insert_result, 'error') and insert_result.error:
            logger.error(f"Failed to insert analysis for claim {claim_id_str}: {insert_result.error}")
            raise Exception(f"Failed to save analysis: {insert_result.error}")
        
        analysis_saved_successfully = True
        logger.info(f"Analysis saved successfully for claim {claim_id_str}")

        # Update Claim Status to COMPLETED
        update_result_completed = supabase_service_client.table("claims").update(
            {"status": ClaimStatus.COMPLETED.value}
        ).eq("id", claim_id_str).execute()
        
        if hasattr(update_result_completed, 'error') and update_result_completed.error:
            logger.error(f"Failed to update claim {claim_id_str} status to COMPLETED: {update_result_completed.error}")
        else:
            logger.info(f"Successfully processed claim {claim_id_str}")

    except Exception as e:
        logger.error(f"Core processing error for claim {claim_id_str}: {e}", exc_info=True)
        
        # Set status to FAILED
        if supabase_service_client:
            try:
                fail_result = supabase_service_client.table("claims").update(
                    {"status": ClaimStatus.FAILED.value}
                ).eq("id", claim_id_str).execute()
                
                if hasattr(fail_result, 'error') and fail_result.error:
                    logger.error(f"Also failed to update claim {claim_id_str} to FAILED status: {fail_result.error}")
                else:
                    logger.warning(f"Set claim {claim_id_str} to FAILED due to error: {e}")
            except Exception as db_e:
                logger.error(f"Could not update claim {claim_id_str} to FAILED status: {db_e}")
        return

    # Add to Knowledge Base (non-critical)
    if analysis_saved_successfully and 'claim' in locals() and 'analysis_data' in locals():
        try:
            await add_analysis_to_knowledge_base(claim, analysis_data, supabase_service_client)
        except Exception as kb_e:
            logger.error(f"Non-critical error adding analysis for claim {claim_id_str} to knowledge base: {kb_e}", exc_info=True)