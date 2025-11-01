"""
RAG (Retrieval-Augmented Generation) system for TruthGuard AI
Handles similarity search against a persistent vector database (pgvector)
"""

import numpy as np
from typing import List, Dict, Any
import asyncio
import logging
import os
from supabase import create_client, Client
from dotenv import load_dotenv # Import load_dotenv

try:
    from sentence_transformers import SentenceTransformer
    EMBEDDINGS_AVAILABLE = True
except ImportError:
    EMBEDDINGS_AVAILABLE = False
    logging.warning("Sentence transformers not available. RAG system will not function.")

logger = logging.getLogger(__name__)

class RAGSystem:
    """RAG system for retrieving relevant information from a persistent knowledge base"""

    def __init__(self):
        """Initialize RAG system with a sentence transformer model"""
        # Load environment variables first
        load_dotenv()

        self.embeddings_enabled = False
        self.embedding_model = None
        self.supabase = None # Initialize supabase client as None

        if not EMBEDDINGS_AVAILABLE:
            logger.error("RAG System disabled: sentence-transformers library not found.")
            return

        try:
            # Load the model name from an environment variable
            model_name = os.getenv("EMBEDDING_MODEL", 'sentence-transformers/all-MiniLM-L6-v2')
            self.embedding_model = SentenceTransformer(model_name)
            self.embeddings_enabled = True
            logger.info(f"Loaded embedding model: {model_name}")

            # --- FIX: Initialize Supabase client using correct env vars ---
            # Use SUPABASE_URL and SUPABASE_SERVICE_KEY for write access
            supabase_url = os.getenv("SUPABASE_URL")
            supabase_service_key = os.getenv("SUPABASE_SERVICE_KEY") # Use service key

            if not supabase_url or not supabase_service_key:
                # Log a more specific error
                missing = []
                if not supabase_url: missing.append("SUPABASE_URL")
                if not supabase_service_key: missing.append("SUPABASE_SERVICE_KEY")
                raise ValueError(f"{', '.join(missing)} not found in environment for RAG system.")

            # Create the client using the service key
            self.supabase: Client = create_client(supabase_url, supabase_service_key)
            logger.info("RAG System Supabase client initialized with service key.")

        except ValueError as ve: # Catch specific ValueError
             logger.error(f"Failed to initialize RAGSystem Supabase client: {ve}")
             self.embeddings_enabled = False # Disable if client fails
        except Exception as e:
            logger.error(f"Failed to initialize RAGSystem: {e}", exc_info=True)
            self.embeddings_enabled = False

    async def search_similar(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Encodes a query and searches for similar articles in the vector database.

        Args:
            query: Query text to search for.
            top_k: Number of top results to return.

        Returns:
            A list of similar articles with their similarity scores.
        """
        if not self.embeddings_enabled or not self.supabase: # Check supabase client too
            logger.warning("Search failed: Embeddings or Supabase client are not enabled/initialized.")
            return []

        try:
            # Generate embedding for the query
            loop = asyncio.get_event_loop()
            query_embedding = await loop.run_in_executor(
                None,
                self.embedding_model.encode,
                query
            )

            # Call the database function to find matching articles
            result = self.supabase.rpc('match_articles', {
                'query_embedding': query_embedding.tolist(),
                'match_threshold': 0.7,  # Adjust this threshold as needed
                'match_count': top_k
            }).execute()

            # Check for errors in the RPC call result
            if hasattr(result, 'error') and result.error:
                logger.error(f"RPC match_articles failed: {result.error}")
                return []

            return result.data if result.data else []

        except Exception as e:
            logger.error(f"Vector search failed: {str(e)}", exc_info=True)
            return []

    async def add_article(self, article: Dict[str, Any]) -> bool:
        """
        Adds a new article to the knowledge base, calculating its embedding.

        Args:
            article: Dictionary with title, content, etc.

        Returns:
            True if successful, False otherwise.
        """
        if not self.embeddings_enabled or not self.supabase: # Check supabase client too
            logger.warning("Could not add article: Embeddings or Supabase client are not enabled/initialized.")
            return False

        try:
            # Combine title and content for a richer embedding
            text_to_embed = f"{article['title']} {article['content']}"

            loop = asyncio.get_event_loop()
            embedding = await loop.run_in_executor(
                None,
                self.embedding_model.encode,
                text_to_embed
            )

            # Prepare data for insertion into the database
            db_record = {
                'title': article['title'],
                'content': article['content'],
                'source_url': article.get('source_url'),
                'source_type': article.get('source_type'),
                'verified': article.get('verified', False),
                'embedding': embedding.tolist()
            }

            # --- Use the service client to insert (bypasses RLS) ---
            insert_result = self.supabase.table('knowledge_base').insert(db_record).execute()

            # Check for errors after insert
            if hasattr(insert_result, 'error') and insert_result.error:
                 # Raise the error to be caught by the endpoint handler
                 raise Exception(f"{insert_result.error}") # Include specific error message

            logger.info(f"Successfully added and indexed article: {article['title']}")
            return True

        except Exception as e:
            # Re-raise the exception so the endpoint returns 500 with details
            logger.error(f"Failed to add article to knowledge base: {str(e)}", exc_info=True)
            raise e # Re-raise exception
