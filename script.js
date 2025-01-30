document.addEventListener('DOMContentLoaded', function() {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const welcomeMessage = document.getElementById('welcome-message');

    async function addMessage(message, isUser) {
        welcomeMessage.style.display = 'none';
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
        messageDiv.textContent = message;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async function getMedicalResponse(userMessage) {
        try {
            const response = await fetch('/api/medical-advice', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt: userMessage })
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            return data.response;
        } catch (error) {
            console.error('Error:', error);
            return 'I apologize, but I encountered an error processing your request. Please try again.';
        }
    }

    async function handleUserInput() {
        const message = userInput.value.trim();
        if (message) {
            addMessage(message, true);
            userInput.value = '';
            userInput.disabled = true;
            sendButton.disabled = true;

            // Show loading indicator
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'message ai-message';
            loadingDiv.textContent = 'Thinking...';
            chatMessages.appendChild(loadingDiv);

            // Get AI response
            const response = await getMedicalResponse(message);
            
            // Remove loading indicator
            chatMessages.removeChild(loadingDiv);
            
            // Add AI response
            addMessage(response, false);

            userInput.disabled = false;
            sendButton.disabled = false;
            userInput.focus();
        }
    }

    sendButton.addEventListener('click', handleUserInput);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleUserInput();
        }
    });
}); 