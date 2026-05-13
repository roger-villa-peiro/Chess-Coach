
const apiKey = 'AIzaSyAyrmnYwVsqPodWrCJuZNwaVkjX1wTX3uM';

async function listModels() {
    console.log(`Listing models...`);
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Status ${response.status}`);
            const text = await response.text();
            console.error('Error details:', text);
        } else {
            const data = await response.json();
            console.log('Available Models:');
            data.models.forEach(m => {
                if (m.supportedGenerationMethods.includes('generateContent')) {
                    console.log(`- ${m.name}`);
                }
            });
        }
    } catch (error) {
        console.error(`Error:`, error.message);
    }
}

listModels();
