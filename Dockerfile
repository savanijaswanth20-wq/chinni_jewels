FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Set Python environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Copy backend source code
COPY backend/app /app/app
COPY backend/tests /app/tests

# Copy static frontend files for FastAPI static mounting
COPY index.html admin.html checkout.html product.html stock.html success.html /app/static/
COPY assets /app/static/assets
COPY css /app/static/css
COPY js /app/static/js

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT:-8000}/docs || exit 1

# Run uvicorn on $PORT (fallback to 8000)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
