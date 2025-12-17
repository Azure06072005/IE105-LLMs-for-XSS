# XSS Risk Analysis Service

FastAPI-based local service for analyzing XSS evidence reports from the browser extension.

## Features

- **Heuristic Analysis**: Always available baseline scoring based on evidence type and severity
- **OpenAI Integration**: Optional LLM-powered analysis when API key is configured
- **Local-only**: Runs on `127.0.0.1` for privacy and security
- **CORS Enabled**: Allows calls from browser extension

## Installation

1. **Install Python dependencies:**

```bash
cd service
pip install -r requirements.txt
```

2. **Configure OpenAI (Optional):**

Copy `.env.example` to `.env` and add your OpenAI API key:

```bash
cp .env.example .env
# Edit .env and add your API key
```

The service works without OpenAI, using heuristic analysis only.

## Running the Service

Start the service with uvicorn:

```bash
cd service
python app.py
```

Or using uvicorn directly:

```bash
uvicorn app:app --host 127.0.0.1 --port 8000 --reload
```

The service will be available at: `http://127.0.0.1:8000`

## API Documentation

Once running, visit:
- **Interactive API docs**: http://127.0.0.1:8000/docs
- **Alternative docs**: http://127.0.0.1:8000/redoc

## Endpoints

### GET `/`
Health check endpoint.

**Response:**
```json
{
  "service": "XSS Risk Analysis Service",
  "status": "running",
  "version": "1.0.0",
  "openai_enabled": false
}
```

### POST `/analyze`
Analyze XSS evidence report.

**Request Body:**
```json
{
  "metadata": {
    "url": "https://example.com",
    "timestamp": "2024-01-01T00:00:00Z",
    "evidenceCount": 5,
    "riskLevel": "medium",
    "riskScore": 25
  },
  "evidence": [
    {
      "id": 1,
      "time": "2024-01-01T00:00:00Z",
      "type": "eval-call",
      "severity": "high",
      "location": {"url": "https://example.com"},
      "snippet": "eval(userInput)"
    }
  ]
}
```

**Response:**
```json
{
  "risk_score": 75,
  "verdict": "High Risk",
  "summary": "Analysis of 5 evidence items...",
  "explanation": [
    "Found 2 high-severity evidence items...",
    "Dynamic code execution via eval()..."
  ],
  "recommendations": [
    "Eliminate use of eval()...",
    "Implement Content Security Policy..."
  ],
  "supporting_evidence": [
    {
      "type": "eval-call",
      "severity": "high",
      "snippet": "eval(userInput)"
    }
  ]
}
```

## Testing

Test the service with curl:

```bash
curl -X POST http://127.0.0.1:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {
      "url": "https://example.com",
      "timestamp": "2024-01-01T00:00:00Z",
      "evidenceCount": 1,
      "riskLevel": "low",
      "riskScore": 5
    },
    "evidence": [
      {
        "id": 1,
        "time": "2024-01-01T00:00:00Z",
        "type": "inline-script",
        "severity": "low",
        "location": {"url": "https://example.com"},
        "snippet": "console.log(\"hello\");"
      }
    ]
  }'
```

## Security Notes

- Service binds to `127.0.0.1` only (localhost)
- No data is persisted or logged externally
- OpenAI calls are optional and only when explicitly configured
- CORS is enabled for development; restrict in production if needed

## Troubleshooting

**Port already in use:**
```bash
# Change port in app.py or use:
uvicorn app:app --host 127.0.0.1 --port 8001
```

**OpenAI errors:**
- Check API key in `.env`
- Ensure `openai` package is installed
- Service falls back to heuristic analysis on errors

## Development

To run with auto-reload:
```bash
uvicorn app:app --reload --host 127.0.0.1 --port 8000
```
