// Import shared functions and variables
import { 
    addMessage, incrementCost, formatGameTime, gameActive, caseHistory, 
    vitalSigns, patientData, chatInput, patientDeceased, patientCured 
} from './utils.js';
import { callAPI } from './api.js';

// Send a message to the attending or nurse
async function sendMessage() {
    if (!gameActive || !chatInput.value.trim()) return;
    
    const message = chatInput.value.trim();
    chatInput.value = '';
    
    // Determine the recipient based on prefix
    let recipient = 'system';
    let content = message;
    
    if (message.startsWith('@md:') || message.startsWith('@md ')) {
        recipient = 'attending';
        content = message.replace(/^@md:?\s*/, '');
    } else if (message.startsWith('@rn:') || message.startsWith('@rn ')) {
        recipient = 'nurse';
        content = message.replace(/^@rn:?\s*/, '');
    } else {
        // If no prefix, default to attending
        recipient = 'attending';
    }
    
    // Add the player's message to the chat
    addMessage('player', message);
    
    // Increment cost
    incrementCost();
    
    // Generate a response from the recipient
    await generateResponse(recipient, content);
}

// Generate a response from the attending or nurse
async function generateResponse(recipient, message) {
    // Handle special responses for terminal states
    if (patientDeceased) {
        if (recipient === 'nurse') {
            addMessage('nurse', "Code team is working on the patient right now. We're in the middle of a cardiac arrest situation.");
            return;
        } else if (recipient === 'attending') {
            addMessage('attending', "We've lost this patient. We should debrief on what happened and what could have been done differently.");
            return;
        }
    }
    
    if (patientCured) {
        if (recipient === 'nurse') {
            addMessage('nurse', "The patient is stable and doing well. Their vitals have normalized, and they're ready for transfer to the floor.");
            return;
        } else if (recipient === 'attending') {
            addMessage('attending', "Good job with this case. The patient has responded well to your management plan. Any thoughts on outpatient follow-up?");
            return;
        }
    }
    
    const context = `
    You are role-playing as a ${recipient === 'attending' ? 'teaching attending physician' : 'experienced nurse'} in a medical simulation for internal medicine residents.
    
    Current patient information:
    - Demographics: ${patientData.demographics}
    - Chief complaint: ${patientData.chiefComplaint}
    - History: ${patientData.history}
    - Actual diagnosis (hidden from player): ${patientData.diagnosis}
    
    Current vitals:
    - HR: ${vitalSigns.HR} bpm
    - BP: ${vitalSigns.BPSystolic}/${vitalSigns.BPDiastolic} mmHg
    - MAP: ${vitalSigns.MAP} mmHg
    - RR: ${vitalSigns.RR} breaths/min
    - Temp: ${vitalSigns.Temp}°C
    - O2Sat: ${vitalSigns.O2Sat}%
    
    Recent case events:
    ${caseHistory.slice(-5).map(event => `- ${formatGameTime(event.time)}: ${event.event}`).join('\n')}
    
    ${recipient === 'attending' ? 
        'As the attending, give medically accurate guidance, ask probing questions, and evaluate the resident\'s medical decision-making. Be supportive but appropriately critical when needed. Do not directly tell them the diagnosis.' : 
        'As the nurse, respond to the resident\'s requests, provide observations about the patient, and relay information as a real nurse would. You can perform basic nursing tasks if requested.'}
    
    The resident has sent this message: "${message}"
    
    Respond in a realistic, conversational manner as a ${recipient === 'attending' ? 'teaching attending physician' : 'nurse'}.
    Keep your response concise (1-3 sentences) unless detailed medical explanation is necessary.`;
    
    try {
        const response = await callAPI([{ role: "user", content: context }]);
        const content = response.choices[0].message.content;
        
        // Add the response to the chat
        addMessage(recipient, content);
        
    } catch (error) {
        console.error(`Error generating ${recipient} response:`, error);
        addMessage('system', `Error: Could not get a response from the ${recipient}.`);
    }
}

// Export functions for use in other modules
export { sendMessage, generateResponse };
