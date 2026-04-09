# Use slim (not alpine) — supabase client and tiktoken have C extensions
# that fail to build on musl/alpine.

# ── Stage 1: dev ──────────────────────────────────────────────────────────────
# Source is bind-mounted at runtime — not copied here.
FROM python:3.12-slim AS dev
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
EXPOSE 8000
# python main.py invokes uvicorn with reload=True via the __main__ block
CMD ["python", "main.py"]

# ── Stage 2: prod ─────────────────────────────────────────────────────────────
FROM python:3.12-slim AS prod
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
