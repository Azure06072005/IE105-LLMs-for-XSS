# IE105 - LLMs for XSS Detection

This repository contains research and tools for detecting Cross-Site Scripting (XSS) vulnerabilities using machine learning and large language models.

## Components

### 1. Browser Extension (NEW)
A Microsoft Edge (Chromium) browser extension that detects XSS/DOM-XSS risk signals on web pages in real-time.

**Location:** `extension/`

**Features:**
- Real-time detection of XSS risk signals on the active tab
- Static DOM analysis (inline event handlers, `javascript:` URLs, inline scripts)
- Runtime sink hooks (eval, innerHTML, document.write, etc.)
- Risk scoring and evidence collection
- Export detailed JSON reports
- Integration with local analysis service

### 2. Local Analysis Service (NEW)
FastAPI-based service for advanced analysis of collected evidence.

**Location:** `service/`

**Features:**
- Heuristic-based risk scoring (always available)
- Optional OpenAI-powered analysis
- RESTful API for extension integration
- Privacy-focused (local-only, no data exfiltration)

### 3. Research Notebooks
Jupyter notebooks exploring CNN and LLM-based approaches to XSS detection.

**Location:** `LLM-for-XSS/`

---

## Quick Start - Browser Extension

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Azure06072005/IE105-LLMs-for-XSS.git
   cd IE105-LLMs-for-XSS
   ```

2. **Load the extension in Microsoft Edge:**
   - Open Edge and navigate to `edge://extensions/`
   - Enable "Developer mode" (toggle in bottom left)
   - Click "Load unpacked"
   - Select the `extension/` folder from this repository
   - The extension icon should appear in your toolbar

### Usage

1. **Visit any website** (e.g., https://example.com)

2. **Click the extension icon** to open the popup

3. **View evidence:**
   - Risk level badge (Low/Medium/High)
   - Evidence count and current URL
   - List of detected XSS risk signals
   - Filter and sort evidence by type, severity, or time

4. **Export report:**
   - Click "Export Report" to download a JSON file with all evidence
   - File saved via browser downloads API

5. **Analyze with service** (optional, requires running service):
   - Start the local service (see below)
   - Click "Analyze with Service"
   - View enhanced risk assessment with recommendations

---

## Quick Start - Analysis Service

### Installation

1. **Install Python dependencies:**
   ```bash
   cd service
   pip install -r requirements.txt
   ```

2. **Optional - Configure OpenAI:**
   ```bash
   cp .env.example .env
   # Edit .env and add your OpenAI API key
   ```
   
   Note: Service works without OpenAI using heuristic analysis.

### Running the Service

```bash
cd service
python app.py
```

Or with uvicorn:
```bash
uvicorn app:app --host 127.0.0.1 --port 8000
```

Service will be available at: http://127.0.0.1:8000

**API Documentation:** http://127.0.0.1:8000/docs

---

## Testing the Extension

### Demo Sites with XSS Risks

Test the extension on pages with known XSS patterns:

1. **Inline event handlers:**
   - Create a test HTML file with `<button onclick="alert('test')">Click</button>`
   - The extension should detect inline event handlers

2. **Dynamic script execution:**
   - Pages using `eval()`, `Function()`, or `document.write()`
   - Open browser console and run: `eval("console.log('test')")`
   - Check extension popup for evidence

3. **Real-world testing:**
   - Visit various websites
   - Check for inline scripts, event handlers, etc.
   - Export reports for analysis

### Expected Behavior

- **Low Risk:** Few inline scripts, no dangerous patterns
- **Medium Risk:** Some inline event handlers, innerHTML usage
- **High Risk:** eval() calls, javascript: URLs, extensive DOM manipulation

---

## Extension Architecture

### Manifest V3 Components

**manifest.json:**
- Permissions: `activeTab`, `scripting`, `downloads`, `storage`
- Service worker: `src/background.js`
- Content script: `src/content.js` (injected on demand)

**Background Service Worker** (`src/background.js`):
- Manages extension lifecycle
- Handles message passing between popup and content script

**Content Script** (`src/content.js`):
- Runs in page context
- Collects static DOM signals
- Hooks runtime sinks (eval, innerHTML, etc.)
- Stores evidence with timestamps and stack traces

**Popup UI** (`popup/`):
- Displays evidence and risk assessment
- Provides filtering and sorting
- Exports JSON reports
- Calls analysis service

### Evidence Types

| Type | Severity | Description |
|------|----------|-------------|
| `eval-call` | High | Dynamic code execution via eval() |
| `function-constructor` | High | Function() constructor usage |
| `javascript-protocol` | High | javascript: URLs in href/src |
| `settimeout-string` | High | setTimeout with string code |
| `setinterval-string` | High | setInterval with string code |
| `document-write` | Medium | document.write() usage |
| `innerhtml-set` | Medium | innerHTML property setter |
| `outerhtml-set` | Medium | outerHTML property setter |
| `insertadjacenthtml` | Medium | insertAdjacentHTML() method |
| `inline-event-handler` | Medium | Inline event attributes (onclick, etc.) |
| `inline-script` | Low | Inline <script> blocks |

---

## Service Architecture

### Analysis Pipeline

1. **Receive report** from extension with evidence list
2. **Heuristic analysis** (baseline, always available):
   - Weight evidence by type and severity
   - Calculate risk score (0-100)
   - Generate verdict and recommendations
3. **OpenAI enhancement** (optional):
   - Send evidence summary to GPT-3.5
   - Get detailed security insights
   - Combine with heuristic results
4. **Return response** with score, verdict, summary, explanations, and recommendations

### API Response Format

```json
{
  "risk_score": 65,
  "verdict": "High Risk",
  "summary": "Analysis of 12 evidence items from https://example.com...",
  "explanation": [
    "Found 3 high-severity evidence items indicating dangerous JavaScript execution patterns.",
    "Dynamic code execution via eval() or Function() constructor detected - highest XSS risk."
  ],
  "recommendations": [
    "Eliminate use of eval() and Function() constructor.",
    "Implement Content Security Policy (CSP) to prevent inline script execution.",
    "Validate and sanitize all user inputs on both client and server side."
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

---

## Privacy and Security

### Privacy-First Design

- ✅ **Local-only operation:** No data sent to external servers except localhost service
- ✅ **User consent:** Service analysis only on explicit user action
- ✅ **No tracking:** No analytics, telemetry, or user behavior tracking
- ✅ **User-controlled exports:** Reports saved by user, not automatically uploaded
- ✅ **Minimal permissions:** Uses `activeTab` instead of broad host permissions

### Security Considerations

- Extension runs with minimal privileges
- Service binds to 127.0.0.1 only (not accessible remotely)
- Content Security Policy prevents extension from loading remote scripts
- Evidence collection is read-only (does not modify page behavior)
- OpenAI integration is optional and requires explicit configuration

### Disclaimer

⚠️ **This is a research and educational tool.** 

- The extension detects potential XSS risks but cannot guarantee complete coverage
- False positives may occur (legitimate uses of innerHTML, eval, etc.)
- Should be used alongside other security tools and manual code review
- Not a substitute for proper security testing and secure coding practices

---

## Development

### Extension Development

**Reload extension after changes:**
1. Go to `edge://extensions/`
2. Click "Reload" under the extension

**Debug content script:**
- Open DevTools on the target page
- Check Console for `[XSS Detector]` messages

**Debug popup:**
- Right-click extension icon → "Inspect popup"

**Debug background script:**
- Go to `edge://extensions/`
- Click "Inspect views: service worker"

### Service Development

**Run with auto-reload:**
```bash
uvicorn app:app --reload --host 127.0.0.1 --port 8000
```

**Test with curl:**
```bash
curl http://127.0.0.1:8000/
```

---

## Repository Structure

```
IE105-LLMs-for-XSS/
├── extension/              # Browser extension
│   ├── manifest.json       # Extension manifest (Manifest V3)
│   ├── src/
│   │   ├── background.js   # Service worker
│   │   └── content.js      # Evidence collector
│   ├── popup/
│   │   ├── popup.html      # Popup UI
│   │   ├── popup.js        # Popup logic
│   │   └── popup.css       # Popup styles
│   └── assets/             # Extension icons
│
├── service/                # Analysis service
│   ├── app.py              # FastAPI application
│   ├── requirements.txt    # Python dependencies
│   ├── .env.example        # Environment template
│   └── README.md           # Service documentation
│
├── LLM-for-XSS/            # Research notebooks
│   ├── Dataset/
│   └── *.ipynb
│
├── Article/                # Research papers
├── Slide/                  # Presentations
└── README.md               # This file
```

---

## Troubleshooting

### Extension Issues

**Extension not loading:**
- Ensure you selected the `extension/` folder, not the repository root
- Check `edge://extensions/` for error messages
- Verify all files are present (manifest.json, icons, scripts)

**No evidence showing:**
- Refresh the page after installing the extension
- Click "Refresh" in the popup
- Check browser console for errors
- Some pages may have legitimate security features that block content scripts

**Export not working:**
- Ensure `downloads` permission is granted
- Check browser's download settings
- Try a different save location

### Service Issues

**Port already in use:**
```bash
uvicorn app:app --host 127.0.0.1 --port 8001
```
Update extension popup.js to match new port.

**CORS errors:**
- Ensure service is running on 127.0.0.1
- Check browser console for detailed error messages

**OpenAI errors:**
- Verify API key in `.env`
- Check API key has sufficient credits
- Service will fall back to heuristic analysis

---

## Contributing

Contributions are welcome! Areas for improvement:

- Additional sink hooks and detection patterns
- Enhanced risk scoring algorithms
- UI/UX improvements
- Support for other browsers (Chrome, Firefox)
- Machine learning model integration
- Performance optimizations

---

## License

This project is for educational and research purposes.

---

## Acknowledgments

- Part of IE105 course project
- Research on XSS detection using LLMs and CNNs
- Built with FastAPI, Chrome Extensions API, and OpenAI

---

## Contact

For questions or issues, please open a GitHub issue.
