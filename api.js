// Real API integration
console.log("API module loaded");

// Cloudflare Worker proxy URL - keeps API key secure on server side
// Update this URL after deploying your Cloudflare Worker (see worker.js)
const WORKER_URL = "https://rhesus.w4yq4gvh58.workers.dev/";

// Call the AI API through the secure proxy
export async function callAPI(messages, maxTokens = 1000, temperature = 0.7) {
    console.log("Calling API with:", messages[0].content.substring(0, 50) + "...");

    try {
        const response = await fetch(WORKER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
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
