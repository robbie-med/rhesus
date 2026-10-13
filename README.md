# Rhesus ⚕️🙈

A text-based clinical simulation for medical students and interns. An LLM generates each patient, runs their physiology, returns results for your orders, and plays the attending and the nurse.

Live: **https://rhesus.robbiemed.org**

<img width="1919" height="880" alt="resus1" src="https://github.com/user-attachments/assets/993b3141-0eb8-4a27-b0c6-d6ffb7b4a15a" />

## How to play

1. Pick a case type: **Cardiovascular**, **Infectious Disease**, **Emergency** or **Miscellaneous**.
2. Click **Start Case**. A new patient is generated with demographics, chief complaint, history and initial vitals.
3. Work the case from the **Actions** panel. Each order is timestamped, resulted and graded.
4. Talk to the team in the chat box:
   - `@md <message>` goes to the attending (teaching, feedback on your plan).
   - `@rn <message>` goes to the nurse (bedside status, practical help).
5. The case ends when the patient recovers or dies, or when you click **End Case**.

### Actions

| Category | Options |
|---|---|
| Drugs | Cardiac, antibiotics, pain management, IV fluids, respiratory, other. Free-text dose and route. |
| Labs | CBC, CMP, cardiac enzymes, coags, ABG, cultures, UA, other |
| Exam | Vitals, general, cardiac, respiratory, abdominal, neuro, MSK, other |
| Imaging | X-ray, CT, MRI, ultrasound, echo, other |
| Procedures | ECG, IV access, oxygen, intubation, catheter, LP, paracentesis, thoracentesis, CPR, other |
| Consults | Cardiology, pulmonology, GI, neurology, ID, nephrology, surgery, ICU transfer, other |

Results come back as raw data (values, findings, reports) without interpretation.

### Scoring

The score starts at 0 and only goes down. A perfect run ends at 0.

| Order rating | Score change |
|---|---|
| Appropriate | 0 |
| Unnecessary | −1 to −3 |
| Harmful | −4 to −10 |

The attending usually comments on harmful orders and sometimes on unnecessary ones.

### Vitals and outcomes

- The clock runs in real time (mm:ss). Vitals are regenerated every 10 seconds from the patient's condition and everything you've done so far.
- The nurse calls out critical values: HR < 40 or > 130, SBP < 90 or > 180, RR < 8 or > 30, temp < 35 or > 39.5 °C, SpO₂ < 90 %.
- **Death:** HR < 20 or > 180, SBP < 50, SpO₂ < 60 % or RR < 5. Also triggered by a harmful order scored −8 or worse, or by a result describing arrest or death.
- **Recovery:** a result describing stabilization, resolution or discharge.

The header shows elapsed time, score, and live API token usage and cost for the session.

## Architecture

```
Browser (GitHub Pages, static ES modules)
   │  POST {model, messages, max_tokens, temperature}
   ▼
Cloudflare Worker  (worker.js)
   │  adds Authorization: Bearer $API_KEY, enforces CORS allowlist
   ▼
DeepSeek API  (https://api.deepseek.com/chat/completions)
```

The API key lives only in the worker. The browser never sees it.

### Models

| Tier | Model | Used for |
|---|---|---|
| `standard` | `deepseek-v4-pro` | Case generation, vitals updates, order results, order grading |
| `lite` | `deepseek-flash` | Attending and nurse chat |

Set in `MODELS` in `api.js`. Cost display prices (USD per 1M tokens, approximate) are in `PRICING` in `utils.js`.

### Files

| File | Role |
|---|---|
| `index.html` | Layout and styles |
| `main.js` | Entry point. Wires up buttons and chat input. |
| `game_logic.js` | Case generation, game clock, vitals loop, death and recovery checks, end screens |
| `actions.js` | Action menus and drug lists |
| `orders.js` | Order entry, result generation, grading, outcome checks |
| `chat.js` | `@md` / `@rn` routing and replies |
| `api.js` | `callAPI()`: model tiers, worker URL, token tracking |
| `utils.js` | Shared state, display updates, cost calculation |
| `worker.js` | Cloudflare Worker proxy (deployed separately) |
| `init.js` | Legacy. Not loaded by the page. |
| `CNAME` | GitHub Pages custom domain |

## Setup

### 1. Deploy the worker

1. Cloudflare dashboard → **Workers & Pages → Create Worker**, then paste `worker.js`.
2. **Settings → Variables and Secrets**:
   - `API_KEY`: DeepSeek API key, type **Secret**.
   - `API_URL` (optional): defaults to `https://api.deepseek.com/chat/completions`. Any OpenAI-compatible `/chat/completions` endpoint works if `MODELS` in `api.js` is changed to match.
3. Add your site's origin to `ALLOWED_ORIGINS` in `worker.js` and deploy.

To rotate the key, replace the `API_KEY` secret. The code doesn't need redeploying.

### 2. Point the frontend at it

Set `WORKER_URL` in `api.js` to the worker's URL.

### 3. Host

Push to GitHub with Pages enabled and put your domain in `CNAME`. To run locally, serve the folder with any static server (ES modules don't load from `file://`), for example:

```
npx serve .
```

`http://localhost` and `http://127.0.0.1` on any port are already in the worker's CORS allowlist.

### Troubleshooting

POST a minimal request straight to the worker to see the upstream error:

```
curl -s -X POST https://<worker-url>/ -H 'Content-Type: application/json' \
  -d '{"model":"deepseek-flash","messages":[{"role":"user","content":"hi"}],"max_tokens":5}'
```

| Response | Cause |
|---|---|
| `API key not configured` | `API_KEY` missing on the worker |
| `401` / `Authentication Fails` | Bad key, or `API_URL` points at a provider the key doesn't belong to |
| `insufficient_quota` / `Insufficient Balance` | Upstream account out of credit |
| `invalid model` / `Model Not Exist` | `MODELS` in `api.js` doesn't match the provider |
| CORS error in the browser console | Site origin missing from `ALLOWED_ORIGINS` |

## Tech

Vanilla JavaScript and HTML5. No build step, no dependencies.

## Credits

Developed by robbie.med A.D. 2025 for medical education and training. Nothing in or generated by the app is medical advice. Have fun. S.D.G.
