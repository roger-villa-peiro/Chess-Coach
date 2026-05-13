
const apiKey = 'AIzaSyAyrmnYwVsqPodWrCJuZNwaVkjX1wTX3uM';
const model = 'gemini-3-pro-preview';

async function diagnose() {
    const versions = ['v1beta', 'v1'];

    for (const v of versions) {
        console.log(`\n--- Testing ${v} endpoint ---`);
        const url = `https://generativelanguage.googleapis.com/${v}/models/${model}:generateContent?key=${apiKey}`;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: "Hello" }] }]
                }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                console.log(`[SUCCESS] ${v}:`, data.candidates?.[0]?.content?.parts?.[0]?.text || "No text in response");
                return;
            } else {
                console.log(`[FAIL] ${v}: Status ${response.status}`);
                const text = await response.text();
                console.log('Error details:', text);
            }
        } catch (e) {
            console.log(`[ERROR] ${v}:`, e.message);
        }
    }
}

diagnose();
