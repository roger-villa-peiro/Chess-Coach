
const apiKey = 'AIzaSyAyrmnYwVsqPodWrCJuZNwaVkjX1wTX3uM';
const model = 'gemini-3-pro-preview';

async function testModel(modelName) {
    console.log(`Testing model: ${modelName}...`);
    // Increased timeout to 30 seconds just in case it's very slow
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    try {
        const start = Date.now();
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    role: 'user',
                    parts: [{ text: "Hello, are you there?" }]
                }]
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        const duration = Date.now() - start;

        if (!response.ok) {
            console.error(`[FAIL] ${modelName}: Status ${response.status}`);
            const text = await response.text();
            console.error('Error details:', text);
        } else {
            const data = await response.json();
            console.log(`[SUCCESS] ${modelName} responded in ${duration}ms.`);
            if (data.candidates && data.candidates.length > 0) {
                console.log('Response:', data.candidates[0].content.parts[0].text.substring(0, 100) + '...');
            } else {
                console.log('Response received but no candidates found:', JSON.stringify(data, null, 2));
            }
        }
    } catch (error) {
        clearTimeout(timeoutId);
        console.error(`[ERROR] ${modelName}:`, error.message);
    }
}

testModel(model);
