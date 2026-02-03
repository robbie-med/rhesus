// Real API integration
console.log("API module loaded");

import { addTokenUsage } from './utils.js';

// Cloudflare Worker proxy URL - keeps API key secure on server side
const WORKER_URL = "https://rhesus.w4yq4gvh58.workers.dev/";

// Model tiers for cost optimization
// - 'standard': GPT-5 for complex medical reasoning (case generation, vitals, order evaluation)
// - 'lite': GPT-5-mini for simple tasks (chat responses, text formatting)
const MODELS = {
    standard: "gpt-5",      // ~$11.25/1M tokens - deep clinical reasoning
    lite: "gpt-5-mini"      // ~$2.25/1M tokens - routine text generation
};

// Call the AI API through the secure proxy
// tier: 'standard' (default) for medical reasoning, 'lite' for chat/simple tasks
export async function callAPI(messages, maxTokens = 1000, temperature = 0.7, tier = 'standard') {
    const model = MODELS[tier] || MODELS.standard;
    console.log(`Calling API [${tier}/${model}]:`, messages[0].content.substring(0, 50) + "...");

    try {
        const response = await fetch(WORKER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                max_tokens: maxTokens,
                temperature: temperature
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            console.error('API response not OK:', response.status, errorData);
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        console.log("API response received:", data);

        // Track token usage and costs
        if (data.usage) {
            addTokenUsage(data.usage, tier);
        }

        return data;
    } catch (error) {
        console.error('API call failed:', error);
        
        // Enhanced error handling
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            console.error('Network error - check your internet connection or worker URL');
        } else if (error.message.includes('401') || error.message.includes('500')) {
            console.error('Server error - check your Cloudflare Worker configuration');
        } else if (error.message.includes('429')) {
            console.error('Rate limit exceeded - you\'re sending too many requests');
        }
        
        throw error;
    }
}
