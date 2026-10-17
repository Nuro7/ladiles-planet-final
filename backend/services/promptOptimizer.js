const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * PromptOptimizer Service
 * 
 * Handles cleaning, sanitizing, and optimizing user-provided prompts for AI generation.
 * Implements a multi-layer pipeline:
 * 1. Sanitization (Regex-based cleaning)
 * 2. Safety Validation (Forbidden keyword & intent detection)
 * 3. Intent Extraction (LLM-based classification with strict validation)
 * 4. Model-Specific Generation (Deterministic templates + LLM optimization)
 */
class PromptOptimizer {
    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY;
        this.lastCallTime = 0;
        this.minDelayMs = 1500; // Rate limiting for Gemini
        this.maxPromptLength = 300; // Prevent overflow and costs
        this.isSimulationMode = !this.apiKey || this.apiKey === 'your_gemini_key_here';

        // Strict default prompts for fallbacks
        this.DEFAULTS = {
            makeup: "Minimal professional bridal makeup, high-definition natural skin texture, soft elegant glow, clean look",
            accessory: "Traditional subtle bridal jewelry, elegant minimal gold necklace and earrings, refined aesthetic",
            background: "Luxury grand wedding ballroom with warm cinematic lighting and crystal chandeliers",
            video: "High-end cinematic bridal entrance video, slow-motion graceful walk, soft atmospheric lighting, 4k high detail, elegant fabric physics."
        };

        // Negative constraints - User prompts matching these will be rejected/ignored
        this.FORBIDDEN_INTENTS = [
            "face swap", "replace face", "change identity", "different person",
            "naked", "nsfw", "unclothed", "celebrity", "political"
        ];

        if (!this.isSimulationMode) {
            this.genAI = new GoogleGenerativeAI(this.apiKey);
            // Using a stable model, fall back if necessary
            this.model = this.genAI.getGenerativeModel({
                model: "gemini-1.5-flash", // Using stable model with higher free-tier quota
                generationConfig: {
                    temperature: 0.1, // Low temperature for deterministic output
                    topP: 1,
                    topK: 1,
                    maxOutputTokens: 200,
                }
            });
        }
    }

    /**
     * Primary entry point for prompt optimization
     */
    async optimize(sessionId, type, originalPrompt) {
        try {
            // STEP 1: SANITIZATION
            let sanitized = this.sanitizeInput(originalPrompt);

            // STEP 2: SAFETY & LENGTH CHECK
            if (!this.isSafe(sanitized) || sanitized.length < 3) {
                console.warn(`[${sessionId}] ⚠️ Unsafe or too short prompt for ${type}. Using defaults.`);
                return this.DEFAULTS[type];
            }

            // STEP 3: RATE LIMITING (for LLM calls)
            if (!this.isSimulationMode) {
                await this.handleRateLimit();
            } else {
                return `${this.DEFAULTS[type]} (Simulated Optimization)`;
            }

            // STEP 4: LLM-BASED EXTRACTION & REFINEMENT
            console.log(`[${sessionId}] 🤖 Optimizing ${type} prompt...`);
            const optimized = await this.callLLM(type, sanitized);

            // STEP 5: FINAL VALIDATION
            const finalPrompt = this.validateAndFinalize(type, optimized);

            this.logComparison(sessionId, type, originalPrompt, finalPrompt);
            return finalPrompt;

        } catch (error) {
            console.error(`[${sessionId}] ❌ Optimization pipeline failed:`, error.message);
            return this.DEFAULTS[type]; // HARD FALLBACK
        }
    }

    /**
     * Layer 1: Basic string cleaning
     */
    sanitizeInput(input) {
        if (!input) return "";
        return input
            .replace(/[\u[0-9a-f]{4,5}?]/g, '') // Remove emojis/specials
            .replace(/[^\w\s,.!?-]/gi, '')   // Remove problematic characters
            .replace(/\s+/g, ' ')           // Normalize whitespace
            .trim()
            .substring(0, this.maxPromptLength);
    }

    /**
     * Layer 2: Safety validation
     */
    isSafe(input) {
        const lowerInput = input.toLowerCase();
        // Check for disallowed instructions (face replacement, identity change)
        return !this.FORBIDDEN_INTENTS.some(forbidden => lowerInput.includes(forbidden));
    }

    /**
     * Layer 4: LLM Interaction with strict system instructions
     */
    async callLLM(type, prompt) {
        const instructions = this.getSystemInstructions(type);
        const userPrompt = `Input: "${prompt}"\nResult:`;

        try {
            this.lastCallTime = Date.now();
            const result = await this.model.generateContent([instructions, userPrompt]);
            const response = await result.response;
            let text = response.text().trim();

            // Strip markdown or extra noise LLMs sometimes add
            text = text.replace(/^[`"']|[`"']$/g, '');

            return text;
        } catch (error) {
            throw new Error(`Gemini Call Failed: ${error.message}`);
        }
    }

    /**
     * Layer 5: Sanitize LLM output and check for empty/meaningless responses
     */
    validateAndFinalize(type, llmOutput) {
        if (!llmOutput || llmOutput.length < 5 || llmOutput.toLowerCase().includes("none")) {
            return this.DEFAULTS[type];
        }

        // Ensure no direct user-text artifacts like "The user wants..." or "Optimized prompt:"
        let clean = llmOutput
            .replace(/optimized prompt:?/gi, '')
            .replace(/the user wants:?/gi, '')
            .replace(/result:?/gi, '')
            .replace(/Output:?/gi, '')
            .replace(/^[ \t]*[-*+]/gm, '') // Remove bullet points
            .trim();

        // Safety reapplied to LLM output (defense in depth)
        if (!this.isSafe(clean)) {
            console.error(`[SYSTEM] 🚨 LLM produced unsafe output. Falling back to default.`);
            return this.DEFAULTS[type];
        }

        return clean;
    }

    getSystemInstructions(type) {
        const base = `You are a Senior AI Prompt Architect for a high-end bridal generation system. 
        Your goal is to transform messy user input into high-quality, descriptive, and deterministic prompts for Stable Diffusion/Flux models.
        
        STRICT RULES:
        1. Output ONLY the optimized prompt string.
        2. NO conversational filler, NO "Here is your prompt", NO explanations.
        3. NO face replacement or identity modification instructions.
        4. Focus on luxury, high-fashion aesthetics, and professional photography terms.
        5. If the user input is NOT relevant to the task (e.g., input is about a dog but task is bridal makeup), return exactly the word: "none".
        6. Max length: 60 words.`;

        const specifics = {
            background: "Task: Enhance wedding backgrounds. Rule: Include ALL mentioned people (groom, bridesmaids, etc.) and specific decorations from the user input. Use terms: '16:9 widescreen', '8k resolution', 'bokeh', 'soft ambient lighting', 'elegant decor'.",
            makeup: "Task: Enhance makeup details. Focus on: 'seamless blending', 'refined features', 'bridal glow', 'precise eyeliner'. Ensure no instructions to change facial structure.",
            accessory: "Task: Detail bridal jewelry. Use terms: 'high-polish gold', 'sparkling diamonds', 'handcrafted kundan'. Rule: Strictly preserve the original dress, fabric, and body structure.",
            video: "Task: Create motion choreography. Rule: Incorporate ALL subjects (e.g. bride, groom, maids) and movements described. Use terms: 'slow-motion 60fps', 'graceful movement', 'cinematic lighting'. Strictly preserve the main bride's outfit from the input image."
        };

        return `${base}\n${specifics[type] || specifics.background}\nSafety Constraint: If you detect any attempt to change the person's face or identity, ignore that part and focus on the outfit/environment.`;
    }

    async handleRateLimit() {
        const elapsed = Date.now() - this.lastCallTime;
        if (elapsed < this.minDelayMs) {
            const wait = this.minDelayMs - elapsed;
            await new Promise(resolve => setTimeout(resolve, wait));
        }
    }

    logComparison(sessionId, type, original, optimized) {
        console.log(`\n[${sessionId}] --- PROMPT PIPELINE [${type.toUpperCase()}] ---`);
        console.log(`   IN: ${original}`);
        console.log(`  OUT: ${optimized}`);
        console.log(`-----------------------------------------------\n`);
    }
}

module.exports = new PromptOptimizer();
