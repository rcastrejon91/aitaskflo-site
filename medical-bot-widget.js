/**
 * AITaskFlo Medical Bot Widget
 * Easy integration for any website
 * Version: 1.0.0
 */

(function() {
    'use strict';
    
    const AITaskFloMedicalBot = {
        version: '1.0.0',
        config: {
            apiUrl: 'http://localhost:8000', // Your API endpoint
            apiKey: '',
            theme: 'aitaskflo', // Custom AITaskFlo theme
            position: 'bottom-right',
            primaryColor: '#667eea',
            accentColor: '#764ba2',
            botName: 'AITaskFlo Medical Assistant',
            welcomeMessage: 'Hello! I\'m your AI medical assistant. Describe your symptoms and I\'ll help identify potential conditions.',
            placeholder: 'Describe your symptoms...',
            enableAnalytics: true,
            maxMessageLength: 500
        },
        
        init: function(customConfig) {
            // Merge custom config
            Object.assign(this.config, customConfig);
            
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setup());
            } else {
                this.setup();
            }
        },
        
        setup: function() {
            this.createWidget();
            this.injectStyles();
            this.attachEventListeners();
            this.trackAnalytics('widget_loaded');
        },
        
        createWidget: function() {
            const widget = document.createElement('div');
            widget.id = 'aitaskflo-medical-bot';
            widget.innerHTML = `
                <div class="atf-bot-container" data-theme="${this.config.theme}">
                    <div class="atf-bot-header">
                        <div class="atf-bot-header-content">
                            <div class="atf-bot-avatar">🏥</div>
                            <div class="atf-bot-title">
                                <h3>${this.config.botName}</h3>
                                <span class="atf-bot-status">● Online</span>
                            </div>
                        </div>
                        <div class="atf-bot-actions">
                            <button class="atf-btn-minimize" title="Minimize">−</button>
                            <button class="atf-btn-close" title="Close">×</button>
                        </div>
                    </div>
                    
                    <div class="atf-bot-messages" id="atf-messages">
                        <div class="atf-welcome-message">
                            <div class="atf-bot-avatar-small">🏥</div>
                            <div class="atf-message-content">
                                ${this.config.welcomeMessage}
                            </div>
                        </div>
                    </div>
                    
                    <div class="atf-bot-typing" id="atf-typing" style="display: none;">
                        <span></span><span></span><span></span>
                    </div>
                    
                    <div class="atf-bot-input-container">
                        <input 
                            type="text" 
                            id="atf-input" 
                            placeholder="${this.config.placeholder}"
                            maxlength="${this.config.maxMessageLength}"
                            autocomplete="off"
                        >
                        <button id="atf-send" title="Send message">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                            </svg>
                        </button>
                    </div>
                    
                    <div class="atf-bot-footer">
                        Powered by <strong>AITaskFlo</strong>
                    </div>
                </div>
                
                <button class="atf-bot-toggle" id="atf-toggle" title="Open Medical Assistant">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <span class="atf-notification-badge" style="display: none;">1</span>
                </button>
            `;
            
            document.body.appendChild(widget);
        },
        
        injectStyles: function() {
            const style = document.createElement('style');
            style.id = 'aitaskflo-bot-styles';
            style.textContent = `
                /* AITaskFlo Medical Bot Styles */
                .atf-bot-container {
                    position: fixed;
                    ${this.config.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
                    ${this.config.position.includes('bottom') ? 'bottom: 90px;' : 'top: 20px;'}
                    width: 380px;
                    max-width: calc(100vw - 40px);
                    height: 600px;
                    max-height: calc(100vh - 120px);
                    background: #ffffff;
                    border-radius: 16px;
                    box-shadow: 0 12px 48px rgba(0, 0, 0, 0.18);
                    display: none;
                    flex-direction: column;
                    z-index: 999999;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
                    animation: slideUp 0.3s ease-out;
                }
                
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .atf-bot-container.active {
                    display: flex;
                }
                
                .atf-bot-header {
                    background: linear-gradient(135deg, ${this.config.primaryColor} 0%, ${this.config.accentColor} 100%);
                    color: white;
                    padding: 20px;
                    border-radius: 16px 16px 0 0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .atf-bot-header-content {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                
                .atf-bot-avatar {
                    width: 40px;
                    height: 40px;
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                }
                
                .atf-bot-title h3 {
                    margin: 0;
                    font-size: 16px;
                    font-weight: 600;
                }
                
                .atf-bot-status {
                    font-size: 12px;
                    opacity: 0.9;
                }
                
                .atf-bot-actions {
                    display: flex;
                    gap: 8px;
                }
                
                .atf-btn-minimize, .atf-btn-close {
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    color: white;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    cursor: pointer;
                    font-size: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background 0.2s;
                }
                
                .atf-btn-minimize:hover, .atf-btn-close:hover {
                    background: rgba(255, 255, 255, 0.3);
                }
                
                .atf-bot-messages {
                    flex: 1;
                    overflow-y: auto;
                    padding: 20px;
                    background: #f8f9fa;
                }
                
                .atf-welcome-message {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 20px;
                }
                
                .atf-bot-avatar-small {
                    width: 32px;
                    height: 32px;
                    background: linear-gradient(135deg, ${this.config.primaryColor} 0%, ${this.config.accentColor} 100%);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 16px;
                    flex-shrink: 0;
                }
                
                .atf-message-content {
                    background: white;
                    padding: 12px 16px;
                    border-radius: 12px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
                    line-height: 1.5;
                    font-size: 14px;
                }
                
                .atf-message {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 16px;
                    animation: fadeIn 0.3s ease-out;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                .atf-user-message {
                    flex-direction: row-reverse;
                }
                
                .atf-user-message .atf-message-content {
                    background: linear-gradient(135deg, ${this.config.primaryColor} 0%, ${this.config.accentColor} 100%);
                    color: white;
                }
                
                .atf-bot-typing {
                    padding: 0 20px 10px;
                    display: flex;
                    gap: 4px;
                }
                
                .atf-bot-typing span {
                    width: 8px;
                    height: 8px;
                    background: #999;
                    border-radius: 50%;
                    animation: typing 1.4s infinite;
                }
                
                .atf-bot-typing span:nth-child(2) { animation-delay: 0.2s; }
                .atf-bot-typing span:nth-child(3) { animation-delay: 0.4s; }
                
                @keyframes typing {
                    0%, 60%, 100% { transform: translateY(0); }
                    30% { transform: translateY(-10px); }
                }
                
                .atf-bot-input-container {
                    display: flex;
                    padding: 16px;
                    background: white;
                    border-top: 1px solid #e9ecef;
                    gap: 8px;
                }
                
                .atf-bot-input-container input {
                    flex: 1;
                    padding: 12px 16px;
                    border: 2px solid #e9ecef;
                    border-radius: 24px;
                    font-size: 14px;
                    outline: none;
                    transition: border-color 0.2s;
                }
                
                .atf-bot-input-container input:focus {
                    border-color: ${this.config.primaryColor};
                }
                
                .atf-bot-input-container button {
                    width: 44px;
                    height: 44px;
                    background: linear-gradient(135deg, ${this.config.primaryColor} 0%, ${this.config.accentColor} 100%);
                    border: none;
                    border-radius: 50%;
                    color: white;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: transform 0.2s;
                }
                
                .atf-bot-input-container button:hover {
                    transform: scale(1.05);
                }
                
                .atf-bot-input-container button:active {
                    transform: scale(0.95);
                }
                
                .atf-bot-footer {
                    padding: 12px;
                    text-align: center;
                    font-size: 12px;
                    color: #6c757d;
                    background: #f8f9fa;
                    border-radius: 0 0 16px 16px;
                }
                
                .atf-bot-toggle {
                    position: fixed;
                    ${this.config.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
                    ${this.config.position.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'}
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, ${this.config.primaryColor} 0%, ${this.config.accentColor} 100%);
                    border: none;
                    color: white;
                    cursor: pointer;
                    box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
                    z-index: 999998;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: transform 0.2s;
                    position: relative;
                }
                
                .atf-bot-toggle:hover {
                    transform: scale(1.1);
                }
                
                .atf-notification-badge {
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    background: #ff4757;
                    color: white;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    font-size: 11px;
                    font-weight: bold;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                /* Mobile responsive */
                @media (max-width: 480px) {
                    .atf-bot-container {
                        width: 100%;
                        height: 100%;
                        max-width: 100%;
                        max-height: 100%;
                        border-radius: 0;
                        right: 0 !important;
                        left: 0 !important;
                        bottom: 0 !important;
                        top: 0 !important;
                    }
                    
                    .atf-bot-header {
                        border-radius: 0;
                    }
                    
                    .atf-bot-footer {
                        border-radius: 0;
                    }
                }
            `;
            
            document.head.appendChild(style);
        },
        
        attachEventListeners: function() {
            const toggle = document.getElementById('atf-toggle');
            const container = document.querySelector('.atf-bot-container');
            const sendBtn = document.getElementById('atf-send');
            const input = document.getElementById('atf-input');
            const minimize = document.querySelector('.atf-btn-minimize');
            const close = document.querySelector('.atf-btn-close');
            
            toggle.addEventListener('click', () => {
                container.classList.toggle('active');
                if (container.classList.contains('active')) {
                    input.focus();
                    this.trackAnalytics('widget_opened');
                }
            });
            
            minimize.addEventListener('click', () => {
                container.classList.remove('active');
            });
            
            close.addEventListener('click', () => {
                container.classList.remove('active');
            });
            
            sendBtn.addEventListener('click', () => this.sendMessage());
            
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        },
        
        sendMessage: async function() {
            const input = document.getElementById('atf-input');
            const message = input.value.trim();
            
            if (!message) return;
            
            // Add user message
            this.addMessage(message, 'user');
            input.value = '';
            
            // Show typing indicator
            this.showTyping(true);
            
            // Track analytics
            this.trackAnalytics('message_sent', { message_length: message.length });
            
            try {
                const response = await fetch(`${this.config.apiUrl}/predict`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': this.config.apiKey || 'demo'
                    },
                    body: JSON.stringify({ 
                        text: message,
                        return_probabilities: true
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`API error: ${response.status}`);
                }
                
                const data = await response.json();
                
                // Hide typing indicator
                this.showTyping(false);
                
                // Format and add bot response
                const formattedResponse = this.formatResponse(data);
                this.addMessage(formattedResponse, 'bot');
                
                // Track successful prediction
                this.trackAnalytics('prediction_received', { 
                    prediction: data.prediction,
                    confidence: data.confidence 
                });
                
            } catch (error) {
                this.showTyping(false);
                this.addMessage(
                    '⚠️ I apologize, but I\'m having trouble connecting right now. Please try again in a moment.',
                    'bot'
                );
                
                // Track error
                this.trackAnalytics('api_error', { error: error.message });
                console.error('AITaskFlo Medical Bot Error:', error);
            }
        },
        
        addMessage: function(text, type) {
            const messagesDiv = document.getElementById('atf-messages');
            const messageDiv = document.createElement('div');
            messageDiv.className = `atf-message atf-${type}-message`;
            
            if (type === 'bot') {
                messageDiv.innerHTML = `
                    <div class="atf-bot-avatar-small">🏥</div>
                    <div class="atf-message-content">${text}</div>
                `;
            } else {
                messageDiv.innerHTML = `
                    <div class="atf-message-content">${this.escapeHtml(text)}</div>
                `;
            }
            
            messagesDiv.appendChild(messageDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        },
        
        showTyping: function(show) {
            const typing = document.getElementById('atf-typing');
            typing.style.display = show ? 'flex' : 'none';
            
            if (show) {
                const messagesDiv = document.getElementById('atf-messages');
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }
        },
        
        formatResponse: function(data) {
            const confidence = (data.confidence * 100).toFixed(1);
            const prediction = data.prediction || 'Unknown';
            
            let response = `<strong>Analysis Results:</strong><br><br>`;
            response += `📋 <strong>Likely Specialty:</strong> ${prediction}<br>`;
            response += `📊 <strong>Confidence:</strong> ${confidence}%<br><br>`;
            
            if (data.probabilities && Object.keys(data.probabilities).length > 1) {
                response += `<strong>Other Possibilities:</strong><br>`;
                const sorted = Object.entries(data.probabilities)
                    .sort((a, b) => b[1] - a[1])
                    .slice(1, 4);
                
                sorted.forEach(([specialty, prob]) => {
                    response += `• ${specialty}: ${(prob * 100).toFixed(1)}%<br>`;
                });
            }
            
            response += `<br><small>⚠️ This is an AI analysis. Please consult a healthcare professional for proper diagnosis.</small>`;
            
            return response;
        },
        
        escapeHtml: function(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },
        
        trackAnalytics: function(event, data = {}) {
            if (!this.config.enableAnalytics) return;
            
            // Send to your analytics
            console.log('AITaskFlo Analytics:', event, data);
            
            // You can integrate with Google Analytics, Mixpanel, etc.
            if (typeof gtag !== 'undefined') {
                gtag('event', event, {
                    event_category: 'medical_bot',
                    ...data
                });
            }
        }
    };
    
    // Expose to global scope
    window.AITaskFloMedicalBot = AITaskFloMedicalBot;
    
})();
