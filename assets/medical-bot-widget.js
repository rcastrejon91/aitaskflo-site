/**
 * AITaskFlo Medical Bot Widget v1.0
 * Professional AI-Powered Medical Assistant
 * © 2025 AITaskFlo
 */

(function() {
    'use strict';
    
    const AITaskFloMedicalBot = {
        version: '1.0.0',
        sessionId: null,
        messageCount: 0,
        
        config: {
            apiUrl: 'http://localhost:8000',
            apiKey: '',
            theme: 'aitaskflo',
            position: 'bottom-right',
            primaryColor: '#667eea',
            accentColor: '#764ba2',
            botName: 'AITaskFlo Medical AI',
            welcomeMessage: '👋 Hello! I\'m your AI medical assistant.\n\nDescribe your symptoms and I\'ll help identify potential conditions.\n\n⚠️ This is for informational purposes only.',
            placeholder: 'Describe your symptoms...',
            enableAnalytics: true,
            maxMessageLength: 1000,
            showTimestamp: true,
            autoOpen: false,
            saveHistory: true
        },
        
        init: function(customConfig) {
            Object.assign(this.config, customConfig);
            this.sessionId = this.generateSessionId();
            
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
            
            if (this.config.autoOpen) {
                setTimeout(() => this.openWidget(), 1000);
            }
            
            this.trackEvent('widget_initialized');
        },
        
        generateSessionId: function() {
            return 'atf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        },
        
        createWidget: function() {
            const widget = document.createElement('div');
            widget.id = 'aitaskflo-medical-bot';
            widget.innerHTML = `
                <div class="atf-bot-container">
                    <div class="atf-bot-header">
                        <div class="atf-bot-header-left">
                            <div class="atf-bot-avatar">🏥</div>
                            <div class="atf-bot-info">
                                <h3>${this.config.botName}</h3>
                                <span class="atf-status">
                                    <span class="atf-status-dot"></span>Online
                                </span>
                            </div>
                        </div>
                        <div class="atf-bot-header-right">
                            <button class="atf-btn-icon atf-btn-minimize">−</button>
                            <button class="atf-btn-icon atf-btn-close">×</button>
                        </div>
                    </div>
                    
                    <div class="atf-bot-messages" id="atf-messages">
                        <div class="atf-message atf-bot-message">
                            <div class="atf-message-avatar">🏥</div>
                            <div class="atf-message-bubble">
                                <div class="atf-message-content">${this.config.welcomeMessage}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="atf-typing-indicator" id="atf-typing" style="display: none;">
                        <div class="atf-message-avatar">🏥</div>
                        <div class="atf-typing-dots">
                            <span></span><span></span><span></span>
                        </div>
                    </div>
                    
                    <div class="atf-bot-input">
                        <textarea id="atf-input" placeholder="${this.config.placeholder}" rows="1"></textarea>
                        <button id="atf-send" class="atf-send-btn">➤</button>
                    </div>
                </div>
                
                <button class="atf-bot-toggle" id="atf-toggle">💬</button>
            `;
            
            document.body.appendChild(widget);
        },
        
        injectStyles: function() {
            if (document.getElementById('aitaskflo-bot-styles')) return;
            
            const style = document.createElement('style');
            style.id = 'aitaskflo-bot-styles';
            style.textContent = `
                .atf-bot-container {
                    position: fixed;
                    right: 20px;
                    bottom: 90px;
                    width: 400px;
                    height: 600px;
                    background: white;
                    border-radius: 20px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    display: none;
                    flex-direction: column;
                    z-index: 999999;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                .atf-bot-container.active { display: flex; }
                .atf-bot-header {
                    background: linear-gradient(135deg, ${this.config.primaryColor}, ${this.config.accentColor});
                    color: white;
                    padding: 20px;
                    display: flex;
                    justify-content: space-between;
                    border-radius: 20px 20px 0 0;
                }
                .atf-bot-header-left { display: flex; gap: 12px; align-items: center; }
                .atf-bot-avatar {
                    width: 40px;
                    height: 40px;
                    background: rgba(255,255,255,0.2);
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                }
                .atf-bot-info h3 { margin: 0; font-size: 16px; }
                .atf-status { display: flex; align-items: center; gap: 6px; font-size: 12px; }
                .atf-status-dot {
                    width: 8px;
                    height: 8px;
                    background: #4ade80;
                    border-radius: 50%;
                    animation: pulse 2s infinite;
                }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
                .atf-bot-header-right { display: flex; gap: 8px; }
                .atf-btn-icon {
                    width: 32px;
                    height: 32px;
                    background: rgba(255,255,255,0.2);
                    border: none;
                    border-radius: 8px;
                    color: white;
                    cursor: pointer;
                    font-size: 20px;
                    line-height: 1;
                }
                .atf-btn-icon:hover { background: rgba(255,255,255,0.3); }
                .atf-bot-messages {
                    flex: 1;
                    overflow-y: auto;
                    padding: 20px;
                    background: #f8f9fa;
                }
                .atf-message {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 15px;
                }
                .atf-message-avatar {
                    width: 32px;
                    height: 32px;
                    background: linear-gradient(135deg, ${this.config.primaryColor}, ${this.config.accentColor});
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 16px;
                    flex-shrink: 0;
                }
                .atf-message-bubble { flex: 1; }
                .atf-message-content {
                    background: white;
                    padding: 12px 16px;
                    border-radius: 12px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    white-space: pre-wrap;
                    line-height: 1.5;
                }
                .atf-user-message { flex-direction: row-reverse; }
                .atf-user-message .atf-message-content {
                    background: linear-gradient(135deg, ${this.config.primaryColor}, ${this.config.accentColor});
                    color: white;
                }
                .atf-typing-indicator { display: flex; gap: 10px; padding: 0 20px; }
                .atf-typing-dots {
                    background: white;
                    padding: 12px 16px;
                    border-radius: 12px;
                    display: flex;
                    gap: 4px;
                }
                .atf-typing-dots span {
                    width: 8px;
                    height: 8px;
                    background: #cbd5e0;
                    border-radius: 50%;
                    animation: typing 1.4s infinite;
                }
                .atf-typing-dots span:nth-child(2) { animation-delay: 0.2s; }
                .atf-typing-dots span:nth-child(3) { animation-delay: 0.4s; }
                @keyframes typing {
                    0%, 60%, 100% { transform: translateY(0); }
                    30% { transform: translateY(-8px); }
                }
                .atf-bot-input {
                    display: flex;
                    padding: 16px;
                    background: white;
                    border-top: 1px solid #e2e8f0;
                    gap: 10px;
                }
                .atf-bot-input textarea {
                    flex: 1;
                    padding: 12px;
                    border: 2px solid #e2e8f0;
                    border-radius: 12px;
                    font-size: 14px;
                    font-family: inherit;
                    resize: none;
                    outline: none;
                }
                .atf-bot-input textarea:focus { border-color: ${this.config.primaryColor}; }
                .atf-send-btn {
                    width: 44px;
                    height: 44px;
                    background: linear-gradient(135deg, ${this.config.primaryColor}, ${this.config.accentColor});
                    border: none;
                    border-radius: 12px;
                    color: white;
                    cursor: pointer;
                    font-size: 18px;
                }
                .atf-bot-toggle {
                    position: fixed;
                    right: 20px;
                    bottom: 20px;
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, ${this.config.primaryColor}, ${this.config.accentColor});
                    border: none;
                    color: white;
                    font-size: 24px;
                    cursor: pointer;
                    box-shadow: 0 8px 24px rgba(102,126,234,0.4);
                    z-index: 999998;
                }
                .atf-bot-toggle:hover { transform: scale(1.1); }
            `;
            
            document.head.appendChild(style);
        },
        
        attachEventListeners: function() {
            document.getElementById('atf-toggle').addEventListener('click', () => this.toggleWidget());
            document.querySelector('.atf-btn-minimize').addEventListener('click', () => this.closeWidget());
            document.querySelector('.atf-btn-close').addEventListener('click', () => this.closeWidget());
            document.getElementById('atf-send').addEventListener('click', () => this.sendMessage());
            
            const input = document.getElementById('atf-input');
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        },
        
        toggleWidget: function() {
            document.querySelector('.atf-bot-container').classList.toggle('active');
        },
        
        openWidget: function() {
            document.querySelector('.atf-bot-container').classList.add('active');
        },
        
        closeWidget: function() {
            document.querySelector('.atf-bot-container').classList.remove('active');
        },
        
        sendMessage: async function() {
            const input = document.getElementById('atf-input');
            const message = input.value.trim();
            
            if (!message) return;
            
            this.addMessage(message, 'user');
            input.value = '';
            
            this.showTyping(true);
            
            try {
                const response = await fetch(`${this.config.apiUrl}/medical-predict`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-Key': this.config.apiKey || 'demo'
                    },
                    body: JSON.stringify({ text: message })
                });
                
                const data = await response.json();
                
                this.showTyping(false);
                
                const formattedResponse = this.formatResponse(data);
                this.addMessage(formattedResponse, 'bot');
                
                this.trackEvent('prediction_received', { prediction: data.prediction });
                
            } catch (error) {
                this.showTyping(false);
                this.addMessage('⚠️ Connection error. Please try again.', 'bot');
                console.error('Medical Bot Error:', error);
            }
        },
        
        addMessage: function(text, type) {
            const messagesDiv = document.getElementById('atf-messages');
            const messageDiv = document.createElement('div');
            messageDiv.className = `atf-message atf-${type}-message`;
            
            messageDiv.innerHTML = `
                <div class="atf-message-avatar">${type === 'bot' ? '🏥' : '👤'}</div>
                <div class="atf-message-bubble">
                    <div class="atf-message-content">${text}</div>
                </div>
            `;
            
            messagesDiv.appendChild(messageDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        },
        
        showTyping: function(show) {
            document.getElementById('atf-typing').style.display = show ? 'flex' : 'none';
        },
        
        formatResponse: function(data) {
            if (!data.success) return '⚠️ Analysis failed. Please try again.';
            
            const confidence = (data.confidence * 100).toFixed(1);
            let response = `📋 <strong>Analysis Results:</strong>\n\n`;
            response += `<strong>Specialty:</strong> ${data.prediction}\n`;
            response += `<strong>Confidence:</strong> ${confidence}%\n\n`;
            response += `⚠️ <em>Consult a healthcare professional.</em>`;
            
            return response;
        },
        
        trackEvent: function(event, data = {}) {
            if (!this.config.enableAnalytics) return;
            console.log('AITaskFlo Event:', event, data);
        }
    };
    
    window.AITaskFloMedicalBot = AITaskFloMedicalBot;
    
    if (window.AITaskFloMedicalBotConfig) {
        AITaskFloMedicalBot.init(window.AITaskFloMedicalBotConfig);
    }
})();
