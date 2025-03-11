# Medical Resident Simulation Game

A text-based healthcare simulation game designed for medical residents to practice clinical reasoning skills in a realistic, interactive environment.

## Features

- **Case Categories**: Cardiovascular, Infectious Disease, Emergency, and Miscellaneous
- **Real-time Vital Signs**: Updates every 10 seconds, with medically accurate responses to interventions
- **Interactive Communication**: Chat with attending physicians and nurses using `@md` and `@rn` prefixes
- **Comprehensive Medical Actions**: Order medications, labs, imaging, perform exams, request consults, and more
- **Scoring System**: Points deducted for harmful or unnecessary actions
- **API Cost Tracking**: Monitor the cost of AI interactions

## Setup Instructions

1. Clone this repository to your local machine or download the files
2. Make sure all these files are in the same directory:
   - `index.html`: The main HTML file
   - `init.js`: Game initialization and global variables
   - `game_logic.js`: Patient case generation and vital sign management
   - `actions_and_chat.js`: User actions, chat functionality, and order management
3. Open the `index.html` file in a web browser
   - No special server is required; the game runs entirely in the browser
4. Alternatively, host the game on GitHub Pages by pushing the files to a GitHub repository

## How to Play

1. **Select a Case Type**: Choose from Cardiovascular, Infectious Disease, Emergency, or Miscellaneous
2. **Start the Case**: Click the "Start Case" button to begin the simulation
3. **Review Patient Information**: Read the demographics, chief complaint, and history in the Data panel
4. **Monitor Vital Signs**: Keep track of the patient's vitals in the Results panel
5. **Take Actions**: Use the Actions panel to order medications, labs, imaging, perform exams, etc.
6. **Communicate**: Chat with the attending physician using `@md` and the nurse using `@rn`
7. **Track Your Score**: Aim for the highest score possible (closest to zero) by making appropriate clinical decisions

## Time Scale

- Game time runs at an accelerated pace
- Each 10 seconds of real-time equals approximately 1 minute of in-game time
- Vital signs update every 10 seconds

## API Integration

The game uses the PPQ.AI API with Claude-3.5-Sonnet to generate patient cases, respond to clinical interventions, and provide realistic responses from attending physicians and nurses.

## Technical Details

- Built with vanilla JavaScript and HTML5
- No external dependencies or frameworks
- Designed to run on GitHub Pages
- Uses the PPQ.AI API for intelligent clinical reasoning

## Code Structure

The code is organized into three main JavaScript files:

1. **init.js**
   - Contains all global variables and API configuration
   - Handles DOM element selection and initialization
   - Sets up event listeners and helper functions

2. **game_logic.js**
   - Manages patient case generation
   - Updates vital signs in a medically accurate manner
   - Handles game timer and clinical progressions

3. **actions_and_chat.js**
   - Processes user actions (medications, labs, imaging, etc.)
   - Manages chat functionality with attending and nurse
   - Evaluates clinical decisions and manages scoring

## Educational Purpose

This simulation is designed for educational purposes to help medical residents practice:
- Clinical decision making
- Patient management
- Communication with healthcare team members
- Resource utilization awareness

## Credits

Developed for medical education and training purposes.
