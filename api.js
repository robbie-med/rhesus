// Real API integration
console.log("API module loaded");

// API credentials (should be stored securely in production)
const API_KEY = "sk-e69yagfy1LbeuHU7wUpAIg";
const API_URL = "https://api.ppq.ai/chat/completions";

// Call the AI API with real credentials
export async function callAPI(messages, maxTokens = 1000, temperature = 0.7) {
    console.log("Calling real API with:", messages[0].content.substring(0, 50) + "...");
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o", // Using the model you specified
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
            console.error('Network error - check your internet connection or API endpoint');
        } else if (error.message.includes('401')) {
            console.error('Authentication error - check your API key');
        } else if (error.message.includes('429')) {
            console.error('Rate limit exceeded - you\'re sending too many requests');
        }
        
        throw error;
    }
}
