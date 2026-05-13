
const apiKey = 'AIzaSyAyrmnYwVsqPodWrCJuZNwaVkjX1wTX3uM';
const model = 'gemini-2.0-flash'; // Testing a stable/available model

async function testModel(modelName) {
    console.log(`Testing model: ${modelName}...`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 sec timeout

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
                    parts: [{ text: "Hello, confirm you are working." }]
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
            console.log('Response:', data.candidates[0].content.parts[0].text.substring(0, 100) + '...');
        }
    } catch (error) {
        clearTimeout(timeoutId);
        console.error(`[ERROR] ${modelName}:`, error.message);
    }
}

testModel(model);
