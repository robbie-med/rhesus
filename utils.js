console.log("Utils module loaded");

// Shared game state variables
export let gameActive = false;
export let inGameTime = 0;
export let cost = 0;
export let score = 0;
export let caseHistory = [];
export let patientData = {};
export let vitalSigns = {};
export let actionInProgress = false;
export let selectedCaseType = null;
export let gameIntervalId = null;

// Function to set the case type
export function setSelectedCaseType(type) {
  console.log("Setting selectedCaseType to:", type);
  selectedCaseType = type;
  console.log("New value:", selectedCaseType);
}

// DOM element references
export const chatInput = document.getElementById('chat-input');
export const sendMessageButton = document.getElementById('send-message');
export const orderEntryArea = document.getElementById('order-entry');
export const subActionsArea = document.getElementById('sub-actions');
export const messageArea = document.getElementById('message-area');
export const resultsArea = document.getElementById('results-area');
export const startGameButton = document.getElementById('start-game');
export const caseButtons = document.querySelectorAll('.case-button');
export const actionButtons = document.getElementById('action-buttons');
export const preGameMessage = document.getElementById('pre-game-message');
export const patientDataSection = document.getElementById('patient-data');
export const patientDemographics = document.getElementById('patient-demographics');
export const chiefComplaint = document.getElementById('chief-complaint');
export const historySection = document.getElementById('history');
export const vitalsDisplay = document.getElementById('vitals-display');

// Calculate Mean Arterial Pressure
export function calculateMAP(systolic, diastolic) {
    return Math.round((diastolic + (1/3) * (systolic - diastolic)) * 10) / 10;
}

// Format time for display (convert seconds to mm:ss format)
export function formatGameTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Update various game displays
export function updateDisplays() {
    // Update time display
    document.getElementById('time-display').textContent = formatGameTime(inGameTime);
    
    // Update cost display
    document.getElementById('cost-display').textContent = `$${cost}`;
    
    // Update score display
    document.getElementById('score-display').textContent = score;
}

// Increment cost when an action is performed
export function incrementCost(amount = 100) {
    cost += amount;
    updateDisplays();
}

// Add a message to the message area
export function addMessage(sender, content) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${sender}-message`;
    
    let displayName = '';
    switch (sender) {
        case 'player':
            displayName = 'You';
            break;
        case 'attending':
            displayName = 'Attending';
            break;
        case 'nurse':
            displayName = 'Nurse';
            break;
        default:
            displayName = 'System';
    }
    
    messageElement.innerHTML = `
        <div class="message-header">
            <span class="message-sender">${displayName}</span>
            <span class="message-time">${formatGameTime(inGameTime)}</span>
        </div>
        <div class="message-content">${content}</div>
    `;
    
    messageArea.appendChild(messageElement);
    messageArea.scrollTop = messageArea.scrollHeight;
}

// Add a result to the results area
export function addResult(content, type) {
    const resultElement = document.createElement('div');
    resultElement.className = `result ${type}`;
    
    resultElement.innerHTML = `
        <div class="result-header">
            <span class="result-time">${formatGameTime(inGameTime)}</span>
            ${type === 'order' ? '<span class="result-type">Order</span>' : 
              type === 'result' ? '<span class="result-type">Result</span>' : 
              '<span class="result-type">System</span>'}
        </div>
        <div class="result-content">${content}</div>
    `;
    
    resultsArea.appendChild(resultElement);
    resultsArea.scrollTop = resultsArea.scrollHeight;
}

// Reset game state
export function resetGame() {
    gameActive = false;
    
    if (gameIntervalId) {
        clearInterval(gameIntervalId);
        gameIntervalId = null;
    }
    
    // Enable start button and case selection
    startGameButton.disabled = false;
    startGameButton.classList.remove('disabled');
    caseButtons.forEach(btn => btn.disabled = false);
    
    // Disable game controls
    chatInput.disabled = true;
    sendMessageButton.disabled = true;
    actionButtons.parentElement.classList.add('hidden');
    preGameMessage.classList.remove('hidden');
    patientDataSection.classList.add('hidden');
}
