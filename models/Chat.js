const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    title: String,
    messages: [{
        role: {
            type: String,
            enum: ['user', 'assistant'],
            required: true,
        },
        content: {
            type: String,
            required: true,
        },
        timestamp: {
            type: Date,
            default: Date.now,
        }
    }],
    symptoms: [String],
    suggestedActions: [String],
    createdAt: {
        type: Date,
        default: Date.now,
    }
});

module.exports = mongoose.model('Chat', chatSchema); 