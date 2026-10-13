# Rhesus ⚕️🙈

A text-based clinical simulation for medical students and interns. An LLM writes each patient, runs their physiology minute by minute, returns results for your orders, grades your decisions, and plays the attending and the nurse.

Live: **https://rhesus.robbiemed.org**

<img width="1919" height="880" alt="resus1" src="https://github.com/user-attachments/assets/993b3141-0eb8-4a27-b0c6-d6ffb7b4a15a" />

## How to play

1. Open the site. It shows **"Standby, generating cases…"** while it prepares one case per category. A ✓ on a category button means its case is ready.
2. Pick a category (**Cardiovascular**, **Infectious Disease**, **Emergency**, **Miscellaneous**) and click **Start Case**.
3. Read the presentation in the Data panel: demographics, PMH, medications, allergies, social history, chief complaint and HPI.
4. Work the case from the **Actions** panel. Each order returns a result and is graded.
5. Talk to the team:
   - `@md <message>`: the attending. Socratic teaching; never gives away the diagnosis.
   - `@rn <message>`: the nurse. Bedside observations, and relays your questions to the patient ("@rn ask her if the pain radiates").
   - No prefix goes to the attending.
6. The case ends when the patient stabilizes or dies, when you click **End Case**, or at T+4:00. Every case ends with the diagnosis and a written debrief.

### Time

- 10 real seconds = 1 in-game minute. The clock shows in-game time (`T+h:mm`).
- Vitals update every in-game minute from the disease course and everything you've done.
- Treatments act on realistic timescales: oxygen in a minute or two, IV boluses over minutes, antibiotics over hours.

### Actions

| Category | Options |
|---|---|
| Drugs | Cardiac, antibiotics, pain, IV fluids, respiratory, other. Free-text dose and notes; "Other" in any list takes a drug name. |
| Labs | CBC, CMP, cardiac enzymes, coags, ABG, cultures, UA, other |
| Exam | Vitals, general, cardiac, respiratory, abdominal, neuro, MSK, other |
| Imaging | X-ray, CT, MRI, ultrasound, echo, other |
| Procedures | ECG, IV access, oxygen, intubation, catheter, LP, paracentesis, thoracentesis, CPR, other |
| Consults | Cardiology, pulmonology, GI, neurology, ID, nephrology, surgery, ICU transfer, other |

Results are raw data: lab values with reference ranges and H/L flags, imaging findings without an impression, exam documentation, medication administration and the bedside response. One order at a time.

### Scoring

Each case has 2–5 hidden key interventions, each with a time window, plus a list of specific harmful actions.

| Order | Points |
|---|---|
| Key intervention, within its window | +10 |
| Key intervention, late | +5 |
| Appropriate | 0 to +2 |
| Unnecessary | −1 to −3 |
| Harmful | −4 to −10 |

The attending speaks up after harmful orders and sometimes after unnecessary ones. The debrief lists what went well, missed or late key interventions with their windows, and a teaching point.

### Outcomes

- **Stabilized:** the case's recovery criteria are met on two consecutive vitals updates.
- **Died:** the physiology engine reports arrest, or vitals stay unsurvivable (HR < 20, SBP < 50, SpO₂ < 60 %, RR < 4) for two consecutive updates. Death follows from the untreated course or harmful actions, never chance.
- The nurse calls out notable changes (new hypotension, desaturation, mental-status change) at most once a minute of real time.

The header shows in-game time, score, and the session's API tokens and cost.

## Architecture

```
Browser (GitHub Pages, static ES modules)
   │  POST {model, messages, max_tokens, temperature, thinking, response_format}
   ▼
Cloudflare Worker  (worker.js)
   │  adds Authorization: Bearer $API_KEY, enforces CORS allowlist
   ▼
DeepSeek API  (https://api.deepseek.com/chat/completions)
```

The API key lives only in the worker.

### Case file

Each case is one JSON document. The player sees `presentation`; everything else stays hidden and drives the game:

- `hidden.diagnosis`, `differential`, `keyFeatures`
- `historyDetails`: what the patient can say when asked (via the nurse)
- `exam`: findings by system
- `baselineResults`: labs, ECG, imaging, micro
- `untreatedCourse`: minute-by-minute deterioration without treatment
- `keyInterventions` (id, action, window, effect) and `harmfulActions` (action, consequence)
- `recoveryCriteria`

Every later call gets the case file plus a timeline of orders, results and treatment effects, so results stay consistent across the case.

### Case queue

Case generation uses reasoning and takes about a minute, so cases are made ahead of time:

- On first visit, one case per category is generated in parallel and saved to `localStorage`.
- **Start Case** serves the saved case instantly and starts generating its replacement.
- Saved cases survive reloads and expire after 14 days. Recently played diagnoses are avoided.
- If a category's case isn't ready yet, Start waits for it.

### Model calls

| Call | Model | Reasoning | Output |
|---|---|---|---|
| Case generation | `deepseek-v4-pro` | on | JSON case file |
| Order result + grade | `deepseek-v4-pro` | off | JSON: result, rating, points, key intervention, feedback, effect |
| Debrief | `deepseek-v4-pro` | off | text |
| Vitals (every in-game minute) | `deepseek-flash` | off | JSON: vitals, status, nurse alert |
| Attending / nurse chat | `deepseek-flash` | off | text |

- Fixed instructions go in system messages first and the case file second, so repeated calls within a case share a prefix that DeepSeek can cache.
- JSON calls use `response_format: json_object` and retry once on failure.
- The nurse never sees the diagnosis, differential or key interventions. Each role keeps its own chat history. Player messages are sent as dialogue, not as instructions.
- All model output is HTML-escaped before display.

### Files

| File | Role |
|---|---|
| `index.html` | Layout and styles |
| `main.js` | Entry point. Wires up the UI and the case-queue status display. |
| `case_queue.js` | Case generation, `localStorage` queue, background refill |
| `prompts.js` | Every system prompt and message builder |
| `game_logic.js` | Case start, clock, vitals loop, outcomes, debrief |
| `orders.js` | Order forms, results, grading, score |
| `actions.js` | Action menus and drug lists |
| `chat.js` | `@md` / `@rn` routing and per-role history |
| `api.js` | Worker calls, model tiers, JSON parsing, retries, token tracking |
| `utils.js` | Shared state, game clock, rendering, cost calculation |
| `worker.js` | Cloudflare Worker proxy (deployed separately) |
| `CNAME` | GitHub Pages custom domain |

## Setup

### 1. Deploy the worker

1. Cloudflare dashboard → **Workers & Pages → Create Worker**, then paste `worker.js`.
2. **Settings → Variables and Secrets**:
   - `API_KEY`: DeepSeek API key, type **Secret**.
   - `API_URL` (optional): defaults to `https://api.deepseek.com/chat/completions`.
3. Add your site's origin to `ALLOWED_ORIGINS` in `worker.js` and deploy.

To rotate the key, replace the `API_KEY` secret. The code doesn't need redeploying.

### 2. Point the frontend at it

Set `WORKER_URL` in `api.js`.

### 3. Host

Push to GitHub with Pages enabled and your domain in `CNAME`. To run locally, serve the folder with any static server (ES modules don't load from `file://`):

```
npx serve .
```

`http://localhost` and `http://127.0.0.1` on any port are in the worker's CORS allowlist.

### Releasing a new version

Bump `VERSION` in `utils.js` and the `?v=` query on every module import and on `main.js` in `index.html`, all to the same value. Browsers then fetch the new modules together instead of mixing cached old ones with new ones. If the case file format changes, also bump `SCHEMA` in `case_queue.js` so saved cases are discarded.

### Troubleshooting

POST a minimal request straight to the worker to see the upstream error:

```
curl -s -X POST https://<worker-url>/ -H 'Content-Type: application/json' \
  -d '{"model":"deepseek-flash","messages":[{"role":"user","content":"hi"}],"max_tokens":5,"thinking":{"type":"disabled"}}'
```

| Response | Cause |
|---|---|
| `API key not configured` | `API_KEY` missing on the worker |
| `401` / `Authentication Fails` | Bad key, or `API_URL` points at a provider the key doesn't belong to |
| `Insufficient Balance` | DeepSeek account out of credit |
| `Model Not Exist` / `invalid model` | `MODELS` in `api.js` doesn't match the provider |
| Empty content, `finish_reason: length` | Reasoning used up `max_tokens`; raise it or disable thinking for that call |
| CORS error in the browser console | Site origin missing from `ALLOWED_ORIGINS` |

The browser console logs a one-line physiology note with every vitals update (`[physiology T+0:12] …`).

## Tech

Vanilla JavaScript and HTML5. No build step, no dependencies.

## Credits

Developed by robbie.med A.D. 2025 for medical education and training. Nothing in or generated by the app is medical advice. Have fun. S.D.G.
