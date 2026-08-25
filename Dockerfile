FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Set Python path to include backend
ENV PYTHONPATH=/app/backend

# Copy backend source code
COPY backend /app/backend

# Copy static frontend files for FastAPI static mounting
COPY index.html admin.html checkout.html product.html stock.html success.html /app/
COPY assets /app/assets
COPY css /app/css
COPY js /app/js

EXPOSE 8000

# Run uvicorn on $PORT provided by Railway (fallback to 8000)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
