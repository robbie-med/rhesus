// Order entry, results and grading
import {
    state, gameMinutes, addTimeline, updateDisplays, addMessage, addResult, $
} from './utils.js?v=2.0.0';
import { callJSON } from './api.js?v=2.0.0';
import { orderMessages } from './prompts.js?v=2.0.0';

const LAB_NAMES = {
    'cbc': 'Complete Blood Count',
    'cmp': 'Comprehensive Metabolic Panel',
    'cardiac-enzymes': 'Cardiac Enzymes',
    'coagulation': 'Coagulation Studies',
    'abg': 'Arterial Blood Gas',
    'cultures': 'Cultures & Sensitivity',
    'urinalysis': 'Urinalysis',
    'other-labs': 'Other Laboratory Tests'
};

const value = (id) => ($(id)?.value || '').trim();

export function getOrderSummary(o) {
    switch (o.type) {
        case 'medication':
            return `${o.medication === 'other' ? o.notes : o.medication} ${o.dosage} ${o.route} ${o.frequency}${o.medication !== 'other' && o.notes ? ` (${o.notes})` : ''}`;
        case 'lab':
            return `${LAB_NAMES[o.test] || o.test} (${o.urgency})${o.notes ? ` – ${o.notes}` : ''}`;
        case 'exam':
            return `${o.area} exam${o.focus ? ` – ${o.focus}` : ''}`;
        case 'imaging':
            return `${o.study} – ${o.details} (${o.contrast === 'none' ? 'no contrast' : `${o.contrast} contrast`}, ${o.urgency})`;
        case 'procedure':
            return `${o.procedure}${o.details ? ` – ${o.details}` : ''}`;
        case 'consult':
            return `${o.specialty} consult – ${o.reason} (${o.urgency})`;
        default:
            return '';
    }
}

// Build the order from the open form; returns null (after alerting) if incomplete
function readOrderForm(action, subActionId) {
    switch (action) {
        case 'drugs': {
            const order = {
                type: 'medication', category: subActionId,
                medication: value('medication-select'), dosage: value('dosage-input'),
                route: value('route-select'), frequency: value('frequency-select'), notes: value('drug-notes')
            };
            if (!order.medication || !order.dosage) {
                alert('Select a medication and enter a dose.');
                return null;
            }
            if (order.medication === 'other' && !order.notes) {
                alert('Enter the medication name in the notes field.');
                return null;
            }
            return order;
        }
        case 'labs':
            return { type: 'lab', test: subActionId, urgency: value('urgency-select'), notes: value('lab-notes') };
        case 'exam':
            return { type: 'exam', area: subActionId, focus: value('exam-focus') };
        case 'imaging': {
            const order = {
                type: 'imaging', study: subActionId, details: value('imaging-details'),
                contrast: value('contrast-select'), urgency: value('imaging-urgency-select')
            };
            if (!order.details) {
                alert('Enter the body region and clinical question.');
                return null;
            }
            return order;
        }
        case 'procedures':
            return { type: 'procedure', procedure: subActionId, details: value('procedure-details') };
        case 'consults': {
            const order = {
                type: 'consult', specialty: subActionId,
                reason: value('consult-reason'), urgency: value('consult-urgency-select')
            };
            if (!order.reason) {
                alert('Enter a reason for the consult.');
                return null;
            }
            return order;
        }
    }
    return null;
}

export async function submitOrder(action, subActionId, subActionName) {
    if (!state.active) return;
    if (state.orderInFlight) {
        alert('Wait for the current order to come back.');
        return;
    }

    const order = readOrderForm(action, subActionId);
    if (!order) return;

    const summary = getOrderSummary(order);
    const caseFile = state.caseFile;
    const placedAt = gameMinutes();
    state.orderInFlight = true;
    $('order-entry').classList.add('hidden');
    $('sub-actions').classList.add('hidden');

    const placed = addResult(`Order placed: ${summary}`, 'order');
    placed.classList.add('pending');
    addTimeline('order', summary);

    try {
        const reply = await callJSON(orderMessages({ ...order, summary }), { tier: 'standard', maxTokens: 1500, temperature: 0.4 });
        if (state.caseFile !== caseFile || !state.active) return;

        const result = String(reply.result || '').trim() || 'No result returned.';
        addResult(result, 'result', { label: subActionName });
        addTimeline('result', `${summary}: ${result}`);
        if (reply.effect && !/^none\.?$/i.test(String(reply.effect).trim())) {
            addTimeline('effect', `${summary}: ${reply.effect}`);
        }

        const rating = ['key', 'appropriate', 'unnecessary', 'harmful'].includes(reply.rating) ? reply.rating : 'appropriate';
        const points = Math.max(-10, Math.min(10, Math.round(Number(reply.points) || 0)));
        state.score += points;
        state.scoreLog.push({ t: placedAt, order: summary, rating, points, feedback: reply.feedback || '' });
        const keyId = reply.keyInterventionId;
        if (keyId && !state.creditedInterventions.includes(keyId)) state.creditedInterventions.push(keyId);
        updateDisplays();

        // The attending reacts to harmful orders, and sometimes to unnecessary ones
        if (reply.feedback && (rating === 'harmful' || (rating === 'unnecessary' && Math.random() < 0.4))) {
            const comment = rating === 'harmful'
                ? `I'm concerned about that last order. ${reply.feedback}`
                : `Was that last order necessary? ${reply.feedback}`;
            setTimeout(() => {
                if (!state.active || state.caseFile !== caseFile) return;
                addMessage('attending', comment);
                state.chats.attending.push({ role: 'assistant', content: comment });
            }, 2500);
        }
    } catch (error) {
        console.error('Order failed:', error);
        if (state.caseFile === caseFile) addResult(`Couldn't process the order (${error.message}). Try again.`, 'error');
    } finally {
        placed.classList.remove('pending');
        if (state.caseFile === caseFile) state.orderInFlight = false;
    }
}
