// AI API access through the Cloudflare Worker proxy (the API key stays on the worker)
import { addTokenUsage } from './utils.js?v=2.0.0';

const WORKER_URL = "https://rhesus.w4yq4gvh58.workers.dev/";

// - 'standard': case generation, order results and grading, debrief
// - 'lite': vitals simulation and team chat
export const MODELS = {
    standard: "deepseek-v4-pro",
    lite: "deepseek-flash"
};

// Low-level call. Returns { content, usage }.
// reasoning: let the model think first. Thinking tokens count against maxTokens,
// so reasoning calls need a much larger budget.
export async function callAPI(messages, {
    tier = 'standard',
    maxTokens = 1000,
    temperature = 0.7,
    json = false,
    reasoning = false
} = {}) {
    const model = MODELS[tier] || MODELS.standard;
    const body = {
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
        thinking: { type: reasoning ? 'enabled' : 'disabled' }
    };
    if (json) body.response_format = { type: 'json_object' };

    const response = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.choices?.length) {
        const message = data?.error?.message || data?.error || `HTTP ${response.status}`;
        throw new Error(`API error: ${typeof message === 'string' ? message : JSON.stringify(message)}`);
    }

    if (data.usage) addTokenUsage(data.usage, model);

    const choice = data.choices[0];
    const content = choice.message?.content || '';
    if (!content.trim()) {
        throw new Error(`Empty response (finish_reason: ${choice.finish_reason})`);
    }
    return { content, usage: data.usage };
}

// Parse a JSON reply, tolerating a stray code fence, surrounding text or trailing commas
export function parseJSON(text) {
    let cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    try {
        return JSON.parse(cleaned);
    } catch {
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');
        if (start === -1 || end <= start) throw new Error('Response was not valid JSON');
        cleaned = cleaned.slice(start, end + 1).replace(/,(\s*[}\]])/g, '$1');
        return JSON.parse(cleaned);
    }
}

// JSON call with one retry on network, empty-response or parse failure
export async function callJSON(messages, options = {}) {
    let lastError;
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const { content } = await callAPI(messages, { ...options, json: true });
            return parseJSON(content);
        } catch (error) {
            lastError = error;
            console.warn(`JSON call failed (attempt ${attempt + 1}):`, error.message);
        }
    }
    throw lastError;
}

// Text call with one retry
export async function callText(messages, options = {}) {
    try {
        return (await callAPI(messages, options)).content.trim();
    } catch (error) {
        console.warn('Text call failed, retrying:', error.message);
        return (await callAPI(messages, options)).content.trim();
    }
}
