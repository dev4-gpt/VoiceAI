(function() {
  // GrowthVoice OS — Universal Embeddable Spoken Voice Agent
  if (window.__GrowthVoiceOSEmbedLoaded) return;
  window.__GrowthVoiceOSEmbedLoaded = true;

  // Locate current script tag to read parameters
  var currentScript = document.currentScript || (function() {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  var config = {
    company: (currentScript && currentScript.getAttribute('data-company')) || 'GrowthVoice OS',
    clientId: (currentScript && currentScript.getAttribute('data-client-id')) || 'lead_jm_901',
    apiUrl: (currentScript && currentScript.getAttribute('data-api')) || (function() {
      if (currentScript && currentScript.src) {
        var a = document.createElement('a');
        a.href = currentScript.src;
        return a.protocol + '//' + a.host;
      }
      return 'http://localhost:4000';
    })(),
    accent: (currentScript && currentScript.getAttribute('data-accent')) || '#d4af37',
    position: (currentScript && currentScript.getAttribute('data-position')) || 'bottom-right'
  };

  // Inject Styles
  var style = document.createElement('style');
  style.textContent = `
    .gvos-widget-pill {
      position: fixed;
      ${config.position.includes('left') ? 'left: 24px;' : 'right: 24px;'}
      bottom: 24px;
      z-index: 999999;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 20px;
      border-radius: 9999px;
      background: rgba(18, 18, 20, 0.82);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.14);
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.45), 0 0 24px rgba(212, 175, 55, 0.2);
      color: #f5f5f7;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      user-select: none;
    }
    .gvos-widget-pill:hover {
      transform: translateY(-2px) scale(1.02);
      border-color: rgba(212, 175, 55, 0.4);
      box-shadow: 0 20px 44px rgba(0, 0, 0, 0.55), 0 0 32px rgba(212, 175, 55, 0.35);
    }
    .gvos-pulse-orb {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 10px #10b981;
      position: relative;
    }
    .gvos-pulse-orb::after {
      content: '';
      position: absolute;
      inset: -4px;
      border-radius: 50%;
      border: 2px solid #10b981;
      opacity: 0.6;
      animation: gvos-pulse 2s infinite cubic-bezier(0.4, 0, 0.6, 1);
    }
    @keyframes gvos-pulse {
      0% { transform: scale(0.9); opacity: 0.8; }
      50% { transform: scale(1.6); opacity: 0; }
      100% { transform: scale(0.9); opacity: 0; }
    }
    .gvos-modal {
      position: fixed;
      ${config.position.includes('left') ? 'left: 24px;' : 'right: 24px;'}
      bottom: 84px;
      width: 370px;
      max-width: calc(100vw - 48px);
      height: 520px;
      max-height: calc(100vh - 120px);
      z-index: 999999;
      border-radius: 24px;
      background: rgba(14, 14, 18, 0.94);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(212, 175, 55, 0.15);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      animation: gvos-fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes gvos-fade-in {
      from { opacity: 0; transform: translateY(16px) scale(0.96); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .gvos-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(255, 255, 255, 0.02);
    }
    .gvos-modal-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
      position: relative;
      text-align: center;
      gap: 16px;
    }
    .gvos-visualizer-box {
      width: 140px;
      height: 140px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(212, 175, 55, 0.22) 0%, rgba(20, 20, 24, 0.8) 70%);
      border: 1px solid rgba(212, 175, 55, 0.35);
      box-shadow: 0 0 35px rgba(212, 175, 55, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .gvos-wave-ring {
      position: absolute;
      inset: -10px;
      border-radius: 50%;
      border: 1px dashed rgba(212, 175, 55, 0.4);
      animation: gvos-spin 12s linear infinite;
    }
    @keyframes gvos-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .gvos-btn {
      padding: 12px 24px;
      border-radius: 9999px;
      font-size: 14px;
      font-weight: 600;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }
    .gvos-btn-primary {
      background: linear-gradient(135deg, #f59e0b 0%, #d4af37 100%);
      color: #000;
      box-shadow: 0 4px 14px rgba(212, 175, 55, 0.35);
    }
    .gvos-btn-primary:hover {
      opacity: 0.95;
      transform: translateY(-1px);
    }
    .gvos-btn-danger {
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #fca5a5;
    }
    .gvos-transcript-card {
      width: 100%;
      min-height: 80px;
      max-height: 120px;
      overflow-y: auto;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 12px;
      font-size: 13px;
      text-align: left;
      line-height: 1.5;
      color: #e2e8f0;
    }
  `;
  document.head.appendChild(style);

  // Create UI Container
  var container = document.createElement('div');
  container.id = 'gvos-widget-root';
  document.body.appendChild(container);

  var isModalOpen = false;
  var isCallActive = false;
  var callStartTime = null;

  function render() {
    container.innerHTML = '';

    // Floating Pill Trigger
    var pill = document.createElement('div');
    pill.className = 'gvos-widget-pill';
    pill.innerHTML = `
      <div class="gvos-pulse-orb"></div>
      <div>
        <div style="font-size: 11px; opacity: 0.6; text-transform: uppercase; letter-spacing: 0.05em;">GrowthOS Voice</div>
        <div style="font-weight: 600; color: #fff;">Talk to Anna</div>
      </div>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 4px; opacity: 0.85;">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
        <line x1="12" y1="19" x2="12" y2="22"></line>
      </svg>
    `;
    pill.onclick = function() {
      isModalOpen = !isModalOpen;
      render();
    };
    container.appendChild(pill);

    // Modal
    if (isModalOpen) {
      var modal = document.createElement('div');
      modal.className = 'gvos-modal';
      modal.innerHTML = `
        <div class="gvos-modal-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 8px; height: 8px; border-radius: 50%; background: #10b981;"></div>
            <div style="font-size: 13px; font-weight: 600; color: #fff;">Anna — ${config.company}</div>
          </div>
          <button id="gvos-close-btn" style="background: none; border: none; color: rgba(255,255,255,0.6); cursor: pointer; font-size: 18px; line-height: 1;">✕</button>
        </div>
        <div class="gvos-modal-body">
          <div style="font-size: 12px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.06em;">
            ${isCallActive ? 'Session Connected • Spoken AI' : 'Instant 24/7 Strategy Consultation'}
          </div>

          <div class="gvos-visualizer-box">
            <div class="gvos-wave-ring"></div>
            <div style="font-size: 32px;">🎙️</div>
          </div>

          <div style="font-size: 14px; font-weight: 500; color: #f1f5f9; padding: 0 12px;">
            ${isCallActive ? 'Scripted preview — no microphone is active and nothing is being transcribed.' : 'Preview of the Anna voice agent. Scripted demo, not a live call.'}
          </div>

          <div class="gvos-transcript-card" id="gvos-transcript">
            <span style="opacity: 0.6;">Anna: "Hello! Welcome to ${config.company}. I'm Anna, Senior Growth Operating Architect. How can I help maximize your revenue today?"</span>
          </div>

          <div>
            ${!isCallActive ? `
              <button class="gvos-btn gvos-btn-primary" id="gvos-start-call">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                Play Scripted Demo
              </button>
            ` : `
              <button class="gvos-btn gvos-btn-danger" id="gvos-end-call">
                Stop Demo
              </button>
            `}
          </div>

          <div style="font-size: 10px; color: rgba(255,255,255,0.4);">
            GrowthVoice OS • scripted preview (live voice not yet wired into this widget)
          </div>
        </div>
      `;

      modal.querySelector('#gvos-close-btn').onclick = function() {
        isModalOpen = false;
        render();
      };

      var startBtn = modal.querySelector('#gvos-start-call');
      if (startBtn) {
        startBtn.onclick = function() {
          isCallActive = true;
          callStartTime = Date.now();
          render();
          startSimulatedSpokenSession();
        };
      }

      var endBtn = modal.querySelector('#gvos-end-call');
      if (endBtn) {
        endBtn.onclick = function() {
          isCallActive = false;
          callStartTime = null;
          render();

          // No usage is reported here. This handler previously POSTed a hardcoded
          // { leadCaptured: true, estimatedDealValueUsd: 3500 } to
          // /api/billing/record-call on every close, so simply opening and closing
          // this widget inflated the tenant's pipeline and ROI figures with
          // revenue that never existed. Metering returns once this widget runs a
          // real voice session the server can measure.
        };
      }

      container.appendChild(modal);
    }
  }

  function startSimulatedSpokenSession() {
    var transcriptEl = document.getElementById('gvos-transcript');
    if (!transcriptEl) return;

    var scriptSteps = [
      { speaker: 'User', text: 'Hey Anna, what is your pricing tier for a mid-market SaaS with 10k users?' },
      { speaker: 'Anna', text: 'Under our GrowthOS framework, our flagship Growth Engine Pro tier is $397 monthly, which covers 2,500 minutes, 3 autonomous agents, and CRM sync. What is your current monthly inbound volume?' }
    ];

    var idx = 0;
    var timer = setInterval(function() {
      if (!isCallActive || idx >= scriptSteps.length) {
        clearInterval(timer);
        return;
      }
      var step = scriptSteps[idx];
      var p = document.createElement('div');
      p.style.marginTop = '6px';
      p.innerHTML = '<strong>' + step.speaker + ':</strong> ' + step.text;
      transcriptEl.appendChild(p);
      transcriptEl.scrollTop = transcriptEl.scrollHeight;
      idx++;
    }, 2800);
  }

  // Initial render
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
