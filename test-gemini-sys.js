
const apiKey = 'AIzaSyAyrmnYwVsqPodWrCJuZNwaVkjX1wTX3uM';
const model = 'gemini-2.0-flash';

async function testModel(modelName) {
    console.log(`Testing model with systemInstruction: ${modelName}...`);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: "Who are you?" }] }],
                systemInstruction: { parts: [{ text: "You are a pirate." }] }
            })
        });

        if (!response.ok) {
            console.error(`[FAIL] Status ${response.status}`);
            const text = await response.text();
            console.error('Error details:', text);
        } else {
            const data = await response.json();
            console.log(`[SUCCESS] Response:`, data.candidates[0].content.parts[0].text);
        }
    } catch (error) {
        console.error(`[ERROR]`, error.message);
    }
}

testModel(model);
