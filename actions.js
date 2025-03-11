// Import shared variables
import { orderEntryArea, subActionsArea, actionInProgress } from './utils.js';
import { submitOrder } from './orders.js';

// Get drug options based on the category
function getDrugOptions(category) {
    let options = '';
    
    switch (category) {
        case 'cardiac':
            options = `
                <option value="">Select medication...</option>
                <option value="metoprolol">Metoprolol</option>
                <option value="atenolol">Atenolol</option>
                <option value="carvedilol">Carvedilol</option>
                <option value="losartan">Losartan</option>
                <option value="lisinopril">Lisinopril</option>
                <option value="amlodipine">Amlodipine</option>
                <option value="diltiazem">Diltiazem</option>
                <option value="digoxin">Digoxin</option>
                <option value="furosemide">Furosemide</option>
                <option value="spironolactone">Spironolactone</option>
                <option value="hydrochlorothiazide">Hydrochlorothiazide</option>
                <option value="nitroglycerin">Nitroglycerin</option>
                <option value="isosorbide">Isosorbide</option>
                <option value="amiodarone">Amiodarone</option>
                <option value="dobutamine">Dobutamine</option>
                <option value="dopamine">Dopamine</option>
                <option value="epinephrine">Epinephrine</option>
                <option value="norepinephrine">Norepinephrine</option>
                <option value="vasopressin">Vasopressin</option>
                <option value="aspirin">Aspirin</option>
                <option value="clopidogrel">Clopidogrel</option>
                <option value="ticagrelor">Ticagrelor</option>
                <option value="heparin">Heparin</option>
                <option value="enoxaparin">Enoxaparin</option>
                <option value="warfarin">Warfarin</option>
                <option value="statin">Statin</option>
            `;
            break;
        case 'antibiotics':
            options = `
                <option value="">Select medication...</option>
                <option value="ampicillin">Ampicillin</option>
                <option value="amoxicillin">Amoxicillin</option>
                <option value="amoxicillin/clavulanate">Amoxicillin/Clavulanate</option>
                <option value="azithromycin">Azithromycin</option>
                <option value="ceftriaxone">Ceftriaxone</option>
                <option value="cefepime">Cefepime</option>
                <option value="cefazolin">Cefazolin</option>
                <option value="ciprofloxacin">Ciprofloxacin</option>
                <option value="levofloxacin">Levofloxacin</option>
                <option value="doxycycline">Doxycycline</option>
                <option value="metronidazole">Metronidazole</option>
                <option value="vancomycin">Vancomycin</option>
                <option value="piperacillin/tazobactam">Piperacillin/Tazobactam</option>
                <option value="meropenem">Meropenem</option>
                <option value="imipenem/cilastatin">Imipenem/Cilastatin</option>
                <option value="linezolid">Linezolid</option>
                <option value="clindamycin">Clindamycin</option>
                <option value="trimethoprim/sulfamethoxazole">Trimethoprim/Sulfamethoxazole</option>
                <option value="fluconazole">Fluconazole</option>
                <option value="acyclovir">Acyclovir</option>
                <option value="oseltamivir">Oseltamivir</option>
            `;
            break;
        case 'analgesics':
            options = `
                <option value="">Select medication...</option>
                <option value="acetaminophen">Acetaminophen</option>
                <option value="ibuprofen">Ibuprofen</option>
                <option value="ketorolac">Ketorolac</option>
                <option value="morphine">Morphine</option>
                <option value="hydromorphone">Hydromorphone</option>
                <option value="fentanyl">Fentanyl</option>
                <option value="oxycodone">Oxycodone</option>
                <option value="tramadol">Tramadol</option>
                <option value="gabapentin">Gabapentin</option>
                <option value="pregabalin">Pregabalin</option>
            `;
            break;
        case 'fluids':
            options = `
                <option value="">Select fluid...</option>
                <option value="normal-saline">Normal Saline (0.9% NaCl)</option>
                <option value="lactated-ringers">Lactated Ringer's</option>
                <option value="d5w">D5W</option>
                <option value="d5ns">D5 Normal Saline</option>
                <option value="d5-half-ns">D5 Half Normal Saline</option>
                <option value="d50">D50</option>
                <option value="albumin">Albumin</option>
                <option value="blood">Packed Red Blood Cells</option>
                <option value="platelets">Platelets</option>
                <option value="ffp">Fresh Frozen Plasma</option>
            `;
            break;
        case 'respiratory':
            options = `
                <option value="">Select medication...</option>
                <option value="albuterol">Albuterol</option>
                <option value="ipratropium">Ipratropium</option>
                <option value="budesonide">Budesonide</option>
                <option value="fluticasone">Fluticasone</option>
                <option value="salmeterol">Salmeterol</option>
                <option value="tiotropium">Tiotropium</option>
                <option value="montelukast">Montelukast</option>
                <option value="prednisone">Prednisone</option>
                <option value="methylprednisolone">Methylprednisolone</option>
            `;
            break;
        case 'other-meds':
            options = `
                <option value="">Select medication...</option>
                <option value="insulin">Insulin</option>
                <option value="metformin">Metformin</option>
                <option value="levothyroxine">Levothyroxine</option>
                <option value="hydrocortisone">Hydrocortisone</option>
                <option value="pantoprazole">Pantoprazole</option>
                <option value="famotidine">Famotidine</option>
                <option value="ondansetron">Ondansetron</option>
                <option value="metoclopramide">Metoclopramide</option>
                <option value="lorazepam">Lorazepam</option>
                <option value="haloperidol">Haloperidol</option>
                <option value="phenytoin">Phenytoin</option>
                <option value="levetiracetam">Levetiracetam</option>
                <option value="other">Other (specify in notes)</option>
            `;
            break;
        default:
            options = '<option value="">Select medication...</option>';
    }
    
    return options;
}

// Handle action button clicks
function handleAction(action) {
    // Hide any sub-menus and order forms
    subActionsArea.innerHTML = '';
    orderEntryArea.innerHTML = '';
    
    // Show sub-actions for the selected action
    subActionsArea.classList.remove('hidden');
    
    // Generate sub-actions based on the selected action
    let subActions = [];
    
    switch (action) {
        case 'drugs':
            subActions = [
                { id: 'cardiac', name: 'Cardiac Medications' },
                { id: 'antibiotics', name: 'Antibiotics' },
                { id: 'analgesics', name: 'Pain Management' },
                { id: 'fluids', name: 'IV Fluids' },
                { id: 'respiratory', name: 'Respiratory Medications' },
                { id: 'other-meds', name: 'Other Medications' }
            ];
            break;
        case 'labs':
            subActions = [
                { id: 'cbc', name: 'Complete Blood Count' },
                { id: 'cmp', name: 'Comprehensive Metabolic Panel' },
                { id: 'cardiac-enzymes', name: 'Cardiac Enzymes' },
                { id: 'coagulation', name: 'Coagulation Studies' },
                { id: 'abg', name: 'Arterial Blood Gas' },
                { id: 'cultures', name: 'Cultures & Sensitivity' },
                { id: 'urinalysis', name: 'Urinalysis' },
                { id: 'other-labs', name: 'Other Laboratory Tests' }
            ];
            break;
        case 'exam':
            subActions = [
                { id: 'vitals', name: 'Check Vital Signs' },
                { id: 'general', name: 'General Examination' },
                { id: 'cardiac', name: 'Cardiac Examination' },
                { id: 'respiratory', name: 'Respiratory Examination' },
                { id: 'abdominal', name: 'Abdominal Examination' },
                { id: 'neuro', name: 'Neurological Examination' },
                { id: 'musculoskeletal', name: 'Musculoskeletal Examination' },
                { id: 'other-exam', name: 'Other Examination' }
            ];
            break;
        case 'imaging':
            subActions = [
                { id: 'xray', name: 'X-Ray' },
                { id: 'ct', name: 'CT Scan' },
                { id: 'mri', name: 'MRI' },
                { id: 'ultrasound', name: 'Ultrasound' },
                { id: 'echo', name: 'Echocardiogram' },
                { id: 'other-imaging', name: 'Other Imaging' }
            ];
            break;
        case 'procedures':
            subActions = [
                { id: 'ekg', name: 'ECG/EKG' },
                { id: 'iv-access', name: 'IV Access' },
                { id: 'oxygen', name: 'Oxygen Therapy' },
                { id: 'intubation', name: 'Intubation' },
                { id: 'catheter', name: 'Catheterization' },
                { id: 'lumbar-puncture', name: 'Lumbar Puncture' },
                { id: 'paracentesis', name: 'Paracentesis' },
                { id: 'thoracentesis', name: 'Thoracentesis' },
                { id: 'cpr', name: 'CPR' },
                { id: 'other-procedure', name: 'Other Procedure' }
            ];
            break;
        case 'consults':
            subActions = [
                { id: 'cardiology', name: 'Cardiology' },
                { id: 'pulmonology', name: 'Pulmonology' },
                { id: 'gastroenterology', name: 'Gastroenterology' },
                { id: 'neurology', name: 'Neurology' },
                { id: 'infectious-disease', name: 'Infectious Disease' },
                { id: 'nephrology', name: 'Nephrology' },
                { id: 'surgery', name: 'Surgery' },
                { id: 'icu', name: 'ICU Transfer' },
                { id: 'other-consult', name: 'Other Consult' }
            ];
            break;
        default:
            subActions = [];
            break;
    }
    
    // Create sub-action buttons
    subActionsArea.innerHTML = `<h3>${action.charAt(0).toUpperCase() + action.slice(1)}</h3>`;
    
    subActions.forEach(subAction => {
        const button = document.createElement('button');
        button.className = 'action-button';
        button.textContent = subAction.name;
        button.dataset.id = subAction.id;
        button.dataset.parentAction = action;
        
        button.addEventListener('click', () => {
            handleSubAction(action, subAction.id, subAction.name);
        });
        
        subActionsArea.appendChild(button);
    });
    
    // Add back button
    const backButton = document.createElement('button');
    backButton.className = 'action-button';
    backButton.style.backgroundColor = '#e74c3c';
    backButton.textContent = 'Back';
    backButton.addEventListener('click', () => {
        subActionsArea.classList.add('hidden');
    });
    subActionsArea.appendChild(backButton);
}

// Handle sub-action button clicks
function handleSubAction(action, subActionId, subActionName) {
    // Show order entry form
    orderEntryArea.classList.remove('hidden');
    
    // Create a form based on the selected action and sub-action
    let formHtml = `<h3>${subActionName}</h3>`;
    
    switch (action) {
        case 'drugs':
            formHtml += `
                <p>Select medication and dosage:</p>
                <select id="medication-select">
                    ${getDrugOptions(subActionId)}
                </select>
                <input type="text" id="dosage-input" placeholder="Dosage (e.g., 5mg)">
                <select id="route-select">
                    <option value="IV">IV</option>
                    <option value="PO">PO</option>
                    <option value="IM">IM</option>
                    <option value="SC">SC</option>
                    <option value="Inhaled">Inhaled</option>
                    <option value="Topical">Topical</option>
                </select>
                <select id="frequency-select">
                    <option value="once">Once</option>
                    <option value="q4h">q4h</option>
                    <option value="q6h">q6h</option>
                    <option value="q8h">q8h</option>
                    <option value="q12h">q12h</option>
                    <option value="daily">Daily</option>
                    <option value="BID">BID</option>
                    <option value="TID">TID</option>
                    <option value="QID">QID</option>
                    <option value="PRN">PRN</option>
                    <option value="continuous">Continuous</option>
                </select>
            `;
            break;
        case 'labs':
            formHtml += `
                <p>Order ${subActionName}:</p>
                <select id="urgency-select">
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent</option>
                    <option value="stat">STAT</option>
                </select>
                <textarea id="lab-notes" placeholder="Additional notes or specific tests..."></textarea>
            `;
            break;
        case 'exam':
            formHtml += `
                <p>Perform ${subActionName}:</p>
                <textarea id="exam-focus" placeholder="Specific areas to examine or questions to answer..."></textarea>
            `;
            break;
        case 'imaging':
            formHtml += `
                <p>Order ${subActionName}:</p>
                <textarea id="imaging-details" placeholder="Body region and clinical question..."></textarea>
                <select id="contrast-select">
                    <option value="none">No Contrast</option>
                    <option value="oral">Oral Contrast</option>
                    <option value="iv">IV Contrast</option>
                    <option value="both">Both Oral and IV Contrast</option>
                </select>
                <select id="imaging-urgency-select">
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent</option>
                    <option value="stat">STAT</option>
                </select>
            `;
            break;
        case 'procedures':
            formHtml += `
                <p>Order ${subActionName}:</p>
                <textarea id="procedure-details" placeholder="Specific details and reason..."></textarea>
            `;
            break;
        case 'consults':
            formHtml += `
                <p>Request ${subActionName} Consult:</p>
                <textarea id="consult-reason" placeholder="Reason for consult and specific questions..."></textarea>
                <select id="consult-urgency-select">
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent</option>
                    <option value="stat">STAT</option>
                </select>
            `;
            break;
    }
    
    // Add submit and cancel buttons
    formHtml += `
        <div class="form-buttons">
            <button id="submit-order" class="action-button">Submit Order</button>
            <button id="cancel-order" class="action-button" style="background-color: #e74c3c;">Cancel</button>
        </div>
    `;
    
    orderEntryArea.innerHTML = formHtml;
    
    // Add event listeners for the form buttons
    document.getElementById('submit-order').addEventListener('click', () => {
        submitOrder(action, subActionId, subActionName);
    });
    
    document.getElementById('cancel-order').addEventListener('click', () => {
        orderEntryArea.classList.add('hidden');
    });
}

// Export functions for use in other modules
export { 
    getDrugOptions, 
    handleAction, 
    handleSubAction 
};
