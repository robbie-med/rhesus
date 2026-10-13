// Shared game state, clock, rendering and cost tracking

export const VERSION = '2.0.0';

// 10 real seconds = 1 in-game minute
export const REAL_SECONDS_PER_GAME_MINUTE = 10;
// Cases end automatically after this much in-game time
export const MAX_GAME_MINUTES = 240;

// USD per 1M tokens (approximate)
const PRICING = {
    'deepseek-v4-pro': { input: 0.46, output: 0.92 },
    'deepseek-flash': { input: 0.09, output: 0.19 }
};

// Single mutable state object shared by all modules
export const state = {
    active: false,          // a case is loaded and running
    status: 'idle',         // idle | loading | active | deceased | recovered | ended
    caseType: null,
    elapsed: 0,             // real seconds since case start
    caseFile: null,         // full generated case, including hidden fields
    vitals: null,           // current vitals
    vitalsHistory: [],      // [{ t, vitals, status }]
    timeline: [],           // [{ t, kind: 'order'|'result'|'event', text }]
    chats: { attending: [], nurse: [] },  // [{ role: 'user'|'assistant', content }]
    score: 0,
    scoreLog: [],           // [{ t, order, rating, points, feedback }]
    creditedInterventions: [],
    recoveredStreak: 0,
    vitalsInFlight: false,
    orderInFlight: false,
    lastNurseAlertAt: -Infinity,
    clockId: null,
    tokens: { input: 0, output: 0 },
    cost: 0
};

export function resetState() {
    if (state.clockId) clearInterval(state.clockId);
    Object.assign(state, {
        active: false, status: 'idle', elapsed: 0, caseFile: null, vitals: null,
        vitalsHistory: [], timeline: [], chats: { attending: [], nurse: [] },
        score: 0, scoreLog: [], creditedInterventions: [], recoveredStreak: 0,
        vitalsInFlight: false, orderInFlight: false, lastNurseAlertAt: -Infinity,
        clockId: null, tokens: { input: 0, output: 0 }, cost: 0
    });
}

// In-game minutes since case start
export function gameMinutes() {
    return Math.floor(state.elapsed / REAL_SECONDS_PER_GAME_MINUTE);
}

// "T+0:05" style in-game clock
export function formatClock(minutes = gameMinutes()) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `T+${h}:${m.toString().padStart(2, '0')}`;
}

export function addTimeline(kind, text) {
    state.timeline.push({ t: gameMinutes(), kind, text });
}

export function calculateMAP(systolic, diastolic) {
    return Math.round(diastolic + (systolic - diastolic) / 3);
}

export function addTokenUsage(usage, model) {
    const input = usage.prompt_tokens || 0;
    const output = usage.completion_tokens || 0;
    state.tokens.input += input;
    state.tokens.output += output;
    const price = PRICING[model] || PRICING['deepseek-v4-pro'];
    state.cost += (input * price.input + output * price.output) / 1e6;
    updateDisplays();
}

// ---------- DOM ----------

export const $ = (id) => document.getElementById(id);

export function escapeHtml(text) {
    return String(text ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Escaped text with **bold** and line breaks
export function renderText(text) {
    return escapeHtml(text)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
}

export function updateDisplays() {
    $('time-display').textContent = `Time: ${formatClock()}`;
    $('score-display').textContent = `Score: ${state.score}`;
    const totalTokens = state.tokens.input + state.tokens.output;
    const costStr = state.cost < 0.01 ? state.cost.toFixed(4) : state.cost.toFixed(2);
    $('cost-display').textContent = `${totalTokens.toLocaleString()} tok · $${costStr}`;
}

// sender: player | attending | nurse | system
export function addMessage(sender, content) {
    const names = { player: 'You', attending: 'Attending', nurse: 'Nurse', system: 'System' };
    const el = document.createElement('div');
    el.className = `message ${sender}-message`;
    el.innerHTML = `
        <div class="message-header">
            <span class="message-sender">${names[sender] || 'System'}</span>
            <span class="message-time">${formatClock()}</span>
        </div>
        <div class="message-content">${renderText(content)}</div>`;
    const area = $('message-area');
    area.appendChild(el);
    area.scrollTop = area.scrollHeight;
    return el;
}

// type: order | result | error | outcome | debrief
// Result text is shown preformatted (labs and reports keep their layout)
export function addResult(content, type, { label, html = false } = {}) {
    const labels = { order: 'Order', result: 'Result', error: 'System', outcome: 'Outcome', debrief: 'Debrief' };
    const el = document.createElement('div');
    el.className = `result ${type}`;
    el.innerHTML = `
        <div class="result-header">
            <span class="result-time">${formatClock()}</span>
            <span class="result-type">${escapeHtml(label || labels[type] || 'System')}</span>
        </div>
        <div class="result-content${type === 'result' ? ' preformatted' : ''}">${html ? content : renderText(content)}</div>`;
    const area = $('results-area');
    area.appendChild(el);
    area.scrollTop = area.scrollHeight;
    return el;
}

export function showVitals(note = '') {
    const v = state.vitals;
    const display = $('vitals-display');
    if (!v) {
        display.innerHTML = '<p>Select a case type and start the game to see vital signs.</p>';
        return;
    }
    const prev = state.vitalsHistory.length > 1 ? state.vitalsHistory[state.vitalsHistory.length - 2].vitals : null;
    const trend = (key) => {
        if (!prev || prev[key] === v[key]) return '';
        return v[key] > prev[key] ? ' <span class="trend">↑</span>' : ' <span class="trend">↓</span>';
    };
    display.innerHTML = `
        <p><strong>HR:</strong> ${v.HR} bpm${trend('HR')}</p>
        <p><strong>BP:</strong> ${v.BPSystolic}/${v.BPDiastolic} mmHg${trend('BPSystolic')}</p>
        <p><strong>MAP:</strong> ${calculateMAP(v.BPSystolic, v.BPDiastolic)} mmHg</p>
        <p><strong>RR:</strong> ${v.RR} /min${trend('RR')}</p>
        <p><strong>Temp:</strong> ${Number(v.Temp).toFixed(1)} °C${trend('Temp')}</p>
        <p><strong>SpO₂:</strong> ${v.O2Sat}%${trend('O2Sat')}</p>
        ${note}
        <p><em>Updated ${formatClock()}</em></p>`;
}

// Enable or disable everything that only works during a running case
export function setPlayControls(enabled) {
    $('chat-input').disabled = !enabled;
    $('send-message').disabled = !enabled;
    $('action-buttons').classList.toggle('hidden', !enabled);
    document.querySelectorAll('#action-buttons .action-button').forEach(btn => { btn.disabled = !enabled; });
    if (!enabled) {
        $('sub-actions').classList.add('hidden');
        $('order-entry').classList.add('hidden');
    }
    $('end-game').classList.toggle('hidden', !enabled);
}

// Enable or disable case selection
export function setCaseSelection(enabled) {
    document.querySelectorAll('.case-button').forEach(btn => { btn.disabled = !enabled; });
    const start = $('start-game');
    const canStart = enabled && !!state.caseType;
    start.disabled = !canStart;
    start.classList.toggle('disabled', !canStart);
}
