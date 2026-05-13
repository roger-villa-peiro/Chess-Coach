
const apiKey = "AIzaSyCh4xY_Mvtnsb7m5YhVAVhKvqDmw4W-xLI";
const model = "gemini-1.5-flash";
const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

async function testKey() {
    console.log(`Testing API Key with model ${model}...`);
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "Hello" }] }]
            })
        });

        if (response.ok) {
            const data = await response.json();
            console.log("SUCCESS: API Key is valid.");
            console.log("Response snippet:", JSON.stringify(data).substring(0, 100));
        } else {
            console.error(`FAILED: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error("Response:", text);
        }
    } catch (error) {
        console.error("ERROR:", error);
    }
}

testKey();
