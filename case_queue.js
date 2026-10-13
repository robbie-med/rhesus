// Ready-made case queue: one case per category is generated when the site opens,
// saved in the browser, served instantly on Start, and replaced in the background.
import { callJSON } from './api.js?v=2.0.0';
import { SYSTEM_CASE, caseRequest, CASE_THEMES } from './prompts.js?v=2.0.0';

const STORE_KEY = 'rhesus.caseQueue';
const RECENT_KEY = 'rhesus.recentDiagnoses';
const SCHEMA = 2;                       // bump when the case file format changes
const MAX_AGE_MS = 14 * 24 * 3600 * 1000;
const TARGET_PER_TYPE = 1;
const RETRY_DELAYS_MS = [20000, 60000, 180000];

export const CASE_TYPES = Object.keys(CASE_THEMES);

let queue = {};                          // caseType -> [{ savedAt, caseFile }]
const inFlight = {};                     // caseType -> Promise<caseFile>
const failed = {};                       // caseType -> error message
const retries = {};                      // caseType -> failed attempts in a row
const listeners = new Set();

// ---------- storage ----------

function load() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
        if (saved?.schema === SCHEMA) queue = saved.queue || {};
    } catch { queue = {}; }
    const now = Date.now();
    for (const type of CASE_TYPES) {
        queue[type] = (queue[type] || []).filter(e => e?.caseFile && now - e.savedAt < MAX_AGE_MS);
    }
}

function save() {
    try {
        localStorage.setItem(STORE_KEY, JSON.stringify({ schema: SCHEMA, queue }));
    } catch { /* storage unavailable or full: the queue still works in memory */ }
}

export function recentDiagnoses() {
    try {
        return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    } catch {
        return [];
    }
}

export function rememberDiagnosis(diagnosis) {
    try {
        const list = [diagnosis, ...recentDiagnoses().filter(d => d !== diagnosis)].slice(0, 8);
        localStorage.setItem(RECENT_KEY, JSON.stringify(list));
    } catch { /* storage unavailable */ }
}

// ---------- status ----------

export function status() {
    const types = {};
    for (const type of CASE_TYPES) {
        types[type] = queue[type]?.length ? 'ready' : inFlight[type] ? 'generating' : failed[type] ? 'failed' : 'empty';
    }
    const values = Object.values(types);
    return {
        types,
        ready: values.filter(s => s === 'ready').length,
        generating: values.filter(s => s === 'generating').length,
        total: CASE_TYPES.length
    };
}

export function onChange(fn) {
    listeners.add(fn);
    fn(status());
}

function notify() {
    const s = status();
    listeners.forEach(fn => fn(s));
}

// ---------- generation ----------

function validateCase(c) {
    if (!c?.presentation?.chiefComplaint || !c?.presentation?.hpi || !c?.hidden?.diagnosis) {
        throw new Error('Generated case is missing required fields');
    }
    c.hidden.keyInterventions = Array.isArray(c.hidden.keyInterventions) ? c.hidden.keyInterventions : [];
    c.hidden.harmfulActions = Array.isArray(c.hidden.harmfulActions) ? c.hidden.harmfulActions : [];
    c.hidden.exam = c.hidden.exam || {};
    return c;
}

// Reasoning makes a much better case but takes about a minute, hence the queue
async function generateCase(caseType) {
    const avoid = [...recentDiagnoses(), ...queue[caseType].map(e => e.caseFile.hidden.diagnosis)];
    const caseFile = await callJSON([
        { role: 'system', content: SYSTEM_CASE },
        { role: 'user', content: caseRequest(caseType, avoid) }
    ], { tier: 'standard', maxTokens: 16000, temperature: 1.0, reasoning: true });
    return validateCase(caseFile);
}

// Start generating one case for this type unless one is already on the way
function refill(caseType) {
    if (inFlight[caseType]) return inFlight[caseType];
    delete failed[caseType];
    const promise = generateCase(caseType)
        .then(caseFile => {
            queue[caseType].push({ savedAt: Date.now(), caseFile });
            save();
            retries[caseType] = 0;
            return caseFile;
        })
        .catch(error => {
            failed[caseType] = error.message;
            console.warn(`Case generation for ${caseType} failed:`, error.message);
            // Retry in the background with backoff
            const attempt = retries[caseType] = (retries[caseType] || 0) + 1;
            const delay = RETRY_DELAYS_MS[attempt - 1];
            if (delay) {
                setTimeout(() => {
                    if (queue[caseType].length < TARGET_PER_TYPE) refill(caseType).catch(() => {});
                }, delay);
            }
            throw error;
        })
        .finally(() => {
            delete inFlight[caseType];
            notify();
        });
    inFlight[caseType] = promise;
    notify();
    return promise;
}

// Fill every category up to its target
export function fillAll() {
    for (const type of CASE_TYPES) {
        if (queue[type].length < TARGET_PER_TYPE) refill(type).catch(() => {});
    }
}

// Get a case for this type: instant from the queue, or wait for the one being generated.
// A replacement starts generating right away.
export async function takeCase(caseType) {
    if (!queue[caseType].length) {
        await refill(caseType);
    }
    const entry = queue[caseType].shift();
    if (!entry) throw new Error("No case available");
    save();
    notify();
    refill(caseType).catch(() => {});
    return entry.caseFile;
}

export function initQueue() {
    load();
    save();
    fillAll();
    notify();
}
