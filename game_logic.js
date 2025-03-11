console.log("Game logic module loaded");

// Import shared utilities and variables
import { 
    gameActive, inGameTime, cost, score, caseHistory, patientData, vitalSigns,
    actionInProgress, selectedCaseType, gameIntervalId, updateDisplays,
    calculateMAP, formatGameTime, addMessage, addResult, resetGame,
    // Import all setter functions (rename updateVitalSigns to avoid conflict)
    setGameActive, setInGameTime, incrementInGameTime, setCost, setScore, 
    setCaseHistory, addToCaseHistory, setPatientData, updatePatientData, 
    setVitalSigns, updateVitalSigns as setVitalSignsData, updateVitalSign, setActionInProgress, 
    setSelectedCaseType, setGameIntervalId,
    // DOM elements
    messageArea, startGameButton, caseButtons, chatInput, sendMessageButton,
    actionButtons, preGameMessage, patientDataSection, patientDemographics,
    chiefComplaint, historySection, vitalsDisplay, resultsArea
} from './utils.js';

// Import API functions
import { callAPI } from './api.js';

// Add patient status tracking
let patientDeceased = false;
let patientCured = false;

// Start the game
async function startGame() {
    if (!selectedCaseType) {
        alert('Please select a case type first.');
        return;
    }
    
    // Reset game state using setter functions
    setGameActive(true);
    setInGameTime(0);
    setCost(0);
    setScore(0);
    setCaseHistory([]);
    setActionInProgress(true); // Prevent actions during initialization
    
    // Reset patient status
    patientDeceased = false;
    patientCured = false;
    
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
        setGameIntervalId(setInterval(updateGameTime, 1000));
        
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
        refreshVitalSigns();
	    
        forceUpdatePatientUI();
	    
        setActionInProgress(false);
    } catch (error) {
        console.error('Error starting game:', error);
        messageArea.innerHTML += '<div class="message system-message">Error starting game. Please try again.</div>';
        resetGame();
    }
}

// Generate a new patient case based on the selected type
async function generatePatientCase() {
    const prompt = `You are an advanced medical case simulation engine for an internal medicine resident training game. Your task is to generate a realistic, medically accurate, and engaging patient case of a ${selectedCaseType} where the player interacts with the patient to make diagnostic and management decisions.
	
 	IMPORTANT - RETURN DATA IN THIS EXACT FORMAT:
	{
	  "demographics": "65-year-old male with history of hypertension, diabetes. Medications: metformin, lisinopril", 
	  "chiefComplaint": "I've been feeling really short of breath for the past two days",
	  "history": "The patient reports increasing shortness of breath over the past two days, worse with exertion...",
	  "vitalSigns": {
	    "HR": 75,
	    "BPSystolic": 120,
	    "BPDiastolic": 80,
	    "RR": 18,
	    "Temp": 37.0,
	    "O2Sat": 95
	  },
	  "diagnosis": "Community-acquired pneumonia"
	}
 
 	Case Requirements:
		- The case should be appropriately challenging for an internal medicine resident.
		- It should simulate an actual patient encounter, allowing for history-taking, physical exam findings, and diagnostic decision-making.
		- The final diagnosis should be hidden from the player, requiring them to work through the case.
	Case Structure:
		1. Patient Demographics:
		   - Age, gender, ethnicity (if relevant)
		   - Any significant past medical history, family history, social history (smoking, alcohol, drug use)
		   - Medications the patient is currently taking
		 2. Chief Complaint (CC):
		   - A brief and natural patient-reported reason for the visit (e.g., "I've been feeling really short of breath for the past two days.")
		 3. History of Present Illness (HPI):
		   - Detailed narrative including:
			 - Onset (acute, chronic, progressive)
			 - Location (if applicable)
			 - Duration (how long the symptoms have lasted)
			 - Character (sharp, dull, burning, etc.)
			 - Alleviating/aggravating factors (what makes it better or worse)
			 - Associated symptoms (e.g., fever, nausea, weight loss, night sweats)
			 - Pertinent negatives (e.g., denies chest pain, denies recent travel)
			 - Recent relevant exposures (e.g., sick contacts, travel, hospitalizations, new medications, recent procedures)
		 4. Vital Signs:
		   - Heart Rate (HR)
		   - Blood Pressure (BP)
		   - Respiratory Rate (RR)
		   - Temperature (Temp)
		   - Oxygen Saturation (O2 Sat)
		   - (Include a realistic set of vitals based on the case)
		 5. Physical Examination:
		   - General appearance (e.g., "Patient appears uncomfortable, diaphoretic.")
		   - Relevant system-specific findings (e.g., "Bilateral crackles at lung bases" for CHF, "Systolic murmur loudest at the right upper sternal border" for aortic stenosis)
		   - Neurological findings if relevant (e.g., "Decreased strength in right upper and lower extremity, positive Babinski sign.")
		 6. Diagnostic Workup:
		   - Laboratory results: Provide normal vs. abnormal values as appropriate. Include key findings like:
			 - CBC, BMP, liver function tests, cardiac enzymes, inflammatory markers, coagulation panel, etc.
		   - Imaging findings (e.g., CXR, CT scan, MRI, ultrasound)
		   - EKG if relevant (e.g., "Sinus tachycardia with ST depressions in leads II, III, aVF")
		   - Point-of-care tests (POCT) (e.g., "Urinalysis shows +2 protein, +1 blood")
		 7. The Underlying Diagnosis (Hidden from Player):
		   - Clearly define the correct final diagnosis.
		   - Include differential diagnoses the player should consider.
		   - Explain why this diagnosis fits the patient presentation.
		Additional Features for Interactivity:
		1. Dynamic Patient Responses:
		   - If the player asks a relevant question, provide a realistic patient response (e.g., "No, I haven't had any recent fevers, but I did have a bad cough last week.")
		   - If the player asks an irrelevant or vague question, make the patient respond accordingly (e.g., "I'm not sure what you mean, doc.")
		2. Progressive Case Evolution:
		   - The patient's condition may worsen if the correct intervention is delayed.
		   - Critical findings should become more apparent over time.
		3. Scoring System (if applicable):
		   - The player is scored based on:
			 - Correct history-taking questions asked.
			 - Accuracy of physical exam interpretation.
			 - Diagnostic reasoning and test ordering.
			 - Correctness of treatment decisions.

	Return valid JSON without any markdown formatting or additional text, using exactly the field names specified above.`;
    
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
        
        // Parse the JSON with error handling
        let newPatientData;
        try {
            // Try to parse directly first
            newPatientData = JSON.parse(cleanedContent);
        } catch (parseError) {
            console.error("JSON parsing failed:", parseError);
            
            // Try to repair the JSON
            try {
                const repairedJson = repairJson(cleanedContent);
                newPatientData = JSON.parse(repairedJson);
                console.log("Successfully parsed repaired JSON");
            } catch (repairError) {
                console.error("Failed to repair JSON:", repairError);
                // If repair fails, extract key information and create a simplified structure
                newPatientData = extractPatientData(cleanedContent);
            }
        }
        
        // Transform the API data structure to our expected format
        const transformedData = transformPatientData(newPatientData);
        
        // Update the global patient data object using setters
        updatePatientData(transformedData);
        
        // Update the global vital signs object - using renamed function
        setVitalSignsData(transformedData.vitalSigns);
        
        // Calculate MAP (Mean Arterial Pressure)
        updateVitalSign('MAP', calculateMAP(vitalSigns.BPSystolic, vitalSigns.BPDiastolic));
        
        // Update UI with patient information
        patientDemographics.textContent = patientData.demographics;
        chiefComplaint.textContent = patientData.chiefComplaint;
        historySection.textContent = patientData.history;
        
        // Add to case history
        addToCaseHistory({
            time: inGameTime,
            event: 'Case started',
            data: patientData
        });
        forceUpdatePatientUI();
        return patientData;
    } catch (error) {
        console.error('Error parsing patient case:', error);
        
      // Create a fallback patient case for testing
        const fallbackCase = {
            demographics: "Error",
            chiefComplaint: "Can't parse API output",
            history: "Sorry about this, robbie.med will try to fix this ASAP.",
            vitalSigns: {
                HR: 1,
                BPSystolic: 16,
                BPDiastolic: 9.5,
                RR: 2.4,
                Temp: 30.2,
                O2Sat: 9
            },
            diagnosis: "Acute AI Malfunction"
        };
        
        // Update using setter functions
        updatePatientData(fallbackCase);
        setVitalSignsData(fallbackCase.vitalSigns);
        updateVitalSign('MAP', calculateMAP(vitalSigns.BPSystolic, vitalSigns.BPDiastolic));
        
        // Update UI with patient information
        patientDemographics.textContent = patientData.demographics;
        chiefComplaint.textContent = patientData.chiefComplaint;
        historySection.textContent = patientData.history;
        
        // Add to case history
        addToCaseHistory({
            time: inGameTime,
            event: 'Case started (fallback)',
            data: patientData
        });
        
        return patientData;
    }
}

// Update game time (called every second)
function updateGameTime() {
    // Don't update if patient is in a terminal state
    if (patientDeceased || patientCured) return;
    
    // Increment real-time counter (seconds) using setter
    incrementInGameTime();
    
    // Update displays
    updateDisplays();
    
    // Every 10 seconds, update vitals
    if (inGameTime % 10 === 0) {
        refreshVitalSigns();
    }
    
    // Check if the case should be auto-resolved after a long period
    // This prevents endless games if the player doesn't take decisive action
    if (inGameTime > 6000) { // After some minutes (in-game time) with no resolution
        checkForAutoResolution();
    }
}

// Check if we should auto-resolve a case that's gone on too long
function checkForAutoResolution() {
    // Only proceed if we haven't already reached a terminal state
    if (!patientDeceased && !patientCured) {
        // If score is positive, patient is likely doing well
        if (score > 5) {
            handlePatientCured("The patient's condition has stabilized due to your interventions.");
        } 
        // If score is negative, patient is likely doing poorly
        else if (score < -5) {
            handlePatientDeath("The patient's condition has deteriorated despite treatment attempts.");
        }
    }
}

// Update vital signs based on patient condition and treatments
async function refreshVitalSigns() {
    if (!gameActive) return;
    
    // If patient is already in a terminal state, don't update vitals
    if (patientDeceased) {
        displayCardiacArrestVitals();
        return;
    }
    
    if (patientCured) {
        displayStableVitals();
        return;
    }
    
    // Check case history for death or recovery indications
    checkResultsForTerminalStatus();
    
    // If patient entered terminal state, don't proceed with vitals update
    if (patientDeceased || patientCured) return;
    
    // Create a prompt for updating vital signs
    const vitalsPrompt = `You are a real-time patient physiology simulator for an internal medicine resident training game. Your goal is to update the patient's vital signs dynamically and realistically  taking into account the underlying condition and any interventions performed so far.  Consider:
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
    The Disease:  
	- The natural progression of the underlying disease.
	- Appropriate interventions and treatments administered by the player.
	- Inappropriate treatments or delays, which may cause rapid deterioration.
	- Expected physiological responses over time (e.g., slow improvement vs. acute decompensation).
	Recent Events:
	 ${caseHistory.length > 1 ? 'Recent events:' : 'No interventions have been performed yet.'}
	 ${caseHistory.slice(-5).map(event => `- ${formatGameTime(event.time)}: ${event.event}`).join('\n')}  
	 Time elapsed since case start: ${formatGameTime(inGameTime)} (each 10 seconds real-time represents about 1 minute of in-game time)
	Instructions:
		- Update vital signs realistically based on the current state of disease progression and treatments administered.
		- If no intervention has been performed and the disease would naturally progress, adjust the vitals accordingly (gradual or rapid worsening).
		- If a correct intervention was performed, reflect improvement in a reasonable time frame.
		- If an incorrect or harmful intervention was given, introduce acute deterioration (e.g., respiratory failure after too much IV fluids in CHF).
		- If the patient is critically ill, simulate rapid decline unless immediate resuscitative measures are taken.
		- Consider expected pharmacokinetics & physiology (e.g., beta-blockers reducing HR over time, vasopressors increasing BP rapidly).
  		- Consider drug-drug interactions that result in crystalization or other adverse effects 
    		- Consider the deadly effects of massive overdose, or inappropriate meds.  It's okay if the simulated patient dies--this is a training simulator for doctors, and they need to be able to make mistakes and learn from them. 
	Output Format:
    Provide updated vital signs as a JSON object with these fields: HR, BPSystolic, BPDiastolic, RR, Temp, O2Sat.
    Return only valid JSON without any markdown formatting or additional text.`;
    
    try {
        const response = await callAPI([{ role: "user", content: vitalsPrompt }]);
        
        const content = response.choices[0].message.content;
        console.log("Vitals update response:", content);
        
        // Try to extract JSON from the response using multiple patterns
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                         content.match(/```\n([\s\S]*?)\n```/) || 
                         content.match(/{[\s\S]*?}/);
        
        let updatedVitals;
        if (jsonMatch) {
            // If a JSON pattern is found, extract and parse it
            const cleanedContent = jsonMatch[0].replace(/```json\n|```\n|```/g, '');
            console.log("Cleaned vitals content:", cleanedContent);
            try {
                updatedVitals = JSON.parse(cleanedContent);
            } catch (parseError) {
                // Try to repair if parsing fails
                const repairedJson = repairJson(cleanedContent);
                updatedVitals = JSON.parse(repairedJson);
            }
            // Update using renamed setter
            setVitalSignsData(updatedVitals);
        } else {
            // Fallback: try to parse the entire content
            try {
                updatedVitals = JSON.parse(content);
                // Update using renamed setter
                setVitalSignsData(updatedVitals);
            } catch (parseError) {
                // If that fails, extract vitals using regex
                updatedVitals = extractVitalSigns(content);
                setVitalSignsData(updatedVitals);
            }
        }
        
        // Calculate MAP
        updateVitalSign('MAP', calculateMAP(vitalSigns.BPSystolic, vitalSigns.BPDiastolic));
        
        // Display updated vital signs
        displayVitalSigns();
        
        // Check for critical vitals and have nurse alert if needed
        checkCriticalVitals();
        
        // Check for recovery based on vital signs
        checkVitalsForRecovery();
        
        // Check for death based on vital signs
        checkVitalsForDeath();
        
    } catch (error) {
        console.error('Error updating vital signs:', error);
        
        // Fallback: Create small realistic changes to vitals
        const randomChange = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
        
        // Use individual updateVitalSign calls for each change
        updateVitalSign('HR', vitalSigns.HR + randomChange(-5, 5));
        updateVitalSign('BPSystolic', vitalSigns.BPSystolic + randomChange(-8, 8));
        updateVitalSign('BPDiastolic', vitalSigns.BPDiastolic + randomChange(-5, 5));
        updateVitalSign('RR', vitalSigns.RR + randomChange(-2, 2));
        updateVitalSign('Temp', vitalSigns.Temp + randomChange(-1, 1) * 0.1);
        updateVitalSign('O2Sat', vitalSigns.O2Sat + randomChange(-2, 2));
        
        // Keep values in realistic ranges
        updateVitalSign('HR', Math.max(40, Math.min(180, vitalSigns.HR)));
        updateVitalSign('BPSystolic', Math.max(70, Math.min(220, vitalSigns.BPSystolic)));
        updateVitalSign('BPDiastolic', Math.max(40, Math.min(120, vitalSigns.BPDiastolic)));
        updateVitalSign('RR', Math.max(8, Math.min(40, vitalSigns.RR)));
        updateVitalSign('Temp', Math.max(35, Math.min(41, vitalSigns.Temp)));
        updateVitalSign('O2Sat', Math.max(75, Math.min(100, vitalSigns.O2Sat)));
        
        updateVitalSign('MAP', calculateMAP(vitalSigns.BPSystolic, vitalSigns.BPDiastolic));
        
        displayVitalSigns();
        checkCriticalVitals();
    }
}

// Check case history results for indications of patient death or recovery
function checkResultsForTerminalStatus() {
    // Get the recent results from case history
    const recentResults = caseHistory
        .filter(event => event.event.includes("Result received"))
        .map(event => event.data?.result || "")
        .join(" ")
        .toLowerCase();
    
    // Check for death indicators
    if (recentResults.includes("cardiac arrest") || 
        recentResults.includes("patient died") || 
        recentResults.includes("death") ||
        recentResults.includes("fatal") ||
        recentResults.includes("expired") ||
        recentResults.includes("deceased")) {
        
        // Extract the cause of death if possible
        let causeOfDeath = "Cardiac arrest";
        if (recentResults.includes("due to") || recentResults.includes("caused by")) {
            const causePhrases = ["due to", "caused by", "result of", "secondary to"];
            for (const phrase of causePhrases) {
                if (recentResults.includes(phrase)) {
                    const parts = recentResults.split(phrase);
                    if (parts.length > 1) {
                        // Extract a reasonable length cause
                        causeOfDeath = parts[1].split('.')[0].trim();
                        causeOfDeath = causeOfDeath.charAt(0).toUpperCase() + causeOfDeath.slice(1);
                        break;
                    }
                }
            }
        }
        
        handlePatientDeath(causeOfDeath);
    }
    
    // Check for recovery indicators
    if (recentResults.includes("fully recovered") || 
        recentResults.includes("discharged") || 
        recentResults.includes("condition has stabilized") ||
        recentResults.includes("marked improvement") ||
        recentResults.includes("symptoms resolved")) {
        
        handlePatientCured("The patient's condition has stabilized and they're ready for discharge");
    }
}

// Check vital signs for potential patient death
function checkVitalsForDeath() {
    // If any vitals indicate severe deterioration
    if ((vitalSigns.HR < 20 || vitalSigns.HR > 180) ||
        (vitalSigns.BPSystolic < 50) ||
        (vitalSigns.O2Sat < 60) ||
        (vitalSigns.RR < 5)) {
        
        // Determine cause based on the most severe abnormal vital
        let cause = "Cardiopulmonary collapse";
        
        if (vitalSigns.HR < 20) {
            cause = "Severe bradycardia leading to cardiac arrest";
        } else if (vitalSigns.HR > 180) {
            cause = "Malignant tachyarrhythmia";
        } else if (vitalSigns.BPSystolic < 50) {
            cause = "Profound hypotension and circulatory collapse";
        } else if (vitalSigns.O2Sat < 60) {
            cause = "Severe hypoxemia";
        } else if (vitalSigns.RR < 5) {
            cause = "Respiratory failure";
        }
        
        handlePatientDeath(cause);
    }
}

// Check vital signs for potential patient recovery
function checkVitalsForRecovery() {
    // If all vitals are within normal ranges and the score is positive
    if (score > 10 &&
        (vitalSigns.HR >= 60 && vitalSigns.HR <= 100) &&
        (vitalSigns.BPSystolic >= 100 && vitalSigns.BPSystolic <= 140) &&
        (vitalSigns.BPDiastolic >= 60 && vitalSigns.BPDiastolic <= 90) &&
        (vitalSigns.RR >= 12 && vitalSigns.RR <= 20) &&
        (vitalSigns.Temp >= 36.5 && vitalSigns.Temp <= 37.5) &&
        (vitalSigns.O2Sat >= 95)) {
        
        // Check how long vitals have been stable
        const stableVitals = caseHistory.filter(event => 
            event.event === 'Vitals checked' && 
            event.data?.HR >= 60 && event.data?.HR <= 100 &&
            event.data?.BPSystolic >= 100 && event.data?.BPSystolic <= 140 &&
            event.data?.O2Sat >= 95
        );
        
        // If vitals have been stable for multiple checks
        if (stableVitals.length >= 3) {
            handlePatientCured("Patient has maintained stable vital signs and is responding well to treatment");
        }
    }
}

// Display cardiac arrest vitals when patient dies
function displayCardiacArrestVitals() {
    // Set vitals to reflect cardiac arrest
    updateVitalSign('HR', 0);
    updateVitalSign('BPSystolic', 0);
    updateVitalSign('BPDiastolic', 0);
    updateVitalSign('MAP', 0);
    updateVitalSign('RR', 0);
    updateVitalSign('O2Sat', 0);
    
    // Update display with cardiac arrest vitals
    vitalsDisplay.innerHTML = `
        <p><strong>HR:</strong> 0 bpm</p>
        <p><strong>BP:</strong> 0/0 mmHg</p>
        <p><strong>MAP:</strong> 0 mmHg</p>
        <p><strong>RR:</strong> 0 breaths/min</p>
        <p><strong>Temp:</strong> ${vitalSigns.Temp.toFixed(1)}°C</p>
        <p><strong>O2 Sat:</strong> 0%</p>
        <p style="color: red; font-weight: bold;">CARDIAC ARREST</p>
        <p><em>Last updated: ${formatGameTime(inGameTime)}</em></p>
    `;
}

// Display stable vitals when patient is cured
function displayStableVitals() {
    // Display normal/stable vitals
    vitalsDisplay.innerHTML = `
        <p><strong>HR:</strong> ${vitalSigns.HR} bpm</p>
        <p><strong>BP:</strong> ${vitalSigns.BPSystolic}/${vitalSigns.BPDiastolic} mmHg</p>
        <p><strong>MAP:</strong> ${vitalSigns.MAP} mmHg</p>
        <p><strong>RR:</strong> ${vitalSigns.RR} breaths/min</p>
        <p><strong>Temp:</strong> ${vitalSigns.Temp.toFixed(1)}°C</p>
        <p><strong>O2 Sat:</strong> ${vitalSigns.O2Sat}%</p>
        <p style="color: green; font-weight: bold;">STABLE</p>
        <p><em>Last updated: ${formatGameTime(inGameTime)}</em></p>
    `;
}

// Handle patient death
function handlePatientDeath(cause) {
    // Only proceed if not already in a terminal state
    if (patientDeceased || patientCured) return;
    
    console.log("Patient death handler triggered:", cause);
    
    // Set patient as deceased
    patientDeceased = true;
    
    // Display cardiac arrest vitals
    displayCardiacArrestVitals();
    
    // Add system message about code blue
    addMessage('system', 'CODE BLUE! The patient has gone into cardiac arrest.');
    
    // Add nurse message about the event
    addMessage('nurse', `Dr., the patient is in cardiac arrest! ${cause || ""}. Code team is responding.`);
    
    // Create game over message
    const gameOverMessage = document.createElement('div');
    gameOverMessage.className = 'result error';
    gameOverMessage.innerHTML = `
        <div class="result-header">
            <span class="result-time">${formatGameTime(inGameTime)}</span>
            <span class="result-type">CRITICAL EVENT</span>
        </div>
        <div class="result-content">
            <h3>Patient Expired</h3>
            <p>The patient has gone into cardiac arrest and has died.</p>
            <p><strong>Cause:</strong> ${cause || "Cardiopulmonary collapse"}</p>
            <p>Your final score: ${score}</p>
            <p>Please review the case and consider what could have been done differently.</p>
        </div>
    `;
    resultsArea.appendChild(gameOverMessage);
    resultsArea.scrollTop = resultsArea.scrollHeight;
    
    // Add to case history
    addToCaseHistory({
        time: inGameTime,
        event: `Patient deceased: ${cause || "Cardiopulmonary collapse"}`,
        data: {
            vitalSigns: {
                HR: 0,
                BPSystolic: 0,
                BPDiastolic: 0,
                MAP: 0,
                RR: 0,
                O2Sat: 0,
                Temp: vitalSigns.Temp
            }
        }
    });
    
    // Disable action buttons
    if (actionButtons) {
        actionButtons.querySelectorAll('.action-button').forEach(btn => {
            btn.disabled = true;
            btn.classList.add('disabled');
        });
    }
    
    // Show end game button
    document.getElementById('end-game').classList.remove('hidden');
    
    // Attending message about debrief
    setTimeout(() => {
        addMessage('attending', `The patient didn't make it. We should debrief on this case to discuss what happened and what we could have done differently.`);
    }, 3000);
}

// Handle patient cured
function handlePatientCured(reason) {
    // Only proceed if not already in a terminal state
    if (patientDeceased || patientCured) return;
    
    console.log("Patient cured handler triggered:", reason);
    
    // Set patient as cured
    patientCured = true;
    
    // Add messages about recovery
    addMessage('nurse', `Dr., the patient's condition has markedly improved!`);
    
    // Create success message
    const successMessage = document.createElement('div');
    successMessage.className = 'result';
    successMessage.style.borderLeftColor = '#2ecc71';
    successMessage.style.backgroundColor = '#e8f8f2';
    successMessage.innerHTML = `
        <div class="result-header">
            <span class="result-time">${formatGameTime(inGameTime)}</span>
            <span class="result-type">CASE RESOLVED</span>
        </div>
        <div class="result-content">
            <h3>Patient Successfully Treated</h3>
            <p>${reason}</p>
            <p><strong>Diagnosis:</strong> ${patientData.diagnosis}</p>
            <p><strong>Your score:</strong> ${score}</p>
            <p>Well done! The patient can now be transferred to a regular unit for continued care.</p>
        </div>
    `;
    resultsArea.appendChild(successMessage);
    resultsArea.scrollTop = resultsArea.scrollHeight;
    
    // Add to case history
    addToCaseHistory({
        time: inGameTime,
        event: `Patient successfully treated: ${reason}`,
        data: { diagnosis: patientData.diagnosis }
    });
    
    // Display stable vitals
    displayStableVitals();
    
    // Disable action buttons
    if (actionButtons) {
        actionButtons.querySelectorAll('.action-button').forEach(btn => {
            btn.disabled = true;
            btn.classList.add('disabled');
        });
    }
    
    // Show end game button
    document.getElementById('end-game').classList.remove('hidden');
    
    // Attending message of congratulations
    setTimeout(() => {
        addMessage('attending', `Great job, doctor! The patient is responding well to your treatment plan. The correct diagnosis was ${patientData.diagnosis}.`);
    }, 3000);
}

// Check for critical vital signs and have the nurse alert if needed
function checkCriticalVitals() {
    // Skip if patient is already in a terminal state
    if (patientDeceased || patientCured) return;
    
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
    
    // Add vitals to case history
    addToCaseHistory({
        time: inGameTime,
        event: 'Vitals checked',
        data: { ...vitalSigns }
    });
}

// Display vital signs in the UI
function displayVitalSigns() {
    // If patient is deceased, show cardiac arrest vitals
    if (patientDeceased) {
        displayCardiacArrestVitals();
        return;
    }
    
    // If patient is cured, show stable vitals
    if (patientCured) {
        displayStableVitals();
        return;
    }
    
    // Display normal vitals
    vitalsDisplay.innerHTML = `
        <p><strong>HR:</strong> ${vitalSigns.HR} bpm</p>
        <p><strong>BP:</strong> ${vitalSigns.BPSystolic}/${vitalSigns.BPDiastolic} mmHg</p>
        <p><strong>MAP:</strong> ${vitalSigns.MAP} mmHg</p>
        <p><strong>RR:</strong> ${vitalSigns.RR} breaths/min</p>
        <p><strong>Temp:</strong> ${vitalSigns.Temp.toFixed(1)}°C</p>
        <p><strong>O2 Sat:</strong> ${vitalSigns.O2Sat}%</p>
        <p><em>Last updated: ${formatGameTime(inGameTime)}</em></p>
    `;
}

// Force update the patient UI elements
function forceUpdatePatientUI() {
    console.log("Force-updating patient UI");
    
    // Get elements directly to ensure we have the latest references
    const patientDataSection = document.getElementById('patient-data');
    const demographicsElement = document.getElementById('patient-demographics');
    const chiefComplaintElement = document.getElementById('chief-complaint');
    const historyElement = document.getElementById('history');
    
    // Log debug info
    console.log("Patient data elements:", {
        patientDataSection: !!patientDataSection,
        demographicsElement: !!demographicsElement,
        chiefComplaintElement: !!chiefComplaintElement,
        historyElement: !!historyElement
    });
    
    // Update elements if they exist and we have data
    if (demographicsElement && patientData?.demographics) {
        demographicsElement.textContent = patientData.demographics;
    }
    
    if (chiefComplaintElement && patientData?.chiefComplaint) {
        chiefComplaintElement.textContent = patientData.chiefComplaint;
    }
    
    if (historyElement && patientData?.history) {
        historyElement.textContent = patientData.history;
    }
    
    // Make sure the section is visible
    if (patientDataSection) {
        patientDataSection.classList.remove('hidden');
        patientDataSection.style.display = 'block'; // Force display
    }
}

// Helper functions for JSON parsing and data transformation

// Repair incomplete or malformed JSON
function repairJson(jsonString) {
    // Count opening and closing braces/brackets to detect mismatches
    let openBraces = (jsonString.match(/{/g) || []).length;
    let closeBraces = (jsonString.match(/}/g) || []).length;
    let openBrackets = (jsonString.match(/\[/g) || []).length;
    let closeBrackets = (jsonString.match(/\]/g) || []).length;
    
    // Add missing closing braces/brackets
    let repairedJson = jsonString;
    
    // Add missing closing brackets
    while (openBrackets > closeBrackets) {
        repairedJson += ']';
        closeBrackets++;
    }
    
    // Add missing closing braces
    while (openBraces > closeBraces) {
        repairedJson += '}';
        closeBraces++;
    }
    
    return repairedJson;
}

// Extract patient data using regex when JSON parsing fails
function extractPatientData(text) {
    // Default values
    const patientData = {
        demographics: "Adult patient",
        chiefComplaint: "Multiple symptoms",
        history: "Patient presented with concerning symptoms",
        vitalSigns: {
            HR: 80,
            BPSystolic: 120,
            BPDiastolic: 80,
            RR: 16,
            Temp: 37.0,
            O2Sat: 98
        },
        diagnosis: "Diagnostic workup in progress"
    };
    
    // Extract demographics
    const ageMatch = text.match(/"age":\s*(\d+)/);
    const genderMatch = text.match(/"gender":\s*"([^"]*)"/);
    
    if (ageMatch && genderMatch) {
        patientData.demographics = `${ageMatch[1]}-year-old ${genderMatch[1]} patient`;
    }
    
    // Extract chief complaint
    const chiefComplaintMatch = text.match(/"chiefComplaint":\s*"([^"]*)"/);
    if (chiefComplaintMatch) {
        patientData.chiefComplaint = chiefComplaintMatch[1];
    }
    
    // Extract history
    const historyMatch = text.match(/"narrative":\s*"([^"]*)"/);
    if (historyMatch) {
        patientData.history = historyMatch[1];
    }
    
    // Extract vital signs
    patientData.vitalSigns = extractVitalSigns(text);
    
    // Extract diagnosis
    const diagnosisMatch = text.match(/"correctDiagnosis":\s*"([^"]*)"/);
    if (diagnosisMatch) {
        patientData.diagnosis = diagnosisMatch[1];
    }
    
    return patientData;
}

// Extract vital signs from text
function extractVitalSigns(text) {
    const vitals = {
        HR: 80,
        BPSystolic: 120,
        BPDiastolic: 80,
        RR: 16,
        Temp: 37.0,
        O2Sat: 98
    };
    
    // Extract heart rate
    const hrMatch = text.match(/"heartRate":\s*(\d+)/) || text.match(/"HR":\s*(\d+)/);
    if (hrMatch) {
        vitals.HR = parseInt(hrMatch[1]);
    }
    
    // Extract blood pressure
    const bpMatch = text.match(/"bloodPressure":\s*"([^"]*)"/) || text.match(/"BP":\s*"([^"]*)"/);
    if (bpMatch) {
        const parts = bpMatch[1].split('/');
        if (parts.length === 2) {
            vitals.BPSystolic = parseInt(parts[0]);
            vitals.BPDiastolic = parseInt(parts[1]);
        }
    } else {
        // Try to extract systolic and diastolic separately
        const sysMatch = text.match(/"BPSystolic":\s*(\d+)/);
        const diaMatch = text.match(/"BPDiastolic":\s*(\d+)/);
        
        if (sysMatch) vitals.BPSystolic = parseInt(sysMatch[1]);
        if (diaMatch) vitals.BPDiastolic = parseInt(diaMatch[1]);
    }
    
    // Extract respiratory rate
    const rrMatch = text.match(/"respiratoryRate":\s*(\d+)/) || text.match(/"RR":\s*(\d+)/);
    if (rrMatch) {
        vitals.RR = parseInt(rrMatch[1]);
    }
    
    // Extract temperature
    const tempMatch = text.match(/"temperature":\s*"([^"]*)"/) || 
                     text.match(/"temperature":\s*([\d.]+)/) || 
                     text.match(/"Temp":\s*([\d.]+)/);
    if (tempMatch) {
        const tempValue = tempMatch[1];
        if (typeof tempValue === 'string' && tempValue.includes('F')) {
            // Convert Fahrenheit to Celsius
            const fahrenheit = parseFloat(tempValue.replace('F', ''));
            vitals.Temp = ((fahrenheit - 32) * 5/9);
        } else {
            vitals.Temp = parseFloat(tempValue);
        }
    }
    
    // Extract oxygen saturation
    const o2Match = text.match(/"oxygenSaturation":\s*"([^"]*)"/) || 
                   text.match(/"oxygenSaturation":\s*(\d+)/) ||
                   text.match(/"O2Sat":\s*(\d+)/);
    if (o2Match) {
        const o2Value = o2Match[1];
        if (typeof o2Value === 'string' && o2Value.includes('%')) {
            vitals.O2Sat = parseInt(o2Value);
        } else {
            vitals.O2Sat = parseInt(o2Value);
        }
    }
    
    return vitals;
}

// Transform API response data to our expected format
function transformPatientData(apiData) {
    const transformedData = {
        demographics: "",
        chiefComplaint: "",
        history: "",
        vitalSigns: {
            HR: 80,
            BPSystolic: 120,
            BPDiastolic: 80,
            RR: 16,
            Temp: 37.0,
            O2Sat: 98
        },
        diagnosis: "Unknown"
    };
    
    // Handle patientDemographics field
    if (apiData.patientDemographics) {
        const pd = apiData.patientDemographics;
        let demoText = "";
        
        if (pd.age && pd.gender) {
            demoText = `${pd.age}-year-old ${pd.gender}`;
            
            if (pd.ethnicity) {
                demoText += ` (${pd.ethnicity})`;
            }
            
            // Add medical history if available
            if (pd.pastMedicalHistory) {
                if (Array.isArray(pd.pastMedicalHistory)) {
                    demoText += ` with history of ${pd.pastMedicalHistory.join(', ')}`;
                } else if (typeof pd.pastMedicalHistory === 'string') {
                    demoText += ` with history of ${pd.pastMedicalHistory}`;
                }
            }
            
            // Add medications if available
            if (pd.medications && Array.isArray(pd.medications) && pd.medications.length > 0) {
                demoText += `. Current medications: ${pd.medications.join(', ')}`;
            }
        } else if (pd.age) {
            demoText = `${pd.age}-year-old patient`;
        } else if (apiData.demographics) {
            demoText = apiData.demographics;
        } else {
            demoText = "Adult patient";
        }
        
        transformedData.demographics = demoText;
    } else if (apiData.demographics) {
        transformedData.demographics = apiData.demographics;
    }
    
    // Handle chief complaint
    transformedData.chiefComplaint = apiData.chiefComplaint || "Multiple symptoms";
    
    // Handle history
    if (apiData.historyOfPresentIllness && apiData.historyOfPresentIllness.narrative) {
        transformedData.history = apiData.historyOfPresentIllness.narrative;
    } else if (apiData.history) {
        transformedData.history = apiData.history;
    }
    
    // Handle vital signs
    if (apiData.vitalSigns) {
        const vs = apiData.vitalSigns;
        
        // Handle different field naming patterns
        if (vs.heartRate !== undefined) transformedData.vitalSigns.HR = vs.heartRate;
        else if (vs.HR !== undefined) transformedData.vitalSigns.HR = vs.HR;
        
        // Handle blood pressure
        if (vs.bloodPressure && typeof vs.bloodPressure === 'string') {
            const parts = vs.bloodPressure.split('/');
            if (parts.length === 2) {
                transformedData.vitalSigns.BPSystolic = parseInt(parts[0]);
                transformedData.vitalSigns.BPDiastolic = parseInt(parts[1]);
            }
        } else {
            if (vs.BPSystolic !== undefined) transformedData.vitalSigns.BPSystolic = vs.BPSystolic;
            if (vs.BPDiastolic !== undefined) transformedData.vitalSigns.BPDiastolic = vs.BPDiastolic;
        }
        
        // Handle respiratory rate
        if (vs.respiratoryRate !== undefined) transformedData.vitalSigns.RR = vs.respiratoryRate;
        else if (vs.RR !== undefined) transformedData.vitalSigns.RR = vs.RR;
        
        // Handle temperature
        if (vs.temperature) {
            if (typeof vs.temperature === 'string' && vs.temperature.includes('F')) {
                const fahrenheit = parseFloat(vs.temperature.replace('F', ''));
                transformedData.vitalSigns.Temp = ((fahrenheit - 32) * 5/9);
            } else if (typeof vs.temperature === 'string' && vs.temperature.includes('C')) {
                transformedData.vitalSigns.Temp = parseFloat(vs.temperature.replace('C', ''));
            } else {
                transformedData.vitalSigns.Temp = parseFloat(vs.temperature);
            }
        } else if (vs.Temp !== undefined) {
            transformedData.vitalSigns.Temp = vs.Temp;
        }
        
        // Handle oxygen saturation
        if (vs.oxygenSaturation) {
            if (typeof vs.oxygenSaturation === 'string') {
                const percentMatch = vs.oxygenSaturation.match(/(\d+)%/);
                if (percentMatch) {
                    transformedData.vitalSigns.O2Sat = parseInt(percentMatch[1]);
                }
            } else {
                transformedData.vitalSigns.O2Sat = vs.oxygenSaturation;
            }
        } else if (vs.O2Sat !== undefined) {
            transformedData.vitalSigns.O2Sat = vs.O2Sat;
        }
    }
    
    // Handle diagnosis
    if (apiData.underlyingDiagnosis && apiData.underlyingDiagnosis.correctDiagnosis) {
        transformedData.diagnosis = apiData.underlyingDiagnosis.correctDiagnosis;
    } else if (apiData.diagnosis) {
        transformedData.diagnosis = apiData.diagnosis;
    }
    
    return transformedData;
}

// Set case type
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
    displayVitalSigns,
    handlePatientDeath,
    handlePatientCured,
    patientDeceased,
    patientCured
};
