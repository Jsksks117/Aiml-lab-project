const Groq = require("groq-sdk");
const express = require('express');
const router = express.Router();

const groq = new Groq();

const MEDICAL_SYSTEM_PROMPT = `You are an advanced Medical AI Assistant. Provide medical advice STRICTLY in this format ONLY:

🔍 Analysis:
• Provide a concise analysis of the symptoms/condition
• Mention potential causes
• List any risk factors

💊 Treatment Options:
• List possible treatment approaches
• Include self-care recommendations
• Mention relevant medications (general categories)

⚠️ When to Seek Immediate Care:
• List emergency warning signs
• Specify conditions requiring urgent attention

👨‍⚕️ Specialist Type:
• Mention the type of specialist to consult

Do not add any other sections or information beyond these four sections.`;

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
            model: "mixtral-8x7b-32768",
            temperature: 0.7,
            max_tokens: 2048,
            top_p: 0.9,
        });

        return chatCompletion.choices[0]?.message?.content || "I apologize, but I couldn't generate a response.";
    } catch (error) {
        console.error('Error getting medical advice:', error);
        throw error;
    }
}

router.post('/medical-advice', async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: 'Please provide a medical concern or question' });
        }
        const response = await getMedicalAdvice(prompt);
        res.json({ response });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'An error occurred while processing your request' });
    }
});

module.exports = router; 