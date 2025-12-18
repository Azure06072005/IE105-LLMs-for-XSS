# Installation & Setup Guide

## Prerequisites

- **Microsoft Edge** (Chromium-based) or **Google Chrome** browser
- **Python 3.8+** (for the analysis service)
- **pip** (Python package manager)

---

## Extension Installation

### Step 1: Get the Code

Clone or download this repository:
```bash
git clone https://github.com/Azure06072005/IE105-LLMs-for-XSS.git
cd IE105-LLMs-for-XSS
```

### Step 2: Load Extension in Edge

1. Open Microsoft Edge browser
2. Navigate to `edge://extensions/`
3. Enable **Developer mode**:
   - Look for the toggle switch in the bottom-left corner
   - Turn it ON

4. Click **"Load unpacked"** button (top-left area)

5. Navigate to and select the `extension/` folder from this repository
   - Example: `C:\Users\YourName\IE105-LLMs-for-XSS\extension`

6. The extension should now appear in your extensions list
   - Look for "XSS Risk Detector" with a red icon
   - The icon should also appear in your browser toolbar

### Step 3: Verify Installation

1. Visit any website (e.g., https://example.com)
2. Click the extension icon in the toolbar
3. The popup should open showing:
   - Risk level badge
   - Current URL
   - Evidence count (may be 0 on simple pages)

**Success!** The extension is now active and monitoring the current tab.

---

## Service Installation (Optional)

The local analysis service provides enhanced risk assessment. It's optional but recommended.

### Step 1: Install Python Dependencies

```bash
cd service
pip install -r requirements.txt
```

This installs:
- FastAPI (web framework)
- Uvicorn (ASGI server)
- Pydantic (data validation)
- python-dotenv (environment variables)
- openai (optional, for LLM analysis)

### Step 2: Configure Environment (Optional)

To enable OpenAI-powered analysis:

```bash
cd service
cp .env.example .env
```

Edit `.env` and add your OpenAI API key:
```
OPENAI_API_KEY=sk-your-actual-api-key-here
```

**Note:** The service works without OpenAI using heuristic analysis.

### Step 3: Start the Service

```bash
cd service
python app.py
```

Or using uvicorn directly:
```bash
uvicorn app:app --host 127.0.0.1 --port 8000
```

You should see:
```
INFO:     Started server process
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### Step 4: Verify Service

Open a new terminal and test:
```bash
curl http://127.0.0.1:8000/
```

Expected response:
```json
{
  "service": "XSS Risk Analysis Service",
  "status": "running",
  "version": "1.0.0",
  "openai_enabled": false
}
```

**Success!** The service is running and ready to analyze reports.

---

## Testing the Setup

### Test 1: Basic Detection

1. Open the demo page (located at `/tmp/test-xss-demo/demo.html`) or create a simple HTML file:

```html
<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
  <button onclick="alert('test')">Click Me</button>
  <script>console.log('inline script');</script>
</body>
</html>
```

2. Open this file in Edge
3. Click the extension icon
4. You should see evidence items detected

### Test 2: Export Report

1. With evidence showing in the popup
2. Click **"Export Report"** button
3. Choose a location to save the JSON file
4. Open the file to verify it contains the evidence data

### Test 3: Service Analysis

**Prerequisites:** Service must be running (see above)

1. With evidence showing in the popup
2. Click **"Analyze with Service"** button
3. Wait a moment (it calls http://127.0.0.1:8000/analyze)
4. You should see:
   - "Service Analysis" section appears
   - Risk score (0-100)
   - Verdict (Safe/Low/Medium/High/Critical)
   - Summary text

If you see an error, make sure:
- Service is running on port 8000
- No firewall is blocking localhost connections
- Check browser console for detailed errors (F12)

---

## Troubleshooting

### Extension Issues

**Problem:** Extension doesn't appear after loading

**Solutions:**
- Ensure you selected the `extension/` folder, not the root folder
- Check `edge://extensions/` for error messages
- Click "Reload" on the extension card
- Check that all required files exist in `extension/`

---

**Problem:** "No evidence found" on pages that should have signals

**Solutions:**
- Refresh the page after installing the extension
- Click "Refresh" button in the popup
- Open DevTools (F12) and check Console for errors
- Some sites use CSP that may block the content script

---

**Problem:** Export button doesn't work

**Solutions:**
- Check that Downloads permission is granted
- Try a different download location
- Check browser download settings
- Look in Edge's download folder for the file

---

### Service Issues

**Problem:** Service won't start

**Solutions:**
```bash
# Check Python version (need 3.8+)
python3 --version

# Reinstall dependencies
pip install --upgrade -r requirements.txt

# Try a different port
uvicorn app:app --host 127.0.0.1 --port 8001
```

If using port 8001, update `extension/popup/popup.js` line ~250:
```javascript
const response = await fetch('http://127.0.0.1:8001/analyze', {
```

---

**Problem:** "Analyze with Service" fails

**Solutions:**
- Verify service is running: `curl http://127.0.0.1:8000/`
- Check browser console (F12) for CORS or network errors
- Ensure URL in popup.js matches service address
- Try restarting the service

---

**Problem:** OpenAI integration not working

**Solutions:**
- Verify API key is in `.env` file (not `.env.example`)
- Check API key is valid and has credits
- Restart the service after adding API key
- Check service logs for OpenAI errors
- Service will fall back to heuristic analysis on errors

---

## Uninstalling

### Remove Extension

1. Go to `edge://extensions/`
2. Find "XSS Risk Detector"
3. Click "Remove"
4. Confirm removal

### Remove Service

1. Stop the service (Ctrl+C in the terminal)
2. Delete the repository folder
3. Optionally uninstall Python packages:
```bash
pip uninstall fastapi uvicorn pydantic python-dotenv openai
```

---

## Next Steps

- Read the main [README.md](../README.md) for detailed documentation
- Check [service/README.md](../service/README.md) for API details
- Explore the source code to understand how it works
- Contribute improvements via GitHub pull requests

---

## Getting Help

If you encounter issues:

1. Check this troubleshooting guide
2. Review browser console for errors (F12)
3. Check service logs if using the service
4. Open a GitHub issue with:
   - Description of the problem
   - Browser version
   - Error messages
   - Steps to reproduce

---

## Security Notes

⚠️ **Important:**
- This tool is for educational/research purposes
- Extension has access to active tab content
- Service only accepts connections from localhost
- No data is sent to external servers (except optional OpenAI)
- Review the code before using on sensitive sites
- Do not use on pages with sensitive information unless you trust the tool

---

Happy testing! 🔍
