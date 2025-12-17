/**
 * Popup Script for XSS Risk Detector
 * Handles UI interactions and evidence display
 */

let currentEvidence = [];
let currentUrl = '';

/**
 * Calculate heuristic risk level
 */
function calculateRiskLevel(evidence) {
  if (!evidence || evidence.length === 0) {
    return { level: 'low', score: 0 };
  }
  
  let score = 0;
  const severityWeights = { high: 10, medium: 5, low: 2 };
  
  evidence.forEach(item => {
    score += severityWeights[item.severity] || 0;
  });
  
  // Determine level based on score
  let level = 'low';
  if (score >= 50) {
    level = 'high';
  } else if (score >= 20) {
    level = 'medium';
  }
  
  return { level, score };
}

/**
 * Update risk badge
 */
function updateRiskBadge(level) {
  const badge = document.getElementById('riskBadge');
  const levelText = document.getElementById('riskLevel');
  
  badge.className = 'risk-badge risk-' + level;
  levelText.textContent = level.toUpperCase();
}

/**
 * Format timestamp for display
 */
function formatTime(isoString) {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString();
  } catch (e) {
    return isoString;
  }
}

/**
 * Render evidence list
 */
function renderEvidence(evidence) {
  const container = document.getElementById('evidenceContainer');
  
  if (!evidence || evidence.length === 0) {
    container.innerHTML = '<p class="no-evidence">No evidence found. The page appears safe or the content script is not injected yet.</p>';
    return;
  }
  
  container.innerHTML = '';
  
  evidence.forEach(item => {
    const card = document.createElement('div');
    card.className = `evidence-card severity-${item.severity}`;
    
    const header = document.createElement('div');
    header.className = 'evidence-header';
    
    const type = document.createElement('span');
    type.className = 'evidence-type';
    type.textContent = item.type;
    
    const severity = document.createElement('span');
    severity.className = `evidence-severity severity-badge-${item.severity}`;
    severity.textContent = item.severity;
    
    const time = document.createElement('span');
    time.className = 'evidence-time';
    time.textContent = formatTime(item.time);
    
    header.appendChild(type);
    header.appendChild(severity);
    header.appendChild(time);
    
    const snippet = document.createElement('div');
    snippet.className = 'evidence-snippet';
    snippet.textContent = item.snippet || '(no snippet)';
    
    const location = document.createElement('div');
    location.className = 'evidence-location';
    if (item.location && item.location.selector) {
      location.textContent = `Location: ${item.location.selector}`;
    } else {
      location.textContent = 'Location: page';
    }
    
    card.appendChild(header);
    card.appendChild(snippet);
    card.appendChild(location);
    
    container.appendChild(card);
  });
}

/**
 * Filter and sort evidence
 */
function filterAndSortEvidence() {
  const typeFilter = document.getElementById('typeFilter').value;
  const severityFilter = document.getElementById('severityFilter').value;
  const sortBy = document.getElementById('sortBy').value;
  
  let filtered = [...currentEvidence];
  
  // Apply filters
  if (typeFilter !== 'all') {
    filtered = filtered.filter(e => e.type === typeFilter);
  }
  
  if (severityFilter !== 'all') {
    filtered = filtered.filter(e => e.severity === severityFilter);
  }
  
  // Apply sorting
  const severityOrder = { high: 3, medium: 2, low: 1 };
  
  if (sortBy === 'time-desc') {
    filtered.sort((a, b) => new Date(b.time) - new Date(a.time));
  } else if (sortBy === 'time-asc') {
    filtered.sort((a, b) => new Date(a.time) - new Date(b.time));
  } else if (sortBy === 'severity-desc') {
    filtered.sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity]);
  } else if (sortBy === 'severity-asc') {
    filtered.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }
  
  renderEvidence(filtered);
}

/**
 * Load evidence from content script
 */
async function loadEvidence() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      console.error('No active tab found');
      return;
    }
    
    currentUrl = tab.url;
    document.getElementById('currentUrl').textContent = currentUrl;
    
    // First, inject the content script if needed
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['src/content.js']
      });
    } catch (e) {
      // Content script might already be injected
      console.log('Content script injection skipped:', e.message);
    }
    
    // Wait a bit for content script to initialize
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Request evidence from content script
    chrome.tabs.sendMessage(tab.id, { action: 'collectEvidence' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error:', chrome.runtime.lastError);
        document.getElementById('evidenceContainer').innerHTML = 
          '<p class="error">Failed to collect evidence. Please refresh the page and try again.</p>';
        return;
      }
      
      if (response && response.evidence) {
        currentEvidence = response.evidence;
        document.getElementById('evidenceCount').textContent = currentEvidence.length;
        
        const risk = calculateRiskLevel(currentEvidence);
        updateRiskBadge(risk.level);
        
        filterAndSortEvidence();
      }
    });
  } catch (error) {
    console.error('Error loading evidence:', error);
    document.getElementById('evidenceContainer').innerHTML = 
      `<p class="error">Error: ${error.message}</p>`;
  }
}

/**
 * Export report as JSON
 */
function exportReport() {
  const risk = calculateRiskLevel(currentEvidence);
  
  const report = {
    metadata: {
      url: currentUrl,
      timestamp: new Date().toISOString(),
      evidenceCount: currentEvidence.length,
      riskLevel: risk.level,
      riskScore: risk.score
    },
    evidence: currentEvidence,
    summary: {
      severityCounts: {
        high: currentEvidence.filter(e => e.severity === 'high').length,
        medium: currentEvidence.filter(e => e.severity === 'medium').length,
        low: currentEvidence.filter(e => e.severity === 'low').length
      },
      typeCounts: {}
    }
  };
  
  // Count by type
  currentEvidence.forEach(e => {
    report.summary.typeCounts[e.type] = (report.summary.typeCounts[e.type] || 0) + 1;
  });
  
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const filename = `xss-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  
  chrome.downloads.download({
    url: url,
    filename: filename,
    saveAs: true
  }, (downloadId) => {
    if (chrome.runtime.lastError) {
      console.error('Download error:', chrome.runtime.lastError);
      alert('Failed to export report: ' + chrome.runtime.lastError.message);
    } else {
      console.log('Report exported:', downloadId);
    }
  });
}

/**
 * Analyze with service
 */
async function analyzeWithService() {
  const risk = calculateRiskLevel(currentEvidence);
  
  const report = {
    metadata: {
      url: currentUrl,
      timestamp: new Date().toISOString(),
      evidenceCount: currentEvidence.length,
      riskLevel: risk.level,
      riskScore: risk.score
    },
    evidence: currentEvidence
  };
  
  try {
    const response = await fetch('http://127.0.0.1:8000/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(report)
    });
    
    if (!response.ok) {
      throw new Error(`Service returned ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Show results
    document.getElementById('analysisResults').style.display = 'block';
    document.getElementById('analysisScore').textContent = result.risk_score + '/100';
    document.getElementById('analysisVerdict').textContent = result.verdict || '-';
    document.getElementById('analysisSummary').textContent = result.summary || '-';
    
  } catch (error) {
    console.error('Service analysis error:', error);
    alert('Failed to analyze with service. Make sure the local service is running at http://127.0.0.1:8000\n\nError: ' + error.message);
  }
}

/**
 * Initialize popup
 */
document.addEventListener('DOMContentLoaded', () => {
  // Load evidence
  loadEvidence();
  
  // Set up event listeners
  document.getElementById('refreshBtn').addEventListener('click', loadEvidence);
  document.getElementById('exportBtn').addEventListener('click', exportReport);
  document.getElementById('analyzeBtn').addEventListener('click', analyzeWithService);
  
  document.getElementById('typeFilter').addEventListener('change', filterAndSortEvidence);
  document.getElementById('severityFilter').addEventListener('change', filterAndSortEvidence);
  document.getElementById('sortBy').addEventListener('change', filterAndSortEvidence);
});
