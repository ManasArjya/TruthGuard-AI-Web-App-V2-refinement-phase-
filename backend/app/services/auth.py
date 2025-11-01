"""
Authentication service for TruthGuard AI
Handles JWT token verification and user authentication with Supabase
"""

from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
# from jose import JWTError, jwt # Not needed if using supabase.auth.get_user
from supabase import create_client, Client
import os
from dotenv import load_dotenv # Import load_dotenv
from typing import Optional, Dict, Any
from pydantic import BaseModel # Corrected import

# --- Load environment variables first ---
load_dotenv()

# --- Initialize Supabase client using standard env vars ---
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY") # Use the public ANON key

if not supabase_url or not supabase_key:
    # This check ensures the auth service doesn't start without config
    missing = []
    if not supabase_url:
        missing.append("SUPABASE_URL")
    if not supabase_key:
        missing.append("SUPABASE_KEY")
    # Raise a more specific error or log; raising ValueError might halt startup.
    # Consider logging an error and letting it fail later if client is used.
    print(f"ERROR: Auth service could not initialize Supabase client. Missing: {', '.join(missing)}")
    # Initialize as None or raise error depending on desired behavior at startup
    supabase: Optional[Client] = None
    # raise ValueError(f"Auth Service: {', '.join(missing)} must be set.")
else:
    supabase: Client = create_client(supabase_url, supabase_key)

security = HTTPBearer()

class User(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    is_expert: bool = False
    expert_domain: Optional[str] = None

async def verify_token(token: str) -> Dict[str, Any]:
    """
    Verify JWT token using the initialized Supabase client
    """
    if not supabase: # Check if client initialized correctly
         raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service not available."
         )

    try:
        # Use the Supabase client's auth method
        user_response = supabase.auth.get_user(token)

        # Check the structure of the response
        if user_response and hasattr(user_response, 'user') and user_response.user:
            # Access user attributes safely
            user_id = getattr(user_response.user, 'id', None)
            user_email = getattr(user_response.user, 'email', None)
            user_metadata = getattr(user_response.user, 'user_metadata', {}) or {} # Ensure it's a dict

            if user_id and user_email:
                return {
                    "id": str(user_id), # Ensure ID is string
                    "email": user_email,
                    "user_metadata": user_metadata
                }
            else:
                 # Log unexpected user object structure
                 print(f"Auth Warning: User object structure unexpected: {user_response.user}")
                 raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user data in token")

        else:
            # Log the invalid response
            print(f"Auth Debug: supabase.auth.get_user returned invalid response for token: {user_response}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials"
            )

    except Exception as e:
        # Log the specific exception
        print(f"Auth Error: Exception during token verification: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token verification failed: {str(e)}" # Provide more context if safe
        )

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Get current authenticated user from token."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    token = credentials.credentials
    user_data = await verify_token(token) # verify_token fetches necessary data

    metadata = user_data.get("user_metadata", {})

    return User(
        id=user_data["id"],
        email=user_data["email"],
        full_name=metadata.get("full_name"),
        # Safely get boolean, default to False
        is_expert=bool(metadata.get("is_expert", False)),
        expert_domain=metadata.get("expert_domain")
    )

async def get_current_user_optional(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[User]:
    """
    Get current user if authenticated, otherwise return None.
    Handles potential dependency injection failure gracefully.
    """
    if not credentials:
        return None

    try:
        # Re-use the logic from get_current_user
        token = credentials.credentials
        user_data = await verify_token(token)
        metadata = user_data.get("user_metadata", {})
        return User(
            id=user_data["id"],
            email=user_data["email"],
            full_name=metadata.get("full_name"),
            is_expert=bool(metadata.get("is_expert", False)),
            expert_domain=metadata.get("expert_domain")
        )
    except HTTPException as e:
         # Log the specific HTTP exception details if needed
         # print(f"Optional Auth Debug: Verification failed with status {e.status_code}, detail: {e.detail}")
         return None
    except Exception as e:
         # Log unexpected errors during optional auth
         print(f"Optional Auth Error: Unexpected error: {e}")
         return None

