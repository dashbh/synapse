import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    openai_api_key: str = os.environ["OPENAI_API_KEY"]
    supabase_url: str = os.environ["SUPABASE_URL"]
    supabase_anon_key: str = os.environ["SUPABASE_ANON_KEY"]
    port: int = int(os.getenv("PORT", "8000"))


settings = Settings()
