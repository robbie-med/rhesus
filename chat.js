// Team chat: @md goes to the attending, @rn to the nurse (default: attending)
import { state, addMessage, $ } from './utils.js?v=2.0.0';
import { callText } from './api.js?v=2.0.0';
import { chatMessages } from './prompts.js?v=2.0.0';

function parseRecipient(message) {
    const match = message.match(/^@(md|rn)\b:?\s*/i);
    if (!match) return { recipient: 'attending', content: message };
    return {
        recipient: match[1].toLowerCase() === 'rn' ? 'nurse' : 'attending',
        content: message.slice(match[0].length)
    };
}

export async function sendMessage() {
    const input = $('chat-input');
    const message = input.value.trim();
    if (!state.active || !message) return;
    input.value = '';

    const { recipient, content } = parseRecipient(message);
    if (!content) return;

    addMessage('player', message);
    const history = state.chats[recipient];
    history.push({ role: 'user', content });

    const caseFile = state.caseFile;
    const typing = addMessage(recipient, '…');
    typing.classList.add('typing');

    try {
        const reply = await callText(chatMessages(recipient), { tier: 'lite', maxTokens: 400, temperature: 0.7 });
        typing.remove();
        if (state.caseFile !== caseFile) return;
        addMessage(recipient, reply);
        history.push({ role: 'assistant', content: reply });
    } catch (error) {
        console.error(`Chat with ${recipient} failed:`, error);
        typing.remove();
        // Drop the unanswered turn so roles keep alternating
        if (history[history.length - 1]?.role === 'user') history.pop();
        addMessage('system', `No reply from the ${recipient}. Try again.`);
    }
}
