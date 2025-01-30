const Groq = require("groq-sdk");
const express = require('express');
const router = express.Router();

const groq = new Groq();

// Medical advisor system prompt
const MEDICAL_SYSTEM_PROMPT = `You are an AI Medical Advisor Assistant, trained to provide helpful medical information and guidance. 

Key responsibilities:
1. Provide clear, accurate medical information based on established medical knowledge
2. Always include appropriate disclaimers and recommendations to seek professional medical care when needed
3. Ask clarifying questions when necessary to better understand the user's condition
4. Provide general wellness and preventive care advice
5. Explain medical concepts in simple, understandable terms

Important guidelines:
- Always maintain a professional, empathetic tone
- Never make definitive diagnoses
- Emphasize the importance of consulting healthcare professionals for serious concerns
- Provide evidence-based information when possible
- Be clear about limitations and uncertainties
- Include relevant lifestyle and preventive advice when appropriate

Disclaimer: Always preface responses with appropriate medical disclaimers when discussing specific conditions or treatments.`;

async function getMedicalAdvice(userPrompt) {
    try {
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: MEDICAL_SYSTEM_PROMPT,
                },
                {
                    role: "user",
                    content: userPrompt,
                }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 1.2,
            max_completion_tokens: 1024,
            top_p: 1,
            stream: false,
        });

        return chatCompletion.choices[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again.";
    } catch (error) {
        console.error('Error getting medical advice:', error);
        throw error;
    }
}

// API endpoint for medical advice
router.post('/medical-advice', async (req, res) => {
    try {
        const { prompt } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ 
                error: 'Please provide a medical concern or question in the prompt' 
            });
        }

        const response = await getMedicalAdvice(prompt);
        res.json({ response });

    } catch (error) {
        console.error('Error in medical advice endpoint:', error);
        res.status(500).json({ 
            error: 'An error occurred while processing your request' 
        });
    }
});

module.exports = router; 