// UI-related constants and messages

export const MAX_UNDO_STACK_SIZE = 10;

export const LIGHT_MODE_MESSAGES = [
    "Light mode users be like: \"I love squinting. It builds character.\"",
    "Light mode: for people who think their screen should double as a flashlight.",
    "You know, pressing it more doesn't make it work faster",
    "Are you trying to blind yourself?",
    "Stop it. Get some help.",
    "Dark mode is superior. Accept it."
];

export const DEFAULT_SITE_FORM = {
    id: null, 
    name: '', 
    customer: '', 
    location: '',
    fullLocation: '',
    streetAddress: '',
    city: '',
    state: '',
    postcode: '',
    country: 'Australia',
    gpsCoordinates: '',
    type: 'Mine',
    typeDetail: '',
    contactName: '', 
    contactEmail: '', 
    contactPosition: '', 
    contactPhone1: '', 
    contactPhone2: '', 
    active: true, 
    notes: [], 
    logo: null, 
    issues: []
};

export const DEFAULT_NOTE_INPUT = { content: '', author: '' };

export const DEFAULT_NEW_ASSET = { 
    name: '', 
    weigher: '', 
    code: '', 
    lastCal: '', 
    frequency: '' 
};

export const DEFAULT_SPEC_NOTE_INPUT = { content: '', author: '' };

// Form styling constants (used in modals and forms)
export const FORM_STYLES = {
    label: "block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider",
    input: "w-full p-2 border border-slate-600 rounded text-sm bg-slate-900 text-white focus:outline-none focus:border-blue-500",
    section: "p-3 bg-slate-800/50 rounded border border-slate-700"
};

