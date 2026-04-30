export interface SessionStep {
  id: number;
  instruction: string;
  tip: string;
}

export interface SessionContent {
  type: string;
  label: string;
  description: string;
  steps: SessionStep[];
}

// ─── Vocal Play ───────────────────────────────────────────────────────────────
// Goal: get the child making ANY sound at all. No pressure, just fun.
export const VOCAL_PLAY_STEPS: SessionStep[] = [
  {
    id: 1,
    instruction: 'Make a funny animal sound together 🐮',
    tip: 'Start with "Moooo!" yourself. Kids love copying silly sounds.',
  },
  {
    id: 2,
    instruction: 'Blow raspberries at each other 😜',
    tip: 'This gets lips moving — a key building block for speech.',
  },
  {
    id: 3,
    instruction: 'Make a siren sound — wee-woo, wee-woo! 🚨',
    tip: 'Go slow then fast. Let your child control the speed.',
  },
  {
    id: 4,
    instruction: 'Whisper something silly in their ear 🤫',
    tip: 'Whisper "you are a potato". Wait for their reaction or copy.',
  },
  {
    id: 5,
    instruction: 'Hum a song together 🎵',
    tip: 'Pick their favourite. Even a single "mmm" counts as a win!',
  },
  {
    id: 6,
    instruction: 'Say "Uh oh!" and drop a toy 😲',
    tip: '"Uh oh" is one of the first phrases toddlers learn. Repeat 3 times.',
  },
];

// ─── Simple Words ─────────────────────────────────────────────────────────────
// Goal: practice clear 1-syllable words tied to real objects.
export const SIMPLE_WORDS_STEPS: SessionStep[] = [
  {
    id: 101,
    instruction: 'Hold up a ball and say "Ball!" ⚽',
    tip: 'Wait 5 seconds after you say it. Give them time to attempt it.',
  },
  {
    id: 102,
    instruction: 'Point to a cup and ask "What is this?" ☕',
    tip: 'If they don\'t answer, say "Cup!" clearly, then ask again.',
  },
  {
    id: 103,
    instruction: 'Show a shoe and say "Shoe! On or off?" 👟',
    tip: 'Simple choices (on/off, yes/no) are easier than open questions.',
  },
  {
    id: 104,
    instruction: 'Hold up a book and wait 📖',
    tip: 'Don\'t say the word first this time. See if they volunteer it.',
  },
  {
    id: 105,
    instruction: 'Point to a door and say "Door! Open it?" 🚪',
    tip: 'Action words paired with objects help build two-word phrases later.',
  },
  {
    id: 106,
    instruction: 'Show a spoon at mealtime — "Spoon! Your turn" 🥄',
    tip: 'Mealtimes are great for word practice — they\'re already engaged.',
  },
];

// ─── Phoneme Focus ────────────────────────────────────────────────────────────
// Goal: practice specific sounds that are building blocks of words.
export const PHONEME_FOCUS_STEPS: SessionStep[] = [
  {
    id: 201,
    instruction: 'Practice the "B" sound — Ba! Ba! Ba! 👄',
    tip: 'Exaggerate your lip pop. Hold a mirror so they can see their mouth.',
  },
  {
    id: 202,
    instruction: 'Try the "M" sound — Mmm! like yummy food 😋',
    tip: '"M" is one of the earliest sounds. Pair it with something they love eating.',
  },
  {
    id: 203,
    instruction: 'Practice "P" — Pop! Pop! Pop! 💥',
    tip: 'Put your hand in front of your mouth to feel the air puff. Let them try.',
  },
  {
    id: 204,
    instruction: 'Try "D" sound — Da! Da! Da! 🥁',
    tip: '"Da" is often a first word. Tap the table on each syllable for rhythm.',
  },
  {
    id: 205,
    instruction: 'Practice "W" — Woo! Woo! like a train 🚂',
    tip: 'Round your lips into an "O" shape and show them in a mirror.',
  },
  {
    id: 206,
    instruction: 'Try "N" — No no no! with a smile 😄',
    tip: '"No" is a powerful early word. Keep it playful, not disciplinary.',
  },
];

// ─── Sentence Building ────────────────────────────────────────────────────────
// Goal: combine two words into simple phrases.
export const SENTENCE_BUILDING_STEPS: SessionStep[] = [
  {
    id: 301,
    instruction: 'Model "More please!" at snack time 🍪',
    tip: 'Hold the snack just out of reach. Wait for any attempt before giving it.',
  },
  {
    id: 302,
    instruction: 'Say "Big dog!" when you see one 🐕',
    tip: 'Pair an adjective + noun. Point and say it twice slowly.',
  },
  {
    id: 303,
    instruction: 'Try "Go fast!" while pushing a toy car 🚗',
    tip: 'Action phrases are easier when paired with physical movement.',
  },
  {
    id: 304,
    instruction: 'Say "All done!" when finishing an activity ✅',
    tip: '"All done" is hugely useful for toddlers. Clap hands together on "done".',
  },
  {
    id: 305,
    instruction: 'Model "My turn / Your turn" with a toy 🎯',
    tip: 'Pass the toy on each phrase. Turn-taking builds conversation skills.',
  },
  {
    id: 306,
    instruction: 'Try "Where go?" when hiding a toy 🙈',
    tip: 'Early questions don\'t need to be grammatically perfect — they just need to be said!',
  },
];

// ─── Master map — used by recommendationEngine to load the right steps ────────
export const SESSION_CONTENT_MAP: Record<string, SessionStep[]> = {
  'Vocal Play':        VOCAL_PLAY_STEPS,
  'Simple Words':      SIMPLE_WORDS_STEPS,
  'Phoneme Focus':     PHONEME_FOCUS_STEPS,
  'Sentence Building': SENTENCE_BUILDING_STEPS,
};

// Default used when no recommendation is available yet
export const TODDLER_SESSION_STEPS = VOCAL_PLAY_STEPS;