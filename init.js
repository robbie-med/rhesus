// Game state variables
let gameActive = false;
let selectedCaseType = null;
let inGameTime = 0; // seconds
let gameIntervalId = null;
let cost = 0;
let score = 0;
let patientData = null;
let vitalSigns = null;
let caseHistory = [];
let actionInProgress = false;

// API configuration
const apiKey = "sk-e69yagfy1LbeuHU7wUpAIg";
const apiUrl = "https://api.ppq.ai/chat/completions";
const apiModel = "claude-3.5-sonnet";

// DOM Elements
const startGameButton = document.getElementById('startGame');
const caseButtons = document.querySelectorAll('.case-button');
const patientDataSection = document.getElementById('patient-data');
const patientDemographics = document.getElementById('patient-demographics');
const chiefComplaint = document.getElementById('chief-complaint');
const historySection = document.getElementById('history');
const vitalsDisplay = document.getElementById('vitals');
const resultsArea = document.getElementById('results-area');
const messageArea = document.getElementById('messageArea');
const chatInput = document.getElementById('chatInput');
const sendMessageButton = document.getElementById('sendMessage');
const actionButtons = document.getElementById('action-buttons');
const subActionsArea = document.getElementById('sub-actions');
const orderEntryArea = document.getElementById('order-entry');
const preGameMessage = document.getElementById('pre-game-message');
const timerDisplay = document.getElementById('timer');
const scoreDisplay = document.getElementById('score');
const costDisplay = document.getElementById('cost');

// Initialize the game
function init() {
    // Set up event listeners
    caseButtons.forEach(button => {
        button.addEventListener('click', () => {
            selectedCaseType = button.dataset.type;
            caseButtons.forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
            
            // Update UI to show selection
            startGameButton.disabled = false;
            startGameButton.classList.remove('disabled');
        });
    });
    
    startGameButton.addEventListener('click', () => startGame());
    sendMessageButton.addEventListener('click', () => sendMessage());
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Set up action button listeners
    document.querySelectorAll('.action-button').forEach(button => {
        button.addEventListener('click', () => {
            if (gameActive && !actionInProgress) {
                handleAction(button.dataset.action);
            }
        });
    });
}

// Format game time (convert seconds to mm:ss)
function formatGameTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Update displays (timer, score, cost)
function updateDisplays() {
    timerDisplay.textContent = `Time: ${formatGameTime(inGameTime)}`;
    scoreDisplay.textContent = `Score: ${score}`;
    costDisplay.textContent = `Cost: $${cost.toFixed(2)}`;
}

// Increment the cost counter
function incrementCost() {
    cost += 0.01;
    updateDisplays();
}

// Reset the game
function resetGame() {
    // Clear any existing intervals
    if (gameIntervalId) {
        clearInterval(gameIntervalId);
        gameIntervalId = null;
    }
    
    // Reset game state
    gameActive = false;
    selectedCaseType = null;
    inGameTime = 0;
    cost = 0;
    score = 0;
    patientData = null;
    vitalSigns = null;
    caseHistory = [];
    
    // Update UI
    updateDisplays();
    
    // Reset UI elements
    startGameButton.disabled = false;
    startGameButton.classList.remove('disabled');
    caseButtons.forEach(btn => btn.disabled = false);
    
    chatInput.disabled = true;
    sendMessageButton.disabled = true;
    
    actionButtons.parentElement.classList.add('hidden');
    preGameMessage.classList.remove('hidden');
    patientDataSection.classList.add('hidden');
    
    // Clear content areas
    vitalsDisplay.innerHTML = '<p>Select a case type and start the game to see vital signs.</p>';
    resultsArea.innerHTML = '<p>Results from your orders will appear here.</p>';
    messageArea.innerHTML = '';
    patientDemographics.textContent = '';
    chiefComplaint.textContent = '';
    historySection.textContent = '';
}

// Call the API
async function callAPI(messages) {
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: apiModel,
                messages: messages
            })
        });
        
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', init);