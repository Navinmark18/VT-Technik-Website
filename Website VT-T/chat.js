// KI Chat Widget Management
class ChatWidget {
    constructor() {
        this.chatToggle = document.getElementById('chat-toggle');
        this.chatClose = document.getElementById('chat-close');
        this.chatContainer = document.getElementById('chat-container');
        this.chatMessages = document.getElementById('chat-messages');
        this.chatInput = document.getElementById('chat-input');
        this.chatSend = document.getElementById('chat-send');
        
        this.conversationHistory = [];
        this.isLoading = false;

        this.initEventListeners();
    }

    initEventListeners() {
        if (this.chatToggle) {
            this.chatToggle.addEventListener('click', () => this.toggleChat());
        }
        
        if (this.chatClose) {
            this.chatClose.addEventListener('click', () => this.closeChat());
        }
        
        if (this.chatSend) {
            this.chatSend.addEventListener('click', () => this.sendMessage());
        }
        
        if (this.chatInput) {
            this.chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey && !this.isLoading) {
                    this.sendMessage();
                }
            });
        }

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (this.chatContainer && 
                !this.chatContainer.contains(e.target) && 
                this.chatToggle && 
                !this.chatToggle.contains(e.target)) {
                this.closeChat();
            }
        });
    }

    toggleChat() {
        if (this.chatContainer) {
            this.chatContainer.classList.toggle('active');
            if (this.chatContainer.classList.contains('active') && this.chatInput) {
                this.chatInput.focus();
            }
        }
    }

    closeChat() {
        if (this.chatContainer) {
            this.chatContainer.classList.remove('active');
        }
    }

    async sendMessage() {
        const message = this.chatInput?.value?.trim();
        if (!message || this.isLoading) {
            return;
        }

        // Add user message to UI
        this.addMessageToUI(message, 'user');
        this.conversationHistory.push({
            role: 'user',
            content: message
        });

        // Clear input
        if (this.chatInput) {
            this.chatInput.value = '';
        }

        // Set loading state
        this.setLoading(true);
        this.showLoadingIndicator();

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message,
                    history: this.conversationHistory.slice(-6) // Last 6 messages
                })
            });

            const data = await response.json();

            if (data.ok) {
                const reply = data.message;
                this.addMessageToUI(reply, 'bot');
                this.conversationHistory.push({
                    role: 'assistant',
                    content: reply
                });
            } else {
                const errorMsg = data.message || 'Es tut mir leid, ich konnte keine Antwort generieren.';
                this.addMessageToUI(errorMsg, 'error');
            }
        } catch (error) {
            console.error('Chat error:', error);
            this.addMessageToUI('Entschuldigung, es gibt gerade ein technisches Problem. Bitte versuche es später erneut.', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    addMessageToUI(message, role) {
        if (!this.chatMessages) return;

        // Remove loading indicator if present
        const loadingIndicator = this.chatMessages.querySelector('.chat-loading');
        if (loadingIndicator) {
            loadingIndicator.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${role}`;
        messageDiv.textContent = message;
        this.chatMessages.appendChild(messageDiv);

        // Auto scroll to bottom
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    showLoadingIndicator() {
        if (!this.chatMessages) return;

        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'chat-loading';
        loadingDiv.innerHTML = '<span></span><span></span><span></span>';
        this.chatMessages.appendChild(loadingDiv);

        // Auto scroll
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    setLoading(isLoading) {
        this.isLoading = isLoading;         // Disable/enable input and send button
        if (this.chatSend) {
            this.chatSend.disabled = isLoading;
        }
        if (this.chatInput) {
            this.chatInput.disabled = isLoading;        // Optionally add a CSS class to indicate
        }
    }
}

// Initialize chat widget when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new ChatWidget();
    });
} else {
    new ChatWidget();
}
