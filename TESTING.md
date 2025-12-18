# Testing Guide

This document provides comprehensive testing procedures for the XSS Risk Detector extension and service.

---

## Table of Contents

1. [Extension Testing](#extension-testing)
2. [Service Testing](#service-testing)
3. [Integration Testing](#integration-testing)
4. [Test Cases](#test-cases)
5. [Expected Results](#expected-results)

---

## Extension Testing

### Pre-requisites
- Microsoft Edge browser installed
- Extension loaded via "Load unpacked"
- DevTools available (F12)

### Test 1: Extension Installation

**Steps:**
1. Open Edge and go to `edge://extensions/`
2. Enable Developer mode
3. Click "Load unpacked"
4. Select the `extension/` folder

**Expected Result:**
- Extension appears in list
- Icon shows in toolbar
- No error messages

**Debug:**
- If errors appear, check `edge://extensions/` for details
- Verify all files are present in `extension/` folder

---

### Test 2: Popup UI

**Steps:**
1. Visit any website (e.g., https://example.com)
2. Click extension icon

**Expected Result:**
- Popup opens (500px x ~600px)
- Shows risk badge (default: LOW)
- Shows current URL
- Shows evidence count
- Shows filter controls
- Shows action buttons

**Debug:**
- Right-click extension icon → Inspect popup
- Check Console for JavaScript errors

---

### Test 3: Static Signal Detection

**Steps:**
1. Create test HTML file:
```html
<!DOCTYPE html>
<html>
<body>
  <button onclick="alert('test')">Click</button>
  <a href="javascript:void(0)">Link</a>
  <script>console.log('inline');</script>
</body>
</html>
```
2. Open in Edge
3. Click extension icon

**Expected Result:**
- Evidence count: 3+
- Risk level: MEDIUM or HIGH
- Evidence list shows:
  - inline-event-handler (onclick)
  - javascript-protocol (href)
  - inline-script (script block)

**Debug:**
- Open page DevTools Console
- Look for `[XSS Detector]` messages
- Check if content script loaded

---

### Test 4: Runtime Sink Detection

**Steps:**
1. Open any page
2. Open browser console (F12)
3. Run: `eval("console.log('test')")`
4. Run: `document.write("test")`
5. Run: `document.body.innerHTML = "test"`
6. Click extension icon

**Expected Result:**
- New evidence items appear for each action
- Evidence types:
  - eval-call (HIGH)
  - document-write (MEDIUM)
  - innerhtml-set (MEDIUM)

**Debug:**
- Check content script is injected: look for hooks in console
- Verify evidence array in content script

---

### Test 5: Filtering and Sorting

**Steps:**
1. Open a page with multiple evidence items
2. Click extension icon
3. Test filters:
   - Select "High" severity
   - Select specific type
   - Change sort order

**Expected Result:**
- Evidence list updates immediately
- Filtering works correctly
- Sorting applies correctly

---

### Test 6: Export Report

**Steps:**
1. Open page with evidence
2. Click extension icon
3. Click "Export Report"
4. Choose save location

**Expected Result:**
- Download dialog appears
- JSON file downloads
- File contains:
  - metadata (url, timestamp, riskLevel)
  - evidence array
  - summary object

**Example Output:**
```json
{
  "metadata": {
    "url": "https://example.com",
    "timestamp": "2024-01-01T...",
    "evidenceCount": 5,
    "riskLevel": "medium",
    "riskScore": 35
  },
  "evidence": [...],
  "summary": {
    "severityCounts": {...},
    "typeCounts": {...}
  }
}
```

**Debug:**
- Check browser's Downloads permission
- Check console for download errors
- Verify `chrome.downloads` API is available

---

## Service Testing

### Pre-requisites
- Python 3.8+ installed
- Dependencies installed: `pip install -r service/requirements.txt`
- Port 8000 available

### Test 1: Service Startup

**Steps:**
```bash
cd service
python app.py
```

**Expected Result:**
```
INFO:__main__:OpenAI API key not found. Using heuristic analysis only.
INFO:     Uvicorn running on http://127.0.0.1:8000
```

**Debug:**
- Check port availability: `lsof -i :8000`
- Check Python version: `python --version`
- Reinstall dependencies if needed

---

### Test 2: Health Check Endpoint

**Steps:**
```bash
curl http://127.0.0.1:8000/
```

**Expected Result:**
```json
{
  "service": "XSS Risk Analysis Service",
  "status": "running",
  "version": "1.0.0",
  "openai_enabled": false
}
```

---

### Test 3: Analyze Endpoint - Minimal

**Steps:**
```bash
curl -X POST http://127.0.0.1:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {
      "url": "https://example.com",
      "timestamp": "2024-01-01T00:00:00Z",
      "evidenceCount": 0,
      "riskLevel": "low",
      "riskScore": 0
    },
    "evidence": []
  }'
```

**Expected Result:**
```json
{
  "risk_score": 0,
  "verdict": "Safe",
  "summary": "...",
  "explanation": [],
  "recommendations": [...],
  "supporting_evidence": []
}
```

---

### Test 4: Analyze Endpoint - High Risk

**Steps:**
```bash
curl -X POST http://127.0.0.1:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "metadata": {
      "url": "https://example.com",
      "timestamp": "2024-01-01T00:00:00Z",
      "evidenceCount": 3,
      "riskLevel": "high",
      "riskScore": 50
    },
    "evidence": [
      {
        "id": 1,
        "time": "2024-01-01T00:00:00Z",
        "type": "eval-call",
        "severity": "high",
        "location": {"url": "https://example.com"},
        "snippet": "eval(userInput)"
      },
      {
        "id": 2,
        "time": "2024-01-01T00:00:00Z",
        "type": "javascript-protocol",
        "severity": "high",
        "location": {"url": "https://example.com"},
        "snippet": "href=\"javascript:alert(1)\""
      },
      {
        "id": 3,
        "time": "2024-01-01T00:00:00Z",
        "type": "innerhtml-set",
        "severity": "medium",
        "location": {"url": "https://example.com"},
        "snippet": "element.innerHTML = data"
      }
    ]
  }'
```

**Expected Result:**
```json
{
  "risk_score": 60-80,
  "verdict": "High Risk",
  "summary": "Analysis of 3 evidence items...",
  "explanation": [
    "Found 2 high-severity evidence items...",
    "Dynamic code execution via eval()...",
    "..."
  ],
  "recommendations": [
    "Eliminate use of eval()...",
    "Replace javascript: protocol URLs...",
    "..."
  ],
  "supporting_evidence": [...]
}
```

---

### Test 5: OpenAI Integration (Optional)

**Pre-requisites:**
- Create `.env` file from `.env.example`
- Add valid OpenAI API key

**Steps:**
1. Configure `.env`:
```bash
OPENAI_API_KEY=sk-your-actual-key
```
2. Restart service
3. Run analyze request (same as Test 4)

**Expected Result:**
- Service log shows: `INFO:__main__:OpenAI integration enabled`
- Response includes AI-enhanced summary
- Falls back to heuristic if OpenAI fails

---

## Integration Testing

### Test 1: Extension + Service Integration

**Pre-requisites:**
- Service running on http://127.0.0.1:8000
- Extension loaded in Edge

**Steps:**
1. Visit test page with XSS risks
2. Click extension icon
3. Verify evidence is shown
4. Click "Analyze with Service"

**Expected Result:**
- "Service Analysis" section appears
- Shows risk score (0-100)
- Shows verdict
- Shows summary text

**Debug:**
- Open popup DevTools (right-click icon → Inspect popup)
- Check Console for fetch errors
- Verify service is running: `curl http://127.0.0.1:8000/`
- Check CORS headers in Network tab

---

### Test 2: Error Handling - Service Down

**Steps:**
1. Stop the service (Ctrl+C)
2. Open extension popup
3. Click "Analyze with Service"

**Expected Result:**
- Alert appears: "Failed to analyze with service..."
- Error message indicates connection failure
- Extension remains functional

---

### Test 3: Error Handling - Invalid Data

**Steps:**
1. Modify popup.js temporarily to send invalid data
2. Click "Analyze with Service"

**Expected Result:**
- Service returns 422 or 500 error
- Extension shows user-friendly error
- No crash

---

## Test Cases

### Test Case Matrix

| Test ID | Feature | Input | Expected Output | Priority |
|---------|---------|-------|-----------------|----------|
| TC01 | Static Detection | inline onclick | Detected as medium | High |
| TC02 | Static Detection | javascript: URL | Detected as high | High |
| TC03 | Static Detection | inline script | Detected as low | Medium |
| TC04 | Runtime Hook | eval() call | Detected as high | High |
| TC05 | Runtime Hook | innerHTML set | Detected as medium | High |
| TC06 | Runtime Hook | document.write | Detected as medium | High |
| TC07 | Filtering | Filter by type | Show matching only | Medium |
| TC08 | Sorting | Sort by severity | High first | Medium |
| TC09 | Export | Click export | JSON download | High |
| TC10 | Service Call | Click analyze | Show results | High |
| TC11 | Risk Scoring | 0 evidence | Risk: Low, Score: 0 | High |
| TC12 | Risk Scoring | 1 eval() | Risk: Medium, Score: 30 | High |
| TC13 | Risk Scoring | 5+ high severity | Risk: High, Score: 80+ | High |

---

## Expected Results

### Risk Score Mapping

| Evidence Count | Types | Expected Risk Level | Expected Score |
|----------------|-------|---------------------|----------------|
| 0 | None | Low | 0 |
| 1-2 | inline-script | Low | 2-6 |
| 1 | eval, Function | Medium | 30 |
| 2-3 | innerHTML, onclick | Medium | 20-40 |
| 3+ | eval, javascript: | High | 60+ |
| 5+ | Mixed high severity | High/Critical | 80+ |

### Verdict Mapping

| Score Range | Verdict |
|-------------|---------|
| 0-9 | Safe |
| 10-29 | Low Risk |
| 30-59 | Medium Risk |
| 60-79 | High Risk |
| 80-100 | Critical |

---

## Performance Benchmarks

### Extension
- Content script injection: < 100ms
- Evidence collection: < 500ms
- Popup load: < 200ms
- Export generation: < 100ms

### Service
- Analyze endpoint (heuristic): < 100ms
- Analyze endpoint (OpenAI): 2-5 seconds

---

## Troubleshooting Guide

### Extension Issues

**Problem:** No evidence detected
- **Solution:** Refresh page after loading extension
- **Solution:** Check content script injection in DevTools

**Problem:** Export fails
- **Solution:** Check downloads permission
- **Solution:** Try different file location

**Problem:** Popup doesn't open
- **Solution:** Check for JavaScript errors
- **Solution:** Reload extension

### Service Issues

**Problem:** Service won't start
- **Solution:** Check port 8000 availability
- **Solution:** Verify Python version
- **Solution:** Reinstall dependencies

**Problem:** CORS errors
- **Solution:** Verify service is on 127.0.0.1
- **Solution:** Check Origin header in request

**Problem:** OpenAI timeout
- **Solution:** Check API key validity
- **Solution:** Check internet connection
- **Solution:** Service will fall back to heuristic

---

## Test Automation (Future)

Potential test automation approaches:

1. **Extension Tests:**
   - Selenium/Playwright for UI testing
   - Chrome DevTools Protocol for extension testing
   - Jest for popup.js unit tests

2. **Service Tests:**
   - pytest for Python unit tests
   - FastAPI TestClient for endpoint tests
   - Mock OpenAI responses

3. **Integration Tests:**
   - End-to-end scenarios
   - Load testing with ab or locust

---

## Test Report Template

```markdown
# Test Report - [Date]

**Tester:** [Name]
**Version:** 1.0.0
**Environment:** Edge [Version] / Python [Version]

## Summary
- Total Tests: X
- Passed: Y
- Failed: Z
- Blocked: W

## Test Results

### TC01 - Static Detection - onclick
- Status: PASS
- Evidence: Detected correctly as medium severity
- Notes: None

[... more test cases ...]

## Issues Found
1. [Issue description]
2. [Issue description]

## Recommendations
- [Recommendation 1]
- [Recommendation 2]
```

---

## Conclusion

This testing guide provides comprehensive coverage of all major features. For production deployment, consider implementing automated testing and continuous integration.
