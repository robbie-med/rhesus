// Import necessary modules
import { sendMessage } from './chat.js';
import { handleAction } from './actions.js';
import { startGame, setCaseType } from './game_logic.js';
import { resetGame } from './utils.js';

// Document ready function
document.addEventListener('DOMContentLoaded', () => {
    // Set up event listeners
    
    // Chat controls
    document.getElementById('send-message').addEventListener('click', sendMessage);
    document.getElementById('chat-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Case selection buttons
    document.querySelectorAll('.case-button').forEach(button => {
        button.addEventListener('click', () => {
            setCaseType(button.dataset.type);
        });
    });
    
    // Start game button
    document.getElementById('start-game').addEventListener('click', startGame);
    
    // End game button
    document.getElementById('end-game').addEventListener('click', resetGame);
    
    // Action buttons
    document.querySelectorAll('[data-action]').forEach(button => {
        button.addEventListener('click', () => {
            handleAction(button.dataset.action);
        });
    });
    
    // Initialize the game in a non-active state
    resetGame();
});
