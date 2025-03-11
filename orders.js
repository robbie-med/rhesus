// Import shared functions and variables
import { 
  addMessage, addResult, setScore, incrementCost, formatGameTime, 
  gameActive, actionInProgress, caseHistory, vitalSigns, patientData, 
  score, updateDisplays, inGameTime, setActionInProgress,
  orderEntryArea, subActionsArea, patientDeceased, patientCured,
  resultsArea
} from './utils.js';
import { callAPI } from './api.js';
import { handlePatientDeath, handlePatientCured } from './game_logic.js';

// Evaluate an order for scoring
async function evaluateOrder(orderDetails, result) {
    // Don't evaluate if patient is already in a terminal state
    if (patientDeceased || patientCured) return;

    // Create a prompt for evaluating the order
    const evaluationPrompt = `
    Evaluate the medical appropriateness of the following order in the context of this patient case:
    
    Patient information:
    - Diagnosis (hidden from player): ${patientData.diagnosis}
    - Demographics: ${patientData.demographics}
    - Chief complaint: ${patientData.chiefComplaint}
    - History: ${patientData.history}
    
    Current vitals:
    - HR: ${vitalSigns.HR} bpm
    - BP: ${vitalSigns.BPSystolic}/${vitalSigns.BPDiastolic} mmHg
    - MAP: ${vitalSigns.MAP} mmHg
    - RR: ${vitalSigns.RR} breaths/min
    - Temp: ${vitalSigns.Temp}°C
    - O2Sat: ${vitalSigns.O2Sat}%
    
    Recent case history:
    ${caseHistory.slice(-8).map(event => `- ${formatGameTime(event.time)}: ${event.event}`).join('\n')}
    
    Order details:
    ${JSON.stringify(orderDetails, null, 2)}
    
    Order result:
    ${result}
    
    Please evaluate whether this order was:
    1. Appropriate and indicated (good clinical decision)
    2. Not harmful but unnecessary (wasteful)
    3. Potentially harmful or contraindicated (poor clinical decision)
    
    Return a JSON object with the following structure:
    {
      "evaluation": "appropriate" or "unnecessary" or "harmful",
      "scoreImpact": number between -10 and 0 (0 for appropriate, -1 to -3 for unnecessary, -4 to -10 for harmful),
      "feedback": "Brief explanation of the evaluation"
    }
    
    Consider standard of care guidelines, the patient's condition, and potential adverse effects in your evaluation.`;
    
    try {
        const response = await callAPI([{ role: "user", content: evaluationPrompt }]);
        const content = response.choices[0].message.content;
        
        // Try to extract JSON from the response
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/) || content.match(/{[\s\S]*?}/);
        
        if (jsonMatch) {
            const evaluation = JSON.parse(jsonMatch[0].replace(/```json\n|```\n|```/g, ''));
            
            // Update the score
            setScore(score + evaluation.scoreImpact);
            updateDisplays();
            
            // Check for patient death or recovery based on evaluation and result text
            checkForTerminalOutcomes(evaluation, result, orderDetails);
            
            // If the order was harmful, have the attending comment
            if (evaluation.evaluation === 'harmful' && Math.random() < 0.8 && !patientDeceased) {
                setTimeout(() => {
                    addMessage('attending', `I'm concerned about your decision to ${getOrderSummary(orderDetails)}. ${evaluation.feedback}`);
                }, 3000);
            }
            
            // If the order was unnecessary, occasionally have the attending comment
            if (evaluation.evaluation === 'unnecessary' && Math.random() < 0.4) {
                setTimeout(() => {
                    addMessage('attending', `Was it necessary to ${getOrderSummary(orderDetails)}? ${evaluation.feedback}`);
                }, 3000);
            }
            
            // For appropriate orders that significantly improve the patient, have the nurse comment
            if (evaluation.evaluation === 'appropriate' && evaluation.scoreImpact === 0 && Math.random() < 0.3) {
                setTimeout(() => {
                    addMessage('nurse', `The patient seems to be responding well to your management.`);
                }, 5000);
            }
            
            return evaluation;
        }
    } catch (error) {
        console.error('Error evaluating order:', error);
    }
    
    return null;
}

// Check for patient death or recovery based on evaluation and result text
function checkForTerminalOutcomes(evaluation, resultText, orderDetails) {
    // Don't check if already in a terminal state
    if (patientDeceased || patientCured) return;
    
    const resultLower = resultText.toLowerCase();
    
    // Check for death indicators
    if ((evaluation.evaluation === 'harmful' && evaluation.scoreImpact <= -8) || 
        resultLower.includes("cardiac arrest") || 
        resultLower.includes("death") || 
        resultLower.includes("died") || 
        resultLower.includes("fatal") ||
        resultLower.includes("expired") ||
        resultLower.includes("expire") ||
        resultLower.includes("deceased")) {
        
        // Extract the cause of death if possible
        let causeOfDeath = "";
        
        if (orderDetails.type === 'medication') {
            causeOfDeath = `Medication error: ${orderDetails.medication} ${orderDetails.dosage}`;
        } else {
            causeOfDeath = "Critical clinical error";
        }
        
        // If there's a more specific cause in the result, use that
        if (resultLower.includes("due to")) {
            const parts = resultLower.split("due to");
            if (parts.length > 1) {
                causeOfDeath = parts[1].split('.')[0].trim();
                causeOfDeath = causeOfDeath.charAt(0).toUpperCase() + causeOfDeath.slice(1);
            }
        }
        
        handlePatientDeath(causeOfDeath);
    }
    
    // Check for recovery indicators
    else if (evaluation.evaluation === 'appropriate' && 
             score >= 8 && 
             (resultLower.includes("improved") || 
              resultLower.includes("stabilized") || 
              resultLower.includes("stable") || 
              resultLower.includes("recovery") || 
              resultLower.includes("resolved"))) {
        
        // If this might be a diagnostic intervention, include diagnosis
        let recoveryReason = "Treatment has successfully stabilized the patient";
        
        if (orderDetails.type === 'imaging' || orderDetails.type === 'lab' || orderDetails.type === 'consult') {
            recoveryReason = `Diagnosis confirmed as ${patientData.diagnosis} and appropriate treatment administered`;
        } else if (orderDetails.type === 'medication') {
            recoveryReason = `The administration of ${orderDetails.medication} has effectively treated the patient's condition`;
        }
        
        handlePatientCured(recoveryReason);
    }
}

// Generate a result for an order
async function generateOrderResult(orderDetails) {
    // If patient is already in a terminal state, don't generate new results
    if (patientDeceased) {
        addResult("Cannot process new orders. The patient is in cardiac arrest.", 'error');
        return;
    }

    if (patientCured) {
        addResult("Order placed, but patient is already stabilized and ready for discharge.", 'result');
        return;
    }
    
    // Create a prompt for generating a result based on the order
    const resultPrompt = `
    Based on the following patient case and timeline of events, generate a realistic result for the ordered ${orderDetails.type}.
    
    Patient information:
    - Diagnosis (hidden from player): ${patientData.diagnosis}
    - Demographics: ${patientData.demographics}
    - Chief complaint: ${patientData.chiefComplaint}
    - History: ${patientData.history}
    
    Current vitals:
    - HR: ${vitalSigns.HR} bpm
    - BP: ${vitalSigns.BPSystolic}/${vitalSigns.BPDiastolic} mmHg
    - MAP: ${vitalSigns.MAP} mmHg
    - RR: ${vitalSigns.RR} breaths/min
    - Temp: ${vitalSigns.Temp}°C
    - O2Sat: ${vitalSigns.O2Sat}%
    
    Recent events:
    ${caseHistory.slice(-8).map(event => `- ${formatGameTime(event.time)}: ${event.event}`).join('\n')}
    
    Order details:
    ${JSON.stringify(orderDetails, null, 2)}
    
    Please provide a realistic, medically accurate result for this ${orderDetails.type} order. The response should be appropriate for the patient's underlying condition (${patientData.diagnosis}) but should not explicitly state the diagnosis.
    
    If this is a medication order, describe the patient's response to the medication. It's okay if the patient dies. Be sure to be consistent with the patient's current condition and vitals.  
    If this is a lab test, provide realistic lab values.
    If this is an imaging study, provide findings consistent with the underlying condition.
    If this is a procedure, describe the procedure and any findings.
    If this is a consultation, provide the consultant's assessment and recommendations.
    
    Keep the response focused and concise (about 3-5 sentences), as if it were appearing in an electronic medical record.`;
    
    try {
        const response = await callAPI([{ role: "user", content: resultPrompt }]);
        const content = response.choices[0].message.content;
        
        // Add the result to the results area
        addResult(content, 'result');
        
        // Add to case history
        caseHistory.push({
            time: inGameTime,
            event: `Result received: ${orderDetails.type}`,
            data: { 
                orderDetails, 
                result: content 
            }
        });
        
        // Check if the order affects the score
        await evaluateOrder(orderDetails, content);
        
    } catch (error) {
        console.error('Error generating order result:', error);
        addResult('Error: Could not retrieve result for this order.', 'error');
    }
}

// Generate a summary of an order for display
function getOrderSummary(orderDetails) {
    switch (orderDetails.type) {
        case 'medication':
            return `${orderDetails.medication} ${orderDetails.dosage} ${orderDetails.route} ${orderDetails.frequency}`;
        case 'lab':
            return `${getLableDisplayName(orderDetails.test)} (${orderDetails.urgency})`;
        case 'exam':
            return `${orderDetails.area} ${orderDetails.focus ? '- ' + orderDetails.focus : ''}`;
        case 'imaging':
            return `${orderDetails.study} - ${orderDetails.details} (${orderDetails.contrast === 'none' ? 'No contrast' : orderDetails.contrast + ' contrast'}, ${orderDetails.urgency})`;
        case 'procedure':
            return `${orderDetails.procedure} ${orderDetails.details ? '- ' + orderDetails.details : ''}`;
        case 'consult':
            return `${orderDetails.specialty} - ${orderDetails.reason} (${orderDetails.urgency})`;
        default:
            return '';
    }
}

// Get a display name for a lab test
function getLableDisplayName(labId) {
    const labNames = {
        'cbc': 'Complete Blood Count',
        'cmp': 'Comprehensive Metabolic Panel',
        'cardiac-enzymes': 'Cardiac Enzymes',
        'coagulation': 'Coagulation Studies',
        'abg': 'Arterial Blood Gas',
        'cultures': 'Cultures & Sensitivity',
        'urinalysis': 'Urinalysis',
        'other-labs': 'Other Laboratory Tests'
    };
    
    return labNames[labId] || labId;
}

// Submit an order
async function submitOrder(action, subActionId, subActionName) {
    console.log("submitOrder called:", { gameActive, actionInProgress });
    if (!gameActive || actionInProgress) {
        console.log("submitOrder returning early because gameActive is false or actionInProgress is true");
        return;
    }
    
    // Check if patient is in a terminal state
    if (patientDeceased) {
        addResult("Cannot place orders. The patient is in cardiac arrest.", 'error');
        return;
    }
    
    if (patientCured) {
        addResult("The patient is already stable and ready for discharge. No new orders needed.", 'result');
        return;
    }
    
    setActionInProgress(true);
    
    // Get the order details based on the form
    let orderDetails = {};
    
    switch (action) {
        case 'drugs':
            const medication = document.getElementById('medication-select').value;
            const dosage = document.getElementById('dosage-input').value;
            const route = document.getElementById('route-select').value;
            const frequency = document.getElementById('frequency-select').value;
            
            if (!medication || !dosage) {
                alert('Please select a medication and specify a dosage.');
                setActionInProgress(false);
                return;
            }
            
            orderDetails = {
                type: 'medication',
                medication,
                dosage,
                route,
                frequency,
                category: subActionId
            };
            break;
        case 'labs':
            const urgency = document.getElementById('urgency-select').value;
            const labNotes = document.getElementById('lab-notes').value;
            
            orderDetails = {
                type: 'lab',
                test: subActionId,
                urgency,
                notes: labNotes
            };
            break;
        case 'exam':
            const examFocus = document.getElementById('exam-focus').value;
            
            orderDetails = {
                type: 'exam',
                area: subActionId,
                focus: examFocus
            };
            break;
        case 'imaging':
            const imagingDetails = document.getElementById('imaging-details').value;
            const contrast = document.getElementById('contrast-select').value;
            const imagingUrgency = document.getElementById('imaging-urgency-select').value;
            
            if (!imagingDetails) {
                alert('Please specify the body region and clinical question.');
                setActionInProgress(false);
                return;
            }
            
            orderDetails = {
                type: 'imaging',
                study: subActionId,
                details: imagingDetails,
                contrast,
                urgency: imagingUrgency
            };
            break;
        case 'procedures':
            const procedureDetails = document.getElementById('procedure-details').value;
            
            orderDetails = {
                type: 'procedure',
                procedure: subActionId,
                details: procedureDetails
            };
            break;
        case 'consults':
            const consultReason = document.getElementById('consult-reason').value;
            const consultUrgency = document.getElementById('consult-urgency-select').value;
            
            if (!consultReason) {
                alert('Please provide a reason for the consult.');
                setActionInProgress(false);
                return;
            }
            
            orderDetails = {
                type: 'consult',
                specialty: subActionId,
                reason: consultReason,
                urgency: consultUrgency
            };
            break;
    }
    
    // Add to case history
    const orderEvent = `Ordered ${subActionName}: ${getOrderSummary(orderDetails)}`;
    caseHistory.push({
        time: inGameTime,
        event: orderEvent,
        data: orderDetails
    });
    
    // Display the order in the results area
    addResult(`Order placed: ${getOrderSummary(orderDetails)}`, 'order');
    
    // Hide the order form
    orderEntryArea.classList.add('hidden');
    subActionsArea.classList.add('hidden');
    
    // Increment cost
    incrementCost();
    
    // Generate a result for the order
    await generateOrderResult(orderDetails);
    
    setActionInProgress(false);
}

// Export functions for use in other modules
export { 
    evaluateOrder, 
    generateOrderResult, 
    getOrderSummary, 
    getLableDisplayName, 
    submitOrder,
    checkForTerminalOutcomes
};
