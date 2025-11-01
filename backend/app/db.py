import os
from supabase import create_client, Client
from dotenv import load_dotenv # Import load_dotenv

# Load environment variables from .env file, if present
load_dotenv() 

# --- Use standard variable names ---
supabase_url = os.getenv("SUPABASE_URL") 
supabase_key = os.getenv("SUPABASE_KEY") # Use the public ANON key for the main client

if not supabase_url or not supabase_key:
    # Provide more specific error messages
    missing = []
    if not supabase_url:
        missing.append("SUPABASE_URL")
    if not supabase_key:
        missing.append("SUPABASE_KEY")
    raise ValueError(f"{', '.join(missing)} must be set in environment variables.")

# Create the main client (using ANON key)
supabase: Client = create_client(supabase_url, supabase_key)

# Export the key separately for use in resetting auth if needed (e.g., in claims.py)
# Note: It's generally better practice to fetch this from os.getenv() again where needed, 
# but exporting it here if claims.py relies on importing it directly from db.py
anon_key = supabase_key 
