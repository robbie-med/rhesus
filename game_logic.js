// Case lifecycle: generation, clock, vitals loop, outcomes and debrief
import {
    state, resetState, gameMinutes, formatClock, addTimeline, updateDisplays,
    addMessage, addResult, showVitals, setPlayControls, setCaseSelection,
    escapeHtml, renderText, $, REAL_SECONDS_PER_GAME_MINUTE, MAX_GAME_MINUTES
} from './utils.js?v=2.0.0';
import { callJSON, callText } from './api.js?v=2.0.0';
import { vitalsMessages, debriefMessages } from './prompts.js?v=2.0.0';
import { takeCase, rememberDiagnosis } from './case_queue.js?v=2.0.0';

// Real seconds between unprompted nurse alerts
const NURSE_ALERT_COOLDOWN = 60;

// Vitals that end the case if they persist for two consecutive updates
const LETHAL = v => v.HR < 20 || v.BPSystolic < 50 || v.O2Sat < 60 || v.RR < 4;

export function setCaseType(type) {
    state.caseType = type;
    document.querySelectorAll('.case-button').forEach(button => {
        button.classList.toggle('selected', button.dataset.type === type);
    });
    setCaseSelection(state.status !== 'loading' && !state.active);
}

function clearBoard() {
    $('message-area').innerHTML = '';
    $('results-area').innerHTML = '';
    $('patient-data').classList.add('hidden');
    $('pre-game-message').classList.add('hidden');
    showVitals();
}

// ---------- Case generation ----------

function toNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function normalizeVitals(v, fallback) {
    const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
    return {
        HR: Math.round(clamp(toNumber(v?.HR, fallback.HR), 0, 250)),
        BPSystolic: Math.round(clamp(toNumber(v?.BPSystolic, fallback.BPSystolic), 0, 280)),
        BPDiastolic: Math.round(clamp(toNumber(v?.BPDiastolic, fallback.BPDiastolic), 0, 180)),
        RR: Math.round(clamp(toNumber(v?.RR, fallback.RR), 0, 70)),
        Temp: Math.round(clamp(toNumber(v?.Temp, fallback.Temp), 25, 44) * 10) / 10,
        O2Sat: Math.round(clamp(toNumber(v?.O2Sat, fallback.O2Sat), 0, 100))
    };
}

const DEFAULT_VITALS = { HR: 80, BPSystolic: 120, BPDiastolic: 80, RR: 16, Temp: 37.0, O2Sat: 98 };

function showPresentation() {
    const p = state.caseFile.presentation;
    const line = (label, value) => value ? `<p><strong>${label}:</strong> ${escapeHtml(value)}</p>` : '';
    $('patient-demographics').innerHTML =
        `<p>${escapeHtml(p.demographics)}</p>` +
        line('PMH', p.pmh) + line('Medications', p.medications) +
        line('Allergies', p.allergies) + line('Social', p.social);
    $('chief-complaint').textContent = `"${p.chiefComplaint.replace(/^"|"$/g, '')}"`;
    $('history').innerHTML = renderText(p.hpi);
    $('patient-data').classList.remove('hidden');
}

// ---------- Start ----------

export async function startGame() {
    if (!state.caseType || state.status === 'loading') return;

    const caseType = state.caseType;
    resetState();
    state.caseType = caseType;
    state.status = 'loading';
    clearBoard();
    updateDisplays();
    setCaseSelection(false);
    setPlayControls(false);
    const loading = addMessage('system', 'Standby, generating your case…');
    const loadingStarted = Date.now();
    const loadingTimer = setInterval(() => {
        const seconds = Math.round((Date.now() - loadingStarted) / 1000);
        loading.querySelector('.message-content').textContent = `Standby, generating your case… ${seconds}s (a new case takes about a minute)`;
    }, 1000);

    try {
        state.caseFile = await takeCase(caseType);
    } catch (error) {
        console.error('Case generation failed:', error);
        clearInterval(loadingTimer);
        loading.remove();
        addMessage('system', `Couldn't generate a case (${error.message}). Please try again.`);
        state.status = 'idle';
        setCaseSelection(true);
        $('pre-game-message').classList.remove('hidden');
        return;
    }

    clearInterval(loadingTimer);
    loading.remove();
    rememberDiagnosis(state.caseFile.hidden.diagnosis);

    state.caseFile.initialVitals = normalizeVitals(state.caseFile.initialVitals, DEFAULT_VITALS);
    state.vitals = { ...state.caseFile.initialVitals };
    state.vitalsHistory.push({ t: 0, vitals: { ...state.vitals }, status: state.caseFile.acuity });
    addTimeline('event', `Patient presents: ${state.caseFile.presentation.demographics}. Chief complaint: ${state.caseFile.presentation.chiefComplaint}`);

    showPresentation();
    showVitals();

    state.status = 'active';
    state.active = true;
    setPlayControls(true);
    updateDisplays();

    const nurseOpening = state.caseFile.openingNurseReport || 'Doctor, your patient is here and settled in the bay.';
    addMessage('nurse', nurseOpening);
    state.chats.nurse.push({ role: 'assistant', content: nurseOpening });
    const attendingOpening = "Take the lead on this one. What's your initial assessment, and what do you want to do first?";
    addMessage('attending', attendingOpening);
    state.chats.attending.push({ role: 'assistant', content: attendingOpening });

    state.clockId = setInterval(tick, 1000);
}

// ---------- Clock and vitals ----------

function tick() {
    if (!state.active) return;
    state.elapsed++;
    updateDisplays();

    if (gameMinutes() >= MAX_GAME_MINUTES) {
        endCase('ended', `Time limit of ${formatClock(MAX_GAME_MINUTES)} reached`);
        return;
    }
    if (state.elapsed % REAL_SECONDS_PER_GAME_MINUTE === 0) updateVitals();
}

async function updateVitals() {
    if (!state.active || state.vitalsInFlight) return;
    state.vitalsInFlight = true;
    const caseFile = state.caseFile;

    try {
        const reply = await callJSON(vitalsMessages(), { tier: 'lite', maxTokens: 400, temperature: 0.3 });
        // Ignore replies that arrive after the case ended or a new case started
        if (!state.active || state.caseFile !== caseFile) return;

        state.vitals = normalizeVitals(reply.vitals, state.vitals);
        const status = String(reply.status || 'stable').toLowerCase();
        state.vitalsHistory.push({ t: gameMinutes(), vitals: { ...state.vitals }, status });
        if (reply.note) console.log(`[physiology ${formatClock()}] ${status}: ${reply.note}`);

        const statusNote = status === 'critical' ? '<p class="status-critical">CRITICAL</p>' : '';
        showVitals(statusNote);

        if (reply.nurseAlert && state.elapsed - state.lastNurseAlertAt >= NURSE_ALERT_COOLDOWN) {
            state.lastNurseAlertAt = state.elapsed;
            addMessage('nurse', reply.nurseAlert);
            state.chats.nurse.push({ role: 'assistant', content: reply.nurseAlert });
        }

        const history = state.vitalsHistory;
        const previous = history.length > 1 ? history[history.length - 2] : null;
        if (status === 'arrest' || (LETHAL(state.vitals) && previous && LETHAL(previous.vitals))) {
            endCase('deceased', reply.note || 'Cardiopulmonary arrest');
            return;
        }

        state.recoveredStreak = status === 'recovered' ? state.recoveredStreak + 1 : 0;
        if (state.recoveredStreak >= 2) {
            endCase('recovered', reply.note || 'Recovery criteria met');
        }
    } catch (error) {
        console.warn('Vitals update failed; keeping last values:', error.message);
    } finally {
        state.vitalsInFlight = false;
    }
}

// ---------- Outcomes ----------

const OUTCOME_TEXT = {
    deceased: { title: 'Patient died', className: 'outcome-deceased' },
    recovered: { title: 'Patient stabilized', className: 'outcome-recovered' },
    ended: { title: 'Case ended', className: 'outcome-ended' }
};

export async function endCase(outcome, reason) {
    if (!state.active) return;
    state.active = false;
    state.status = outcome;
    clearInterval(state.clockId);
    state.clockId = null;
    setPlayControls(false);
    addTimeline('event', `Case over: ${outcome} (${reason})`);

    if (outcome === 'deceased') {
        state.vitals = { ...state.vitals, HR: 0, BPSystolic: 0, BPDiastolic: 0, RR: 0, O2Sat: 0 };
        showVitals('<p class="status-critical">CARDIAC ARREST</p>');
        addMessage('system', 'CODE BLUE. The patient has arrested and could not be resuscitated.');
    } else if (outcome === 'recovered') {
        showVitals('<p class="status-stable">STABLE</p>');
        addMessage('nurse', "Doctor, the patient looks much better and is stable for transfer.");
    }

    const { title, className } = OUTCOME_TEXT[outcome];
    const card = addResult(
        `<h3>${title}</h3>` +
        `<p>${escapeHtml(reason)}</p>` +
        `<p><strong>Diagnosis:</strong> ${escapeHtml(state.caseFile.hidden.diagnosis)}</p>` +
        `<p><strong>Score:</strong> ${state.score} · <strong>Time:</strong> ${formatClock()}</p>`,
        'outcome', { html: true }
    );
    card.classList.add(className);

    const pending = addResult('The attending is writing your debrief…', 'debrief');
    try {
        const debrief = await callText(debriefMessages(outcome, reason), { tier: 'standard', maxTokens: 900, temperature: 0.4 });
        pending.querySelector('.result-content').innerHTML = renderText(debrief);
    } catch (error) {
        console.error('Debrief failed:', error);
        pending.querySelector('.result-content').textContent = "Couldn't generate the debrief.";
    }
    $('results-area').scrollTop = $('results-area').scrollHeight;

    // A new case can be started from the case selector
    if (state.status === outcome) setCaseSelection(true);
}

// End Case button: finish the running case and debrief
export function endCaseEarly() {
    if (state.active) endCase('ended', 'Ended by the resident');
}
