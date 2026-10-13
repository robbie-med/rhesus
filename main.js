// Entry point: wire up the page
import { VERSION, $, updateDisplays } from './utils.js?v=2.0.0';
import { sendMessage } from './chat.js?v=2.0.0';
import { handleAction } from './actions.js?v=2.0.0';
import { startGame, setCaseType, endCaseEarly } from './game_logic.js?v=2.0.0';
import { initQueue, onChange } from './case_queue.js?v=2.0.0';

$('version').textContent = `v${VERSION}`;
updateDisplays();

$('send-message').addEventListener('click', sendMessage);
$('chat-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage();
});

document.querySelectorAll('.case-button').forEach(button => {
    button.addEventListener('click', () => setCaseType(button.dataset.type));
});

$('start-game').addEventListener('click', startGame);

// Case queue status: banner plus a badge on each case button
const BADGES = { ready: '✓', generating: '●', failed: '!', empty: '' };
const BADGE_TITLES = { ready: 'Case ready', generating: 'Generating…', failed: 'Generation failed; Start will retry', empty: '' };
onChange(({ types, ready, generating, total }) => {
    const banner = $('case-status');
    banner.classList.toggle('ready', ready === total);
    banner.textContent = ready === total
        ? 'Cases ready. Pick a type and start.'
        : generating
            ? `Standby, generating cases… ${ready} of ${total} ready`
            : `${ready} of ${total} cases ready. Couldn't reach the case generator; retrying shortly, or click Start to try now.`;
    document.querySelectorAll('.case-button').forEach(button => {
        let badge = button.querySelector('.case-badge');
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'case-badge';
            button.appendChild(badge);
        }
        const s = types[button.dataset.type];
        badge.className = `case-badge ${s}`;
        badge.textContent = BADGES[s];
        badge.title = BADGE_TITLES[s];
    });
});
initQueue();
$('end-game').addEventListener('click', endCaseEarly);

document.querySelectorAll('[data-action]').forEach(button => {
    button.addEventListener('click', () => handleAction(button.dataset.action));
});
