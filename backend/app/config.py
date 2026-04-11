import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    openai_api_key: str = os.environ["OPENAI_API_KEY"]
    supabase_url: str = os.environ["SUPABASE_URL"]
    supabase_anon_key: str = os.environ["SUPABASE_ANON_KEY"]
    port: int = int(os.getenv("PORT", "8000"))
    # Telemetry (all have safe defaults for local dev without a collector)
    otel_endpoint: str = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://otel-collector:4317")
    otel_service_name: str = os.getenv("OTEL_SERVICE_NAME", "synapse-backend")
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    deployment_environment: str = os.getenv("DEPLOYMENT_ENVIRONMENT", "development")


settings = Settings()
