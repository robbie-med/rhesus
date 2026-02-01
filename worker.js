/**
 * Cloudflare Worker - API Proxy
 *
 * This worker proxies requests to the AI API, keeping your API key secure.
 *
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Go to Cloudflare Dashboard > Workers & Pages > Create Worker
 * 2. Paste this code into the worker
 * 3. Go to Settings > Variables > Add Variable:
 *    - Name: API_KEY
 *    - Value: your-api-key-here
 *    - Click "Encrypt" to make it a secret
 * 4. (Optional) Add API_URL if you want to change the endpoint:
 *    - Name: API_URL
 *    - Value: https://api.ppq.ai/chat/completions
 * 5. Deploy and note your worker URL (e.g., https://your-worker.your-subdomain.workers.dev)
 * 6. Update WORKER_URL in api.js and init.js to match your worker URL
 */

const DEFAULT_API_URL = "https://api.ppq.ai/chat/completions";

// Allowed origins for CORS (update with your actual domain)
const ALLOWED_ORIGINS = [
  "http://localhost",
  "http://127.0.0.1",
  // Add your production domain here, e.g.:
  // "https://yourdomain.com",
  // "https://www.yourdomain.com"
];

function isAllowedOrigin(origin) {
  if (!origin) return false;
  return ALLOWED_ORIGINS.some(allowed =>
    origin === allowed || origin.startsWith(allowed + ":")
  );
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get("Origin");

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin),
      });
    }

    // Only allow POST requests
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders(origin),
        },
      });
    }

    // Check for API key in environment
    if (!env.API_KEY) {
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders(origin),
        },
      });
    }

    try {
      // Get the request body
      const body = await request.json();

      // Forward to the actual API
      const apiUrl = env.API_URL || DEFAULT_API_URL;
      const apiResponse = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${env.API_KEY}`,
        },
        body: JSON.stringify(body),
      });

      // Get the response
      const responseData = await apiResponse.json();

      // Return the response with CORS headers
      return new Response(JSON.stringify(responseData), {
        status: apiResponse.status,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders(origin),
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "Proxy error", message: error.message }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders(origin),
        },
      });
    }
  },
};
