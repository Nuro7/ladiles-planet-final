const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: './.env' });

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_key_here' || !apiKey) {
        console.log("No valid API key found. Key is: " + apiKey);
        return;
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        // The listModels method is actually available on the genAI object
        // but we might need to use the right version of the SDK.
        // If genAI.listModels() doesn't exist, we can try to fetch from the URL directly.

        console.log("Fetching model list via API...");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (data.models) {
            console.log("Available Models:");
            data.models.forEach(m => console.log(`- ${m.name} (${m.supportedGenerationMethods.join(', ')})`));
        } else {
            console.log("No models found or error:", JSON.stringify(data));
        }
    } catch (error) {
        console.error("Error fetching models:", error.message);
    }
}

listModels();
