
const apiKey = "AIzaSyCh4xY_Mvtnsb7m5YhVAVhKvqDmw4W-xLI";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

async function listModels() {
    console.log("Listing models...");
    try {
        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            console.log("SUCCESS: API Key is valid.");
            const models = data.models || [];
            console.log("Available models:");
            models.forEach(m => console.log(`- ${m.name} (${m.supportedGenerationMethods?.join(', ')})`));
        } else {
            console.error(`FAILED: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error("Response:", text);
        }
    } catch (error) {
        console.error("ERROR:", error);
    }
}

listModels();
