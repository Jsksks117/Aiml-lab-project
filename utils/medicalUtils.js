const natural = require('natural');
const tokenizer = new natural.WordTokenizer();

const symptomKeywords = [
    'pain', 'ache', 'fever', 'cough', 'fatigue',
    'nausea', 'dizziness', 'headache', 'rash',
    // Add more symptoms...
];

async function analyzeSymptoms(text) {
    const tokens = tokenizer.tokenize(text.toLowerCase());
    return symptomKeywords.filter(symptom => 
        tokens.includes(symptom)
    );
}

async function generateSummary(text) {
    // Simple summary generation - first sentence
    return text.split('.')[0] + '.';
}

module.exports = {
    analyzeSymptoms,
    generateSummary
}; 