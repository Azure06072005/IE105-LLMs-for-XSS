"""
FastAPI Service for XSS Risk Analysis
Provides both heuristic and LLM-powered analysis of XSS evidence reports
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
import os
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="XSS Risk Analysis Service",
    description="Analyzes XSS evidence reports and provides risk scoring",
    version="1.0.0"
)

# Enable CORS for localhost (extension calls)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class Evidence(BaseModel):
    id: int
    time: str
    type: str
    severity: str
    location: Dict[str, Any]
    snippet: str
    stack: Optional[str] = None

class ReportMetadata(BaseModel):
    url: str
    timestamp: str
    evidenceCount: int
    riskLevel: str
    riskScore: int

class AnalysisReport(BaseModel):
    metadata: ReportMetadata
    evidence: List[Evidence]

class AnalysisResponse(BaseModel):
    risk_score: int = Field(..., ge=0, le=100, description="Risk score from 0-100")
    verdict: str = Field(..., description="Overall verdict (Safe/Low Risk/Medium Risk/High Risk/Critical)")
    summary: str = Field(..., description="Summary of findings")
    explanation: List[str] = Field(..., description="Detailed explanation of risk factors")
    recommendations: List[str] = Field(..., description="Security recommendations")
    supporting_evidence: List[Dict[str, Any]] = Field(..., description="Key evidence items")

# Check for OpenAI API key
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
USE_OPENAI = OPENAI_API_KEY is not None

if USE_OPENAI:
    try:
        import openai
        openai.api_key = OPENAI_API_KEY
        logger.info("OpenAI integration enabled")
    except ImportError:
        logger.warning("OpenAI package not installed. Install with: pip install openai")
        USE_OPENAI = False
else:
    logger.info("OpenAI API key not found. Using heuristic analysis only.")

def heuristic_analysis(report: AnalysisReport) -> AnalysisResponse:
    """
    Baseline heuristic analysis (always available)
    """
    evidence = report.evidence
    
    # Calculate risk score
    severity_weights = {"high": 15, "medium": 8, "low": 3}
    type_weights = {
        "eval-call": 2.0,
        "function-constructor": 2.0,
        "javascript-protocol": 1.8,
        "settimeout-string": 1.5,
        "setinterval-string": 1.5,
        "document-write": 1.3,
        "innerhtml-set": 1.2,
        "outerhtml-set": 1.2,
        "insertadjacenthtml": 1.2,
        "inline-event-handler": 1.0,
        "inline-script": 0.5,
    }
    
    base_score = 0
    type_counts = {}
    severity_counts = {"high": 0, "medium": 0, "low": 0}
    
    for item in evidence:
        weight = severity_weights.get(item.severity, 0)
        type_mult = type_weights.get(item.type, 1.0)
        base_score += weight * type_mult
        
        type_counts[item.type] = type_counts.get(item.type, 0) + 1
        severity_counts[item.severity] = severity_counts.get(item.severity, 0) + 1
    
    # Normalize to 0-100
    risk_score = min(100, int(base_score))
    
    # Determine verdict
    if risk_score >= 80:
        verdict = "Critical"
    elif risk_score >= 60:
        verdict = "High Risk"
    elif risk_score >= 30:
        verdict = "Medium Risk"
    elif risk_score >= 10:
        verdict = "Low Risk"
    else:
        verdict = "Safe"
    
    # Generate explanation
    explanation = []
    if severity_counts["high"] > 0:
        explanation.append(f"Found {severity_counts['high']} high-severity evidence items indicating dangerous JavaScript execution patterns.")
    if severity_counts["medium"] > 0:
        explanation.append(f"Detected {severity_counts['medium']} medium-severity signals that could enable DOM manipulation attacks.")
    if severity_counts["low"] > 0:
        explanation.append(f"Identified {severity_counts['low']} low-severity indicators worth monitoring.")
    
    # Type-specific explanations
    if type_counts.get("eval-call", 0) > 0 or type_counts.get("function-constructor", 0) > 0:
        explanation.append("Dynamic code execution via eval() or Function() constructor detected - highest XSS risk.")
    if type_counts.get("javascript-protocol", 0) > 0:
        explanation.append("JavaScript protocol URLs found - can execute arbitrary code when clicked.")
    if type_counts.get("document-write", 0) > 0:
        explanation.append("document.write() usage detected - can be exploited for injection attacks.")
    if type_counts.get("innerhtml-set", 0) > 0 or type_counts.get("outerhtml-set", 0) > 0:
        explanation.append("Direct HTML manipulation detected - potential for script injection if user input is involved.")
    
    # Generate recommendations
    recommendations = []
    if type_counts.get("eval-call", 0) > 0 or type_counts.get("function-constructor", 0) > 0:
        recommendations.append("Eliminate use of eval() and Function() constructor. Use safer alternatives like JSON.parse() for data.")
    if type_counts.get("javascript-protocol", 0) > 0:
        recommendations.append("Replace javascript: protocol URLs with proper event handlers or data attributes.")
    if type_counts.get("innerhtml-set", 0) > 0:
        recommendations.append("Use textContent or safer DOM methods. If HTML is required, sanitize with DOMPurify or similar library.")
    if type_counts.get("inline-event-handler", 0) > 0:
        recommendations.append("Replace inline event handlers with addEventListener() to follow CSP best practices.")
    if type_counts.get("document-write", 0) > 0:
        recommendations.append("Avoid document.write(). Use modern DOM manipulation methods instead.")
    
    recommendations.append("Implement Content Security Policy (CSP) to prevent inline script execution.")
    recommendations.append("Validate and sanitize all user inputs on both client and server side.")
    recommendations.append("Use framework-provided safe rendering methods (e.g., React's JSX, Vue templates).")
    
    # Generate summary
    summary = f"Analysis of {len(evidence)} evidence items from {report.metadata.url}. "
    summary += f"Risk Score: {risk_score}/100. "
    summary += f"Verdict: {verdict}. "
    if severity_counts["high"] > 0:
        summary += f"Critical: {severity_counts['high']} high-severity issues require immediate attention."
    
    # Supporting evidence (top 5 most critical)
    supporting = []
    sorted_evidence = sorted(evidence, key=lambda x: severity_weights.get(x.severity, 0) * type_weights.get(x.type, 1.0), reverse=True)
    for item in sorted_evidence[:5]:
        supporting.append({
            "type": item.type,
            "severity": item.severity,
            "snippet": item.snippet[:100] + "..." if len(item.snippet) > 100 else item.snippet
        })
    
    return AnalysisResponse(
        risk_score=risk_score,
        verdict=verdict,
        summary=summary,
        explanation=explanation,
        recommendations=recommendations,
        supporting_evidence=supporting
    )

async def openai_analysis(report: AnalysisReport, heuristic_result: AnalysisResponse) -> AnalysisResponse:
    """
    Enhanced analysis using OpenAI (optional, when API key is available)
    """
    try:
        import openai
        
        # Prepare context for OpenAI
        evidence_summary = []
        for item in report.evidence[:10]:  # Limit to first 10 items for token efficiency
            evidence_summary.append({
                "type": item.type,
                "severity": item.severity,
                "snippet": item.snippet[:100]
            })
        
        prompt = f"""You are a security expert analyzing a web page for XSS vulnerabilities.

URL: {report.metadata.url}
Evidence Count: {len(report.evidence)}
Heuristic Risk Score: {heuristic_result.risk_score}/100

Evidence Sample:
{evidence_summary}

Based on this evidence, provide:
1. A refined risk assessment (0-100)
2. A clear verdict
3. A concise summary of the security posture
4. Key explanations of identified risks
5. Actionable recommendations

Focus on practical, actionable insights."""

        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a cybersecurity expert specializing in XSS vulnerability analysis."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=800
        )
        
        ai_text = response.choices[0].message.content
        
        # Parse AI response and combine with heuristic
        # For simplicity, use heuristic structure but enhance summary with AI insights
        enhanced_result = heuristic_result.copy()
        enhanced_result.summary = ai_text[:500]  # Use AI summary
        
        logger.info("OpenAI analysis completed successfully")
        return enhanced_result
        
    except Exception as e:
        logger.error(f"OpenAI analysis failed: {e}")
        # Fall back to heuristic result
        return heuristic_result

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "XSS Risk Analysis Service",
        "status": "running",
        "version": "1.0.0",
        "openai_enabled": USE_OPENAI
    }

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_report(report: AnalysisReport):
    """
    Analyze XSS evidence report and return risk assessment
    """
    try:
        logger.info(f"Analyzing report for URL: {report.metadata.url}")
        logger.info(f"Evidence count: {len(report.evidence)}")
        
        # Always run heuristic analysis
        heuristic_result = heuristic_analysis(report)
        
        # If OpenAI is available and enabled, enhance with AI analysis
        if USE_OPENAI:
            final_result = await openai_analysis(report, heuristic_result)
        else:
            final_result = heuristic_result
        
        logger.info(f"Analysis complete. Risk score: {final_result.risk_score}")
        return final_result
        
    except Exception as e:
        logger.error(f"Analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")
