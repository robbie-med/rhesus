console.log("Game logic module loaded");

// Import shared utilities and variables
import { 
    gameActive, inGameTime, cost, score, caseHistory, patientData, vitalSigns,
    actionInProgress, selectedCaseType, gameIntervalId, updateDisplays,
    calculateMAP, formatGameTime, addMessage, addResult, resetGame,
    setSelectedCaseType,
    messageArea, startGameButton, caseButtons, chatInput, sendMessageButton,
    actionButtons, preGameMessage, patientDataSection, patientDemographics,
    chiefComplaint, historySection, vitalsDisplay
} from './utils.js';

// Import API functions
import { callAPI } from './api.js';

// Start the game
async function startGame() {
    if (!selectedCaseType) {
        alert('Please select a case type first.');
        return;
    }
    
    // Reset game state
    gameActive = true;
    inGameTime = 0;
    cost = 0;
    score = 0;
    caseHistory = [];
    actionInProgress = true; // Prevent actions during initialization
    
    // Update UI
    updateDisplays();
    startGameButton.disabled = true;
    startGameButton.classList.add('disabled');
    caseButtons.forEach(btn => btn.disabled = true);
    
    // Show a loading message
    messageArea.innerHTML = '<div class="message system-message">Initializing case, please wait...</div>';
    
    try {
        // Generate the patient case
        await generatePatientCase();
        
        // Start the game timer
        gameIntervalId = setInterval(updateGameTime, 1000);
        
        // Enable game controls
        chatInput.disabled = false;
        sendMessageButton.disabled = false;
        actionButtons.parentElement.classList.remove('hidden');
        preGameMessage.classList.add('hidden');
        patientDataSection.classList.remove('hidden');
        
        // Add initial nurse message
        addMessage('nurse', `Hello doctor, I'm your nurse today. This patient was just admitted with ${patientData.chiefComplaint}.`);
        
        // Add initial attending message
        addMessage('attending', "I'd like you to take the lead on this case. What's your initial assessment and plan?");
        
        // Update vital signs immediately
        updateVitalSigns();
        
        actionInProgress = false;
    } catch (error) {
        console.error('Error starting game:', error);
        messageArea.innerHTML += '<div class="message system-message">Error starting game. Please try again.</div>';
        resetGame();
    }
}

// Generate a new patient case based on the selected type
async function generatePatientCase() {
    const prompt = `Generate a realistic medical case of a ${selectedCaseType} condition for an internal medicine resident training simulation. 
    
    Include: 
    1. Patient demographics (age, gender, relevant history)
    2. Chief complaint
    3. Brief history of present illness
    4. Current vital signs (HR, BP, RR, Temp, O2 sat)
    5. The underlying condition/diagnosis (this will be hidden from the player)
    
    Format as a JSON object with these keys: demographics, chiefComplaint, history, vitalSigns (with subfields for each vital), and diagnosis.
    
    For vital signs, include:
    - HR (heart rate in bpm)
    - BPSystolic and BPDiastolic (blood pressure in mmHg)
    - RR (respiratory rate in breaths/min)
    - Temp (temperature in Celsius)
    - O2Sat (oxygen saturation percentage)
    
    Make this case medically accurate and appropriately challenging for a resident physician.
    
    Return only valid JSON without any markdown formatting or additional text.`;
    
    try {
        const response = await callAPI([{ role: "user", content: prompt }]);
        
        // Parse the case data from the response
        const content = response.choices[0].message.content;
        console.log("API Response:", content);
        
        // Clean the response to ensure it's valid JSON
        let cleanedContent = content;
        
        // Remove any markdown formatting if present
        cleanedContent = cleanedContent.replace(/```json\n|```\n|```/g, '');
        
        // Try to find a valid JSON object
        const jsonMatch = cleanedContent.match(/{[\s\S]*}/);
        if (jsonMatch) {
            cleanedContent = jsonMatch[0];
        }
        
        console.log("Cleaned content:", cleanedContent);
        
        // Parse the JSON
        const newPatientData = JSON.parse(cleanedContent);
        
        // Update the global patient data object
        Object.assign(patientData, newPatientData);
        
        // Update the global vital signs object
        Object.assign(vitalSigns, patientData.vitalSigns);
        
        // Calculate MAP (Mean Arterial Pressure)
        vitalSigns.MAP = calculateMAP(vitalSigns.BPSystolic, vitalSigns.BPDiastolic);
        
        // Update UI with patient information
        patientDemographics.textContent = patientData.demographics;
        chiefComplaint.textContent = patientData.chiefComplaint;
        historySection.textContent = patientData.history;
        
        // Add to case history
        caseHistory.push({
            time: inGameTime,
            event: 'Case started',
            data: patientData
        });
        
        return patientData;
    } catch (error) {
        console.error('Error parsing patient case:', error);
        
        // Create a fallback patient case for testing
        const fallbackCase = {
            demographics: "45-year-old male with history of hypertension and diabetes",
            chiefComplaint: "Chest pain and shortness of breath",
            history: "Patient reports sudden onset of chest pain radiating to left arm, associated with diaphoresis and dyspnea, starting 2 hours ago while at rest.",
            vitalSigns: {
                HR: 110,
                BPSystolic: 160,
                BPDiastolic: 95,
                RR: 24,
                Temp: 37.2,
                O2Sat: 94
            },
            diagnosis: "Acute Myocardial Infarction"
        };
        
        // Update the global patient data object
        Object.assign(patientData, fallbackCase);
        
        // Update the global vital signs object
        Object.assign(vitalSigns, fallbackCase.vitalSigns);
        vitalSigns.MAP = calculateMAP(vitalSigns.BPSystolic, vitalSigns.BPDiastolic);
        
        // Update UI with patient information
        patientDemographics.textContent = patientData.demographics;
        chiefComplaint.textContent = patientData.chiefComplaint;
        historySection.textContent = patientData.history;
        
        // Add to case history
        caseHistory.push({
            time: inGameTime,
            event: 'Case started (fallback)',
            data: patientData
        });
        
        return patientData;
    }
}

// Update game time (called every second)
function updateGameTime() {
    // Increment real-time counter (seconds)
    inGameTime += 1;
    
    // Update displays
    updateDisplays();
    
    // Every 10 seconds, update vitals
    if (inGameTime % 10 === 0) {
        updateVitalSigns();
    }
}

// Update vital signs based on patient condition and treatments
async function updateVitalSigns() {
    if (!gameActive) return;
    
    // Create a prompt for updating vital signs
    const vitalsPrompt = `
    Based on the following patient case and timeline of events, update the vital signs realistically, taking into account the underlying condition and any interventions performed so far.
    
    Current patient information:
    - Diagnosis (hidden from player): ${patientData.diagnosis}
    - History: ${patientData.history}
    - Chief complaint: ${patientData.chiefComplaint}
    
    Current vitals:
    - HR: ${vitalSigns.HR} bpm
    - BP: ${vitalSigns.BPSystolic}/${vitalSigns.BPDiastolic} mmHg
    - MAP: ${vitalSigns.MAP} mmHg
    - RR: ${vitalSigns.RR} breaths/min
    - Temp: ${vitalSigns.Temp}°C
    - O2Sat: ${vitalSigns.O2Sat}%
    
    ${caseHistory.length > 1 ? 'Recent events:' : 'No interventions have been performed yet.'}
    ${caseHistory.slice(-5).map(event => `- ${formatGameTime(event.time)}: ${event.event}`).join('\n')}
    
    Time elapsed since case start: ${formatGameTime(inGameTime)} (each 10 seconds real-time represents about 1 minute of in-game time)
    
    Provide updated vital signs as a JSON object with these fields: HR, BPSystolic, BPDiastolic, RR, Temp, O2Sat.
    Use realistic physiological changes based on the patient's condition and any treatments.
    If the patient's condition would naturally worsen or improve at this point, reflect that in the vitals.
    
    Return only valid JSON without any markdown formatting or additional text.`;
    
    try {
        const response = await callAPI([{ role: "user", content: vitalsPrompt }]);
        
        const content = response.choices[0].message.content;
        console.log("Vitals update response:", content);
        
        // Try to extract JSON from the response using multiple patterns
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                         content.match(/```\n([\s\S]*?)\n```/) || 
                         content.match(/{[\s\S]*?}/);
        
        if (jsonMatch) {
            // If a JSON pattern is found, extract and parse it
            const cleanedContent = jsonMatch[0].replace(/```json\n|```\n|```/g, '');
            console.log("Cleaned vitals content:", cleanedContent);
            const updatedVitals = JSON.parse(cleanedContent);
            Object.assign(vitalSigns, updatedVitals);
        } else {
            // Fallback: try to parse the entire content
            const updatedVitals = JSON.parse(content);
            Object.assign(vitalSigns, updatedVitals);
        }
        
        // Calculate MAP
        vitalSigns.MAP = calculateMAP(vitalSigns.BPSystolic, vitalSigns.BPDiastolic);
        
        // Display updated vital signs
        displayVitalSigns();
        
        // Check for critical vitals and have nurse alert if needed
        checkCriticalVitals();
        
    } catch (error) {
        console.error('Error updating vital signs:', error);
        
        // Fallback: Create small realistic changes to vitals
        const randomChange = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
        
        vitalSigns.HR += randomChange(-5, 5);
        vitalSigns.BPSystolic += randomChange(-8, 8);
        vitalSigns.BPDiastolic += randomChange(-5, 5);
        vitalSigns.RR += randomChange(-2, 2);
        vitalSigns.Temp += randomChange(-1, 1) * 0.1;
        vitalSigns.O2Sat += randomChange(-2, 2);
        
        // Keep values in realistic ranges
        vitalSigns.HR = Math.max(40, Math.min(180, vitalSigns.HR));
        vitalSigns.BPSystolic = Math.max(70, Math.min(220, vitalSigns.BPSystolic));
        vitalSigns.BPDiastolic = Math.max(40, Math.min(120, vitalSigns.BPDiastolic));
        vitalSigns.RR = Math.max(8, Math.min(40, vitalSigns.RR));
        vitalSigns.Temp = Math.max(35, Math.min(41, vitalSigns.Temp));
        vitalSigns.O2Sat = Math.max(75, Math.min(100, vitalSigns.O2Sat));
        
        vitalSigns.MAP = calculateMAP(vitalSigns.BPSystolic, vitalSigns.BPDiastolic);
        
        displayVitalSigns();
        checkCriticalVitals();
    }
}

// Check for critical vital signs and have the nurse alert if needed
function checkCriticalVitals() {
    // Define critical thresholds
    const criticalThresholds = {
        HR: { low: 40, high: 130 },
        BPSystolic: { low: 90, high: 180 },
        RR: { low: 8, high: 30 },
        Temp: { low: 35, high: 39.5 },
        O2Sat: { low: 90, high: 100 } // High is just a max value
    };
    
    // Check each vital sign against thresholds
    let criticalMessages = [];
    
    if (vitalSigns.HR < criticalThresholds.HR.low) {
        criticalMessages.push(`Dr., the patient's heart rate is critically low at ${vitalSigns.HR} bpm!`);
    } else if (vitalSigns.HR > criticalThresholds.HR.high) {
        criticalMessages.push(`Dr., the patient's heart rate is dangerously elevated at ${vitalSigns.HR} bpm!`);
    }
    
    if (vitalSigns.BPSystolic < criticalThresholds.BPSystolic.low) {
        criticalMessages.push(`Dr., the patient is hypotensive with BP ${vitalSigns.BPSystolic}/${vitalSigns.BPDiastolic}!`);
    } else if (vitalSigns.BPSystolic > criticalThresholds.BPSystolic.high) {
        criticalMessages.push(`Dr., the patient has severe hypertension with BP ${vitalSigns.BPSystolic}/${vitalSigns.BPDiastolic}!`);
    }
    
    if (vitalSigns.RR < criticalThresholds.RR.low) {
        criticalMessages.push(`Dr., patient's respiratory rate is only ${vitalSigns.RR}, they're not breathing adequately!`);
    } else if (vitalSigns.RR > criticalThresholds.RR.high) {
        criticalMessages.push(`Dr., patient is tachypneic with a respiratory rate of ${vitalSigns.RR}!`);
    }
    
    if (vitalSigns.Temp < criticalThresholds.Temp.low) {
        criticalMessages.push(`Dr., patient is hypothermic with temp ${vitalSigns.Temp}°C!`);
    } else if (vitalSigns.Temp > criticalThresholds.Temp.high) {
        criticalMessages.push(`Dr., patient has a high fever of ${vitalSigns.Temp}°C!`);
    }
    
    if (vitalSigns.O2Sat < criticalThresholds.O2Sat.low) {
        criticalMessages.push(`Dr., patient's oxygen saturation has dropped to ${vitalSigns.O2Sat}%!`);
    }
    
    // Have the nurse alert about the most critical vital sign (if any)
    if (criticalMessages.length > 0) {
        // Randomly select one critical message to avoid spamming alerts
        const randomIndex = Math.floor(Math.random() * criticalMessages.length);
        
        // Only alert sometimes to prevent constant interruptions
        if (Math.random() < 0.7) { // 70% chance to alert
            addMessage('nurse', criticalMessages[randomIndex]);
        }
    }
}

// Display vital signs in the UI
function displayVitalSigns() {
    vitalsDisplay.innerHTML = `
        <p><strong>HR:</strong> ${vitalSigns.HR} bpm</p>
        <p><strong>BP:</strong> ${vitalSigns.BPSystolic}/${vitalSigns.BPDiastolic} mmHg</p>
        <p><strong>MAP:</strong> ${vitalSigns.MAP} mmHg</p>
        <p><strong>RR:</strong> ${vitalSigns.RR} breaths/min</p>
        <p><strong>Temp:</strong> ${vitalSigns.Temp}°C</p>
        <p><strong>O2 Sat:</strong> ${vitalSigns.O2Sat}%</p>
        <p><em>Last updated: ${formatGameTime(inGameTime)}</em></p>
    `;
}

export function setCaseType(type) {
  console.log("setCaseType called with:", type);
  setSelectedCaseType(type);
  console.log("After setSelectedCaseType call");
    
    // Update UI to show selected case
    document.querySelectorAll('.case-button').forEach(button => {
        if (button.dataset.type === type) {
            button.classList.add('selected');
        } else {
            button.classList.remove('selected');
        }
    });
    
    // Enable start button now that a case is selected
    startGameButton.disabled = false;
    startGameButton.classList.remove('disabled');
}

// Export functions for use in main.js
export {
    startGame,
    updateGameTime,
    checkCriticalVitals,
    displayVitalSigns
};
