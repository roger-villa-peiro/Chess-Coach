
const apiKey = 'AIzaSyAyrmnYwVsqPodWrCJuZNwaVkjX1wTX3uM';
const model = 'gemini-3-pro-preview';

async function testFullPayload() {
    console.log(`Testing Gemini 3 with systemInstruction...`);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemInstruction: {
                    parts: [{ text: "You are a professional chess coach named GM Caissa." }]
                },
                contents: [
                    { role: 'user', parts: [{ text: "Hello coach, what is the Woodpecker Method?" }] }
                ],
                generationConfig: {
                    maxOutputTokens: 1000,
                    temperature: 0.7
                }
            })
        });

        if (response.ok) {
            const data = await response.json();
            console.log(`[SUCCESS] Response:`, data.candidates?.[0]?.content?.parts?.[0]?.text);
        } else {
            console.log(`[FAIL] Status ${response.status}`);
            const text = await response.text();
            console.log('Error details:', text);
        }
    } catch (e) {
        console.log(`[ERROR]:`, e.message);
    }
}

testFullPayload();
