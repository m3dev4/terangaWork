FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential pkg-config default-libmysqlclient-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir --timeout 120 --retries 5 -r requirements.txt

COPY . .

RUN sed -i 's/\r$//' entrypoint.sh && chmod +x entrypoint.sh \
    && useradd -m appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

ENTRYPOINT ["./entrypoint.sh"]

CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "config.asgi:application"]
