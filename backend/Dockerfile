# ==============================================================================
# CHINNI JEWELS — Production Backend Dockerfile (FastAPI + Uvicorn)
# ==============================================================================
FROM python:3.11-slim AS builder

WORKDIR /app

# Install compilation & database client dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies in isolated wheels directory
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# ------------------------------------------------------------------------------
# Final Runtime Stage
# ------------------------------------------------------------------------------
FROM python:3.11-slim AS runner

WORKDIR /app

# Install minimal runtime libraries (libpq5 for PostgreSQL, curl for healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -g 1000 appgroup && \
    useradd -u 1000 -g appgroup -m -s /bin/bash appuser

# Copy installed python dependencies from builder stage
COPY --from=builder /root/.local /home/appuser/.local

# Environment variables
ENV PATH=/home/appuser/.local/bin:$PATH
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PORT=8000

# Copy backend application source code
COPY --chown=appuser:appgroup app /app/app
COPY --chown=appuser:appgroup tests /app/tests
COPY --chown=appuser:appgroup assets /app/assets

# Create upload directory with proper permissions
RUN mkdir -p /app/assets/uploads && chown -R appuser:appgroup /app/assets

USER appuser

EXPOSE 8000

# Container healthcheck
HEALTHCHECK --interval=20s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT}/docs || exit 1

# Start Uvicorn ASGI server
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
