/**
 * AI Interaction Panel - Frontend component for AI agent communication
 * Part of the AITaskFlo autonomous AI agent system
 */

class AIInteractionPanel {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    this.options = {
      theme: 'dark',
      showEmotions: true,
      showReasonings: true,
      showAutonomyLevel: true,
      enableVoice: false,
      ...options
    };
    
    this.isConnected = false;
    this.sessionId = null;
    this.interactionHistory = [];
    this.aiStatus = null;
    
    this.init();
  }

  init() {
    if (!this.container) {
      console.error(`AI Interaction Panel: Container ${this.containerId} not found`);
      return;
    }
    
    this.render();
    this.attachEventListeners();
    this.checkAIStatus();
  }

  render() {
    this.container.innerHTML = `
      <div class="ai-interaction-panel ${this.options.theme}">
        <div class="ai-header">
          <div class="ai-status">
            <span class="ai-indicator" id="ai-indicator">●</span>
            <span class="ai-title">AITaskFlo Agent</span>
            <span class="ai-autonomy" id="ai-autonomy">Autonomy: --</span>
          </div>
          <div class="ai-controls">
            <button id="ai-clear-chat" class="ai-btn-secondary">Clear</button>
            <button id="ai-settings" class="ai-btn-secondary">⚙️</button>
          </div>
        </div>
        
        <div class="ai-chat-container" id="ai-chat-container">
          <div class="ai-welcome-message">
            <div class="ai-avatar">🤖</div>
            <div class="ai-message-content">
              <p>Hello! I'm your AITaskFlo Agent. I can help you with tasks, provide insights, and learn from our interactions.</p>
              <p>I operate with <strong>autonomous decision-making</strong>, <strong>emotional intelligence</strong>, and <strong>real-time learning</strong>.</p>
            </div>
          </div>
        </div>
        
        <div class="ai-input-container">
          <div class="ai-input-wrapper">
            <textarea 
              id="ai-input" 
              placeholder="Ask me anything... I'll use emotion, logic, and creativity to help you."
              rows="2"
            ></textarea>
            <div class="ai-input-actions">
              <button id="ai-voice-toggle" class="ai-btn-icon" style="display: ${this.options.enableVoice ? 'block' : 'none'}">🎤</button>
              <button id="ai-send" class="ai-btn-primary">Send</button>
            </div>
          </div>
          <div class="ai-quick-actions">
            <button class="ai-quick-btn" data-prompt="Analyze my productivity patterns">📊 Analytics</button>
            <button class="ai-quick-btn" data-prompt="Suggest process optimizations">⚡ Optimize</button>
            <button class="ai-quick-btn" data-prompt="Help me plan my day">📅 Plan</button>
            <button class="ai-quick-btn" data-prompt="Creative brainstorming session">💡 Create</button>
          </div>
        </div>
        
        <div class="ai-insights-panel" id="ai-insights-panel" style="display: none;">
          <div class="ai-insights-header">
            <h4>AI Insights</h4>
            <button id="ai-insights-close">×</button>
          </div>
          <div class="ai-insights-content" id="ai-insights-content">
            <!-- Insights will be populated here -->
          </div>
        </div>
      </div>
    `;
    
    this.addStyles();
  }

  addStyles() {
    if (document.getElementById('ai-interaction-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'ai-interaction-styles';
    styles.textContent = `
      .ai-interaction-panel {
        font-family: 'Inter', system-ui, sans-serif;
        background: var(--ai-bg, #0f1419);
        border: 1px solid var(--ai-border, #21262d);
        border-radius: 12px;
        overflow: hidden;
        height: 600px;
        display: flex;
        flex-direction: column;
        position: relative;
      }
      
      .ai-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px;
        background: var(--ai-header-bg, #161b22);
        border-bottom: 1px solid var(--ai-border, #21262d);
      }
      
      .ai-status {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .ai-indicator {
        font-size: 12px;
        color: #22c55e;
        animation: pulse 2s infinite;
      }
      
      .ai-title {
        font-weight: 600;
        color: var(--ai-text, #e6edf3);
        font-size: 16px;
      }
      
      .ai-autonomy {
        font-size: 12px;
        color: var(--ai-muted, #8b949e);
        background: var(--ai-accent, #00d4ff);
        color: #000;
        padding: 2px 8px;
        border-radius: 12px;
        font-weight: 500;
      }
      
      .ai-controls {
        display: flex;
        gap: 8px;
      }
      
      .ai-btn-secondary {
        background: transparent;
        border: 1px solid var(--ai-border, #21262d);
        color: var(--ai-text, #e6edf3);
        padding: 6px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s;
      }
      
      .ai-btn-secondary:hover {
        background: var(--ai-hover, #21262d);
      }
      
      .ai-chat-container {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      
      .ai-welcome-message, .ai-message {
        display: flex;
        gap: 12px;
        align-items: flex-start;
      }
      
      .ai-avatar {
        font-size: 24px;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      
      .user-avatar {
        background: var(--ai-accent, #00d4ff);
        color: #000;
        border-radius: 50%;
        font-size: 14px;
        font-weight: 600;
      }
      
      .ai-message-content {
        flex: 1;
        background: var(--ai-message-bg, #161b22);
        padding: 12px 16px;
        border-radius: 12px;
        border: 1px solid var(--ai-border, #21262d);
      }
      
      .user-message-content {
        background: var(--ai-user-bg, #1f2937);
        margin-left: auto;
        max-width: 80%;
      }
      
      .ai-message-content p {
        margin: 0 0 8px 0;
        color: var(--ai-text, #e6edf3);
        line-height: 1.5;
      }
      
      .ai-message-content p:last-child {
        margin-bottom: 0;
      }
      
      .ai-message-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid var(--ai-border, #21262d);
        font-size: 11px;
      }
      
      .ai-meta-tag {
        background: var(--ai-tag-bg, #374151);
        color: var(--ai-tag-text, #d1d5db);
        padding: 2px 6px;
        border-radius: 4px;
      }
      
      .ai-emotion-tag {
        background: #fbbf24;
        color: #000;
      }
      
      .ai-confidence-tag {
        background: #10b981;
        color: #000;
      }
      
      .ai-input-container {
        padding: 16px;
        border-top: 1px solid var(--ai-border, #21262d);
        background: var(--ai-header-bg, #161b22);
      }
      
      .ai-input-wrapper {
        display: flex;
        gap: 8px;
        align-items: flex-end;
        margin-bottom: 12px;
      }
      
      #ai-input {
        flex: 1;
        background: var(--ai-input-bg, #0f1419);
        border: 1px solid var(--ai-border, #21262d);
        color: var(--ai-text, #e6edf3);
        padding: 12px;
        border-radius: 8px;
        resize: none;
        font-family: inherit;
        font-size: 14px;
        min-height: 44px;
        max-height: 120px;
      }
      
      #ai-input:focus {
        outline: none;
        border-color: var(--ai-accent, #00d4ff);
        box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.1);
      }
      
      .ai-input-actions {
        display: flex;
        gap: 4px;
      }
      
      .ai-btn-primary {
        background: var(--ai-accent, #00d4ff);
        color: #000;
        border: none;
        padding: 10px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.2s;
      }
      
      .ai-btn-primary:hover {
        background: #00bfeb;
        transform: translateY(-1px);
      }
      
      .ai-btn-primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
      }
      
      .ai-btn-icon {
        background: transparent;
        border: 1px solid var(--ai-border, #21262d);
        color: var(--ai-text, #e6edf3);
        padding: 8px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 16px;
        transition: all 0.2s;
      }
      
      .ai-btn-icon:hover {
        background: var(--ai-hover, #21262d);
      }
      
      .ai-quick-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      
      .ai-quick-btn {
        background: var(--ai-quick-bg, #374151);
        color: var(--ai-text, #e6edf3);
        border: none;
        padding: 6px 10px;
        border-radius: 16px;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s;
      }
      
      .ai-quick-btn:hover {
        background: var(--ai-accent, #00d4ff);
        color: #000;
        transform: translateY(-1px);
      }
      
      .ai-insights-panel {
        position: absolute;
        top: 60px;
        right: 16px;
        width: 300px;
        background: var(--ai-message-bg, #161b22);
        border: 1px solid var(--ai-border, #21262d);
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 10;
      }
      
      .ai-insights-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid var(--ai-border, #21262d);
      }
      
      .ai-insights-header h4 {
        margin: 0;
        color: var(--ai-text, #e6edf3);
        font-size: 14px;
      }
      
      #ai-insights-close {
        background: none;
        border: none;
        color: var(--ai-muted, #8b949e);
        cursor: pointer;
        font-size: 18px;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .ai-insights-content {
        padding: 16px;
        max-height: 300px;
        overflow-y: auto;
      }
      
      .ai-thinking {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--ai-muted, #8b949e);
        font-style: italic;
      }
      
      .ai-thinking-dots {
        display: inline-flex;
        gap: 2px;
      }
      
      .ai-thinking-dots span {
        width: 4px;
        height: 4px;
        background: var(--ai-accent, #00d4ff);
        border-radius: 50%;
        animation: thinking 1.4s infinite;
      }
      
      .ai-thinking-dots span:nth-child(2) {
        animation-delay: 0.2s;
      }
      
      .ai-thinking-dots span:nth-child(3) {
        animation-delay: 0.4s;
      }
      
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      
      @keyframes thinking {
        0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
        40% { transform: scale(1); opacity: 1; }
      }
      
      /* Scrollbar styles */
      .ai-chat-container::-webkit-scrollbar,
      .ai-insights-content::-webkit-scrollbar {
        width: 6px;
      }
      
      .ai-chat-container::-webkit-scrollbar-track,
      .ai-insights-content::-webkit-scrollbar-track {
        background: var(--ai-bg, #0f1419);
      }
      
      .ai-chat-container::-webkit-scrollbar-thumb,
      .ai-insights-content::-webkit-scrollbar-thumb {
        background: var(--ai-border, #21262d);
        border-radius: 3px;
      }
      
      .ai-chat-container::-webkit-scrollbar-thumb:hover,
      .ai-insights-content::-webkit-scrollbar-thumb:hover {
        background: var(--ai-muted, #8b949e);
      }
    `;
    
    document.head.appendChild(styles);
  }

  attachEventListeners() {
    const sendBtn = document.getElementById('ai-send');
    const input = document.getElementById('ai-input');
    const clearBtn = document.getElementById('ai-clear-chat');
    const settingsBtn = document.getElementById('ai-settings');
    const quickBtns = document.querySelectorAll('.ai-quick-btn');
    const insightsClose = document.getElementById('ai-insights-close');
    
    sendBtn?.addEventListener('click', () => this.sendMessage());
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    
    clearBtn?.addEventListener('click', () => this.clearChat());
    settingsBtn?.addEventListener('click', () => this.showInsights());
    insightsClose?.addEventListener('click', () => this.hideInsights());
    
    quickBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const prompt = btn.dataset.prompt;
        if (prompt) {
          document.getElementById('ai-input').value = prompt;
          this.sendMessage();
        }
      });
    });
  }

  async checkAIStatus() {
    try {
      const response = await fetch('/ai-agent/status');
      const data = await response.json();
      
      if (data.success) {
        this.aiStatus = data.agent;
        this.updateStatusIndicator(true);
        this.updateAutonomyLevel(this.aiStatus.autonomyLevel || 0.7);
      } else {
        this.updateStatusIndicator(false);
      }
    } catch (error) {
      console.error('Failed to check AI status:', error);
      this.updateStatusIndicator(false);
    }
  }

  updateStatusIndicator(isActive) {
    const indicator = document.getElementById('ai-indicator');
    if (indicator) {
      indicator.style.color = isActive ? '#22c55e' : '#ef4444';
      indicator.title = isActive ? 'AI Agent Active' : 'AI Agent Inactive';
    }
    this.isConnected = isActive;
  }

  updateAutonomyLevel(level) {
    const autonomyEl = document.getElementById('ai-autonomy');
    if (autonomyEl) {
      autonomyEl.textContent = `Autonomy: ${(level * 100).toFixed(0)}%`;
    }
  }

  async sendMessage() {
    const input = document.getElementById('ai-input');
    const message = input.value.trim();
    
    if (!message || !this.isConnected) return;
    
    // Clear input and disable send button
    input.value = '';
    this.setSendButtonState(false);
    
    // Add user message to chat
    this.addMessage(message, 'user');
    
    // Show thinking indicator
    this.showThinking();
    
    try {
      const response = await fetch('/ai-agent/interact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': this.getUserId()
        },
        body: JSON.stringify({
          input: message,
          context: {
            sessionId: this.sessionId || this.generateSessionId()
          }
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.sessionId = data.result.sessionId;
        this.addAIResponse(data.result);
      } else {
        this.addMessage('Sorry, I encountered an error processing your request.', 'ai', { error: true });
      }
      
    } catch (error) {
      console.error('AI interaction error:', error);
      this.addMessage('Sorry, I\'m having trouble connecting right now.', 'ai', { error: true });
    } finally {
      this.hideThinking();
      this.setSendButtonState(true);
    }
  }

  addMessage(content, sender, meta = {}) {
    const chatContainer = document.getElementById('ai-chat-container');
    const messageEl = document.createElement('div');
    messageEl.className = 'ai-message';
    
    const isUser = sender === 'user';
    const avatar = isUser ? 
      '<div class="ai-avatar user-avatar">U</div>' : 
      '<div class="ai-avatar">🤖</div>';
    
    const contentClass = isUser ? 'user-message-content' : 'ai-message-content';
    
    messageEl.innerHTML = `
      ${avatar}
      <div class="${contentClass}">
        <p>${content}</p>
        ${meta.tags ? `<div class="ai-message-meta">${meta.tags}</div>` : ''}
      </div>
    `;
    
    chatContainer.appendChild(messageEl);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    this.interactionHistory.push({ content, sender, timestamp: new Date(), meta });
  }

  addAIResponse(result) {
    const content = result.response.content || 'I processed your request.';
    const meta = this.buildMetaTags(result);
    
    this.addMessage(content, 'ai', { tags: meta });
    
    // Show autonomous actions if any
    if (result.response.autonomousActions?.length > 0) {
      const actionsContent = `<strong>Autonomous Actions:</strong><br>• ${result.response.autonomousActions.join('<br>• ')}`;
      this.addMessage(actionsContent, 'ai', { autonomous: true });
    }
    
    // Show suggestions if any
    if (result.response.suggestions?.length > 0) {
      const suggestionsContent = `<strong>Suggestions:</strong><br>• ${result.response.suggestions.join('<br>• ')}`;
      this.addMessage(suggestionsContent, 'ai', { suggestions: true });
    }
  }

  buildMetaTags(result) {
    const tags = [];
    
    if (result.confidence) {
      tags.push(`<span class="ai-meta-tag ai-confidence-tag">Confidence: ${(result.confidence * 100).toFixed(0)}%</span>`);
    }
    
    if (result.emotionalState?.primaryEmotion) {
      tags.push(`<span class="ai-meta-tag ai-emotion-tag">Emotion: ${result.emotionalState.primaryEmotion}</span>`);
    }
    
    if (result.autonomyLevel) {
      tags.push(`<span class="ai-meta-tag">Autonomy: ${(result.autonomyLevel * 100).toFixed(0)}%</span>`);
    }
    
    if (result.processingTime) {
      tags.push(`<span class="ai-meta-tag">Time: ${result.processingTime}ms</span>`);
    }
    
    return tags.join('');
  }

  showThinking() {
    const chatContainer = document.getElementById('ai-chat-container');
    const thinkingEl = document.createElement('div');
    thinkingEl.id = 'ai-thinking-indicator';
    thinkingEl.className = 'ai-message';
    thinkingEl.innerHTML = `
      <div class="ai-avatar">🤖</div>
      <div class="ai-message-content">
        <div class="ai-thinking">
          <span>Thinking</span>
          <div class="ai-thinking-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    `;
    
    chatContainer.appendChild(thinkingEl);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  hideThinking() {
    const thinkingEl = document.getElementById('ai-thinking-indicator');
    if (thinkingEl) {
      thinkingEl.remove();
    }
  }

  setSendButtonState(enabled) {
    const sendBtn = document.getElementById('ai-send');
    if (sendBtn) {
      sendBtn.disabled = !enabled;
      sendBtn.textContent = enabled ? 'Send' : '...';
    }
  }

  clearChat() {
    const chatContainer = document.getElementById('ai-chat-container');
    chatContainer.innerHTML = `
      <div class="ai-welcome-message">
        <div class="ai-avatar">🤖</div>
        <div class="ai-message-content">
          <p>Chat cleared. How can I help you today?</p>
        </div>
      </div>
    `;
    this.interactionHistory = [];
    this.sessionId = null;
  }

  async showInsights() {
    const insightsPanel = document.getElementById('ai-insights-panel');
    const insightsContent = document.getElementById('ai-insights-content');
    
    insightsPanel.style.display = 'block';
    insightsContent.innerHTML = '<div class="ai-thinking">Loading insights...</div>';
    
    try {
      const response = await fetch('/ai-agent/insights', {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.renderInsights(data.insights);
      } else {
        insightsContent.innerHTML = '<p>Insights require authentication.</p>';
      }
    } catch (error) {
      insightsContent.innerHTML = '<p>Failed to load insights.</p>';
    }
  }

  renderInsights(insights) {
    const insightsContent = document.getElementById('ai-insights-content');
    let html = '';
    
    if (insights.dreamInsights?.length > 0) {
      html += '<h5>Dream Insights</h5>';
      insights.dreamInsights.slice(0, 3).forEach(insight => {
        html += `<p><small>${insight.insight || insight.type}</small></p>`;
      });
    }
    
    if (insights.memoryStats) {
      html += '<h5>Memory Statistics</h5>';
      html += `<p><small>Short-term: ${insights.memoryStats.shortTerm}</small></p>`;
      html += `<p><small>Long-term: ${insights.memoryStats.longTerm}</small></p>`;
    }
    
    if (insights.geneticOptimization) {
      html += '<h5>Optimization</h5>';
      html += `<p><small>Fitness: ${(insights.geneticOptimization.fitness * 100).toFixed(1)}%</small></p>`;
    }
    
    if (!html) {
      html = '<p><small>No insights available yet.</small></p>';
    }
    
    insightsContent.innerHTML = html;
  }

  hideInsights() {
    const insightsPanel = document.getElementById('ai-insights-panel');
    insightsPanel.style.display = 'none';
  }

  getUserId() {
    return localStorage.getItem('ai-user-id') || 'anonymous';
  }

  getAuthToken() {
    return localStorage.getItem('auth-token') || '';
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIInteractionPanel;
}

// Auto-initialize if container exists
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('ai-interaction-panel');
  if (container && !window.aiInteractionPanel) {
    window.aiInteractionPanel = new AIInteractionPanel('ai-interaction-panel');
  }
});