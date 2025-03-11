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
    
    // Reset game state using setter functions
    setGameActive(true);
    setInGameTime(0);
    setCost(0);
    setScore(0);
    setCaseHistory([]);
    setActionInProgress(true); // Prevent actions during initialization
    
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
        actionButtons.classList.remove('hidden');
        preGameMessage.classList.add('hidden');
        patientDataSection.classList.remove('hidden');
        
        // Add initial nurse message
        addMessage('nurse', `Hello doctor, I'm your nurse today. This patient was just admitted with ${patientData.chiefComplaint}.`);
        
        // Add initial attending message
        addMessage('attending', "I'd like you to take the lead on this case. What's your initial assessment and plan?");
        
        // Update vital signs immediately
        refreshVitalSigns();
        
        setActionInProgress(false);
    } catch (error) {
        console.error('Error starting game:', error);
        messageArea.innerHTML += '<div class="message system-message">Error starting game. Please try again.</div>';
        resetGame();
    }
}

// Generate a new patient case based on the selected type
async function generatePatientCase() {
    const prompt = `You are an advanced medical case simulation engine for an internal medicine resident training game. Your task is to generate a **realistic, medically accurate, and engaging patient case** of a ${selectedCaseType} condition where the player interacts with the patient to make diagnostic and management decisions.
            ## **Case Requirements**:
            - The case should be appropriately challenging for an **internal medicine resident**.
            - It should **simulate an actual patient encounter**, allowing for **history-taking, physical exam findings, and diagnostic decision-making**.
            - The **final diagnosis should be hidden from the player**, requiring them to work through the case.
            
            ---
            
            ## **Case Structure**:
            ### **1. Patient Demographics:**
               - Age, gender, ethnicity (if relevant)
               - Any significant past medical history, family history, social history (smoking, alcohol, drug use)
               - Medications the patient is currently taking
            
            ### **2. Chief Complaint (CC):**
               - A **brief and natural** patient-reported reason for the visit (e.g., "I’ve been feeling really short of breath for the past two days.")
            
            ### **3. History of Present Illness (HPI):**
               - Detailed narrative including:
                 - **Onset** (acute, chronic, progressive)
                 - **Location** (if applicable)
                 - **Duration** (how long the symptoms have lasted)
                 - **Character** (sharp, dull, burning, etc.)
                 - **Alleviating/aggravating factors** (what makes it better or worse)
                 - **Associated symptoms** (e.g., fever, nausea, weight loss, night sweats)
                 - **Pertinent negatives** (e.g., denies chest pain, denies recent travel)
                 - **Recent relevant exposures** (e.g., sick contacts, travel, hospitalizations, new medications, recent procedures)
            
            ### **4. Vital Signs:**
               - **Heart Rate (HR)**
               - **Blood Pressure (BP)**
               - **Respiratory Rate (RR)**
               - **Temperature (Temp)**
               - **Oxygen Saturation (O2 Sat)**
               - (Include a realistic set of vitals based on the case)
            
            ### **5. Physical Examination:**
               - General appearance (e.g., "Patient appears uncomfortable, diaphoretic.")
               - Relevant system-specific findings (e.g., "Bilateral crackles at lung bases" for CHF, "Systolic murmur loudest at the right upper sternal border" for aortic stenosis)
               - Neurological findings if relevant (e.g., "Decreased strength in right upper and lower extremity, positive Babinski sign.")
            
            ### **6. Diagnostic Workup:**
               - **Laboratory results:** Provide **normal vs. abnormal** values as appropriate. Include key findings like:
                 - CBC, BMP, liver function tests, cardiac enzymes, inflammatory markers, coagulation panel, etc.
               - **Imaging findings** (e.g., CXR, CT scan, MRI, ultrasound)
               - **EKG if relevant** (e.g., "Sinus tachycardia with ST depressions in leads II, III, aVF")
               - **Point-of-care tests (POCT)** (e.g., "Urinalysis shows +2 protein, +1 blood")
            
            ### **7. The Underlying Diagnosis (Hidden from Player):**
               - Clearly define the correct **final diagnosis**.
               - Include **differential diagnoses** the player should consider.
               - Explain **why this diagnosis fits the patient presentation**.
            
            ---
            
            ## **Additional Features for Interactivity:**
            1. **Dynamic Patient Responses:**
               - If the player asks a relevant question, provide a **realistic patient response** (e.g., “No, I haven’t had any recent fevers, but I did have a bad cough last week.”)
               - If the player asks an irrelevant or vague question, make the patient **respond accordingly** (e.g., “I’m not sure what you mean, doc.”)
            
            2. **Progressive Case Evolution:**
               - The patient’s condition **may worsen** if the correct intervention is delayed.
               - Critical findings should **become more apparent over time**.
            
            3. **Scoring System (if applicable):**
               - The player is scored based on:
                 - **Correct history-taking questions** asked.
                 - **Accuracy of physical exam interpretation**.
                 - **Diagnostic reasoning and test ordering**.
                 - **Correctness of treatment decisions**.
            
            ---
            
            ## **Output Format:**
            Return a **structured JSON object** with the following keys:
            
            #
              "demographics": {
                "age": 67,
                "gender": "male",
                "ethnicity": "Caucasian",
                "history": "Past medical history of hypertension and type 2 diabetes. Smokes 1 pack/day for 40 years."
              
              "chiefComplaint": "I’ve been having trouble breathing for the last three days.",
              "history": {
                "onset": "Three days ago",
                "character": "Worsening shortness of breath with exertion",
                "associatedSymptoms": ["Orthopnea", "Bilateral leg swelling", "Fatigue"],
                "pertinentNegatives": ["No chest pain", "No fever", "No recent illness"],
                "exposures": "No recent travel or sick contacts."
              },
              "vitalSigns": {
                "HR": 110,
                "BP": "160/90",
                "RR": 24,
                "Temp": 37.1,
                "O2Sat": 89
              },
              "physicalExam": {
                "general": "Appears uncomfortable, using accessory muscles to breathe.",
                "lungs": "Bilateral crackles at lung bases.",
                "cardiac": "S3 gallop noted.",
                "extremities": "Bilateral pitting edema up to the knees."
              },
              "diagnosticWorkup": {
                "labs": {
                  "BNP": "Elevated at 900 pg/mL",
                  "Creatinine": "1.4 (mildly elevated from baseline 1.0)",
                  "Troponin": "Normal"
                },
                "imaging": {
                  "CXR": "Cardiomegaly, pulmonary vascular congestion, bilateral pleural effusions.",
                  "EKG": "Sinus tachycardia, no acute ischemic changes."
                }
              },
              "diagnosis": "Acute decompensated heart failure (CHF exacerbation)"
            }
                
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
        
        // Update the global patient data object using setters
        updatePatientData(newPatientData);
        
        // Update the global vital signs object - using renamed function
        setVitalSignsData(patientData.vitalSigns);
        
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
    // Increment real-time counter (seconds) using setter
    incrementInGameTime();
    
    // Update displays
    updateDisplays();
    
    // Every 10 seconds, update vitals
    if (inGameTime % 10 === 0) {
        refreshVitalSigns();
    }
}

async function refreshVitalSigns() {
    if (!gameActive) return;

    // Create a dynamic prompt for updating vital signs
    const vitalsPrompt = `
             You are a **real-time patient physiology simulator** for an **internal medicine resident training game**. Your goal is to update the patient's vital signs **dynamically and realistically** based on:
            1. **The natural progression of the underlying disease.**
            2. **Appropriate interventions and treatments administered by the player.**
            3. **Inappropriate treatments or delays, which may cause rapid deterioration.**
            4. **Expected physiological responses over time** (e.g., slow improvement vs. acute decompensation).
        
            **Case Overview:**
            - **Diagnosis (hidden from player):** ${patientData.diagnosis}
            - **History:** ${patientData.history}
            - **Chief complaint:** ${patientData.chiefComplaint}
        
            **Current Vital Signs:**
            - **HR:** ${vitalSigns.HR} bpm
            - **BP:** ${vitalSigns.BPSystolic}/${vitalSigns.BPDiastolic} mmHg (MAP: ${vitalSigns.MAP} mmHg)
            - **RR:** ${vitalSigns.RR} breaths/min
            - **Temp:** ${vitalSigns.Temp}°C
            - **O₂ Sat:** ${vitalSigns.O2Sat}%
        
            **Recent Events:**
            ${caseHistory.length > 1 ? caseHistory.slice(-5).map(event => `- ${formatGameTime(event.time)}: ${event.event}`).join('\n') : 'No interventions have been performed yet.'}
        
            **Time Elapsed Since Case Start:** ${formatGameTime(inGameTime)} (each 10 seconds real-time = 1 minute in-game)
        
            ---
            
            ## **Instructions:**
            - **Update vital signs** realistically based on the current state of disease progression and treatments administered.
            - If **no intervention** has been performed and the disease would naturally progress, **adjust the vitals accordingly** (gradual or rapid worsening).
            - If a **correct intervention** was performed, reflect **improvement** in a reasonable time frame.
            - If an **incorrect or harmful intervention** was given, introduce **acute deterioration** (e.g., respiratory failure after too much IV fluids in CHF).
            - If the patient is **critically ill**, simulate **rapid decline** unless immediate resuscitative measures are taken.
            - Consider **expected pharmacokinetics & physiology** (e.g., beta-blockers reducing HR over time, vasopressors increasing BP rapidly).
        
            ---
            
            ## **Example Expected Changes:**
            - **Septic Shock (no fluids, no pressors)** → BP drops further, HR rises, O₂ sat declines
            - **Septic Shock (fluids given, but no vasopressors yet)** → BP stabilizes slightly, HR still high
            - **Acute CHF (given IV fluids)** → Sudden drop in O₂ sat, increased RR, worsening BP
            - **Acute CHF (given diuretics and BiPAP)** → Gradual HR decrease, improved O₂ sat
            - **DKA (given insulin and fluids correctly)** → Gradual HR decrease, BP stabilizes, RR normalizes
            - **DKA (insulin given before fluids)** → Acute BP drop, HR rises further
        
            ---
            
            ## **Output Format:**
            Return a JSON object with the updated vital signs:
            ```json
            {
              "HR": (updated heart rate in bpm),
              "BPSystolic": (updated systolic BP in mmHg),
              "BPDiastolic": (updated diastolic BP in mmHg),
              "RR": (updated respiratory rate in breaths/min),
              "Temp": (updated temperature in Celsius),
              "O2Sat": (updated oxygen saturation percentage)
            }
            ```
            Ensure the values **reflect realistic physiological changes** based on the scenario. **Do not include any markdown formatting or extra text.**`
            
            // Process the response...
        }
        ;
    
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
            // Update using renamed setter
            setVitalSignsData(updatedVitals);
        } else {
            // Fallback: try to parse the entire content
            const updatedVitals = JSON.parse(content);
            // Update using renamed setter
            setVitalSignsData(updatedVitals);
        }
        
        // Calculate MAP
        updateVitalSign('MAP', calculateMAP(vitalSigns.BPSystolic, vitalSigns.BPDiastolic));
        
        // Display updated vital signs
        displayVitalSigns();
        
        // Check for critical vitals and have nurse alert if needed
        checkCriticalVitals();
        
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

// Check for critical vital signs and have the nurse alert if needed
function checkCriticalVitals() {
    // Define critical thresholds
    const criticalThresholds = {
        HR: { low: 40, high: 190 },
        BPSystolic: { low: 80, high: 200 },
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
    displayVitalSigns
};
