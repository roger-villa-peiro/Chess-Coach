
import { callGeminiWithRetry } from './services/gemini';

export type IntentType = 'CHAT' | 'ANALYSIS';

export interface IntentResult {
    type: IntentType;
    confidence: number;
    reasoning?: string;
}

export const classifyIntent = async (
    message: string,
    lastMessages: any[],
    apiKey: string
): Promise<IntentResult> => {
    // Default to ANALYSIS for safety if classification fails, 
    // but CHAT is the optimization target.

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        const data = await callGeminiWithRetry(url, {
            contents: [{
                role: 'user',
                parts: [{
                    text: `
You are a Cognitive Router for a Chess Coach AI. Your job is to classify the user's intent into one of two categories:

1. "CHAT": Casual conversation, greetings, simple questions like "Who are you?", "Hello", "Thanks", "Good morning". Not related to deep chess analysis.
2. "ANALYSIS": Requests for specific chess advice, analysis of moves, explanations of tactics, creating study plans, asking "Why is this a blunder?", "What should I play here?".

Analyze the following user input and recent context. Return ONLY a JSON object: { "type": "CHAT" | "ANALYSIS", "confidence": number }.

RECENT CONTEXT:
${lastMessages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}

USER INPUT: "${message}"
`
                }]
            }],
            generationConfig: {
                maxOutputTokens: 100,
                temperature: 0.1,
                responseMimeType: "application/json"
            },
        });

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) return { type: 'ANALYSIS', confidence: 0 };

        const result = JSON.parse(text);
        return {
            type: result.type === 'CHAT' ? 'CHAT' : 'ANALYSIS',
            confidence: result.confidence || 1
        };

    } catch (e) {
        console.error("Router error:", e);
        return { type: 'ANALYSIS', confidence: 0 };
    }
};
