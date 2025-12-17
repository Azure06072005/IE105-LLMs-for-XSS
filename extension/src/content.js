/**
 * Content Script for XSS Risk Detector
 * Collects static DOM signals and hooks runtime sinks
 */

// Evidence storage
let evidenceList = [];
let evidenceIdCounter = 0;

/**
 * Add evidence item
 */
function addEvidence(type, severity, snippet, location, stack = null) {
  const evidence = {
    id: ++evidenceIdCounter,
    time: new Date().toISOString(),
    type: type,
    severity: severity,
    location: location || {
      url: window.location.href,
      selector: null
    },
    snippet: snippet ? snippet.substring(0, 200) : '',
    stack: stack
  };
  evidenceList.push(evidence);
  return evidence;
}

/**
 * Collect static DOM signals on page load
 */
function collectStaticSignals() {
  const signals = [];
  
  // 1. Check for inline event handlers
  const inlineEventAttrs = [
    'onerror', 'onclick', 'onload', 'onmouseover', 'onmouseout',
    'onmouseenter', 'onmouseleave', 'onfocus', 'onblur', 'onchange',
    'onsubmit', 'onkeydown', 'onkeyup', 'onkeypress'
  ];
  
  const allElements = document.querySelectorAll('*');
  allElements.forEach((elem, index) => {
    inlineEventAttrs.forEach(attr => {
      if (elem.hasAttribute(attr)) {
        const value = elem.getAttribute(attr);
        addEvidence(
          'inline-event-handler',
          'medium',
          `${attr}="${value}"`,
          {
            url: window.location.href,
            selector: `${elem.tagName.toLowerCase()}[${attr}]`,
            index: index
          }
        );
      }
    });
  });
  
  // 2. Check for javascript: URLs
  const jsProtocolElements = document.querySelectorAll('a[href^="javascript:"], iframe[src^="javascript:"], img[src^="javascript:"]');
  jsProtocolElements.forEach((elem, index) => {
    const attr = elem.href ? 'href' : 'src';
    const value = elem.getAttribute(attr);
    addEvidence(
      'javascript-protocol',
      'high',
      `${attr}="${value}"`,
      {
        url: window.location.href,
        selector: `${elem.tagName.toLowerCase()}[${attr}^="javascript:"]`,
        index: index
      }
    );
  });
  
  // 3. Count inline script blocks
  const inlineScripts = document.querySelectorAll('script:not([src])');
  inlineScripts.forEach((script, index) => {
    const content = script.textContent || script.innerText;
    if (content && content.trim().length > 0) {
      addEvidence(
        'inline-script',
        'low',
        content,
        {
          url: window.location.href,
          selector: 'script:not([src])',
          index: index,
          length: content.length
        }
      );
    }
  });
  
  console.log(`[XSS Detector] Collected ${evidenceList.length} static signals`);
}

/**
 * Hook dangerous runtime sinks
 */
function hookRuntimeSinks() {
  // Store original functions
  const originalEval = window.eval;
  const originalFunction = window.Function;
  const originalDocumentWrite = document.write;
  const originalDocumentWriteln = document.writeln;
  const originalSetTimeout = window.setTimeout;
  const originalSetInterval = window.setInterval;
  
  // Hook eval
  window.eval = function(code) {
    addEvidence(
      'eval-call',
      'high',
      typeof code === 'string' ? code : String(code),
      { url: window.location.href },
      new Error().stack
    );
    return originalEval.apply(this, arguments);
  };
  
  // Hook Function constructor
  window.Function = function() {
    const args = Array.from(arguments);
    const code = args.length > 0 ? args[args.length - 1] : '';
    addEvidence(
      'function-constructor',
      'high',
      String(code),
      { url: window.location.href },
      new Error().stack
    );
    return originalFunction.apply(this, arguments);
  };
  
  // Hook document.write
  document.write = function(content) {
    addEvidence(
      'document-write',
      'medium',
      String(content),
      { url: window.location.href },
      new Error().stack
    );
    return originalDocumentWrite.apply(this, arguments);
  };
  
  document.writeln = function(content) {
    addEvidence(
      'document-writeln',
      'medium',
      String(content),
      { url: window.location.href },
      new Error().stack
    );
    return originalDocumentWriteln.apply(this, arguments);
  };
  
  // Hook setTimeout with string argument
  window.setTimeout = function(code, delay) {
    if (typeof code === 'string') {
      addEvidence(
        'settimeout-string',
        'high',
        code,
        { url: window.location.href },
        new Error().stack
      );
    }
    return originalSetTimeout.apply(this, arguments);
  };
  
  // Hook setInterval with string argument
  window.setInterval = function(code, delay) {
    if (typeof code === 'string') {
      addEvidence(
        'setinterval-string',
        'high',
        code,
        { url: window.location.href },
        new Error().stack
      );
    }
    return originalSetInterval.apply(this, arguments);
  };
  
  // Hook innerHTML and outerHTML setters
  const elementProto = Element.prototype;
  const originalInnerHTMLDesc = Object.getOwnPropertyDescriptor(elementProto, 'innerHTML');
  const originalOuterHTMLDesc = Object.getOwnPropertyDescriptor(elementProto, 'outerHTML');
  
  if (originalInnerHTMLDesc && originalInnerHTMLDesc.set) {
    Object.defineProperty(elementProto, 'innerHTML', {
      set: function(value) {
        addEvidence(
          'innerhtml-set',
          'medium',
          String(value),
          {
            url: window.location.href,
            selector: this.tagName ? this.tagName.toLowerCase() : 'unknown'
          },
          new Error().stack
        );
        return originalInnerHTMLDesc.set.call(this, value);
      },
      get: originalInnerHTMLDesc.get
    });
  }
  
  if (originalOuterHTMLDesc && originalOuterHTMLDesc.set) {
    Object.defineProperty(elementProto, 'outerHTML', {
      set: function(value) {
        addEvidence(
          'outerhtml-set',
          'medium',
          String(value),
          {
            url: window.location.href,
            selector: this.tagName ? this.tagName.toLowerCase() : 'unknown'
          },
          new Error().stack
        );
        return originalOuterHTMLDesc.set.call(this, value);
      },
      get: originalOuterHTMLDesc.get
    });
  }
  
  // Hook insertAdjacentHTML
  const originalInsertAdjacentHTML = elementProto.insertAdjacentHTML;
  elementProto.insertAdjacentHTML = function(position, text) {
    addEvidence(
      'insertadjacenthtml',
      'medium',
      String(text),
      {
        url: window.location.href,
        selector: this.tagName ? this.tagName.toLowerCase() : 'unknown',
        position: position
      },
      new Error().stack
    );
    return originalInsertAdjacentHTML.apply(this, arguments);
  };
  
  console.log('[XSS Detector] Runtime sinks hooked');
}

/**
 * Initialize collector
 */
function initialize() {
  console.log('[XSS Detector] Content script loaded on:', window.location.href);
  
  // Collect static signals when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', collectStaticSignals);
  } else {
    collectStaticSignals();
  }
  
  // Hook runtime sinks
  hookRuntimeSinks();
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'collectEvidence') {
    sendResponse({
      evidence: evidenceList,
      url: window.location.href,
      timestamp: new Date().toISOString()
    });
    return true;
  }
});

// Initialize
initialize();
