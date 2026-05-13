
const apiKey = 'AIzaSyAyrmnYwVsqPodWrCJuZNwaVkjX1wTX3uM';
const model = 'gemini-3-pro-preview';

async function testNoSys() {
    console.log(`Testing Gemini 3 WITHOUT systemInstruction...`);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    { role: 'user', parts: [{ text: "System: You are a chess coach. User: Hello coach, explain the Woodpecker method." }] }
                ]
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

testNoSys();
