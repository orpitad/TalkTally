export interface SessionStep {
  id: number;
  instruction: string;
  tip: string;
}

export type SessionLevel = 'Beginner' | 'Intermediate' | 'Experienced';
export type SessionType =
  | 'Vocal Play'
  | 'Phoneme Focus'
  | 'Simple Words'
  | 'Sentence Building';

export interface SessionDefinition {
  id: number;           // 1–15
  level: SessionLevel;
  type: SessionType;
  title: string;
  description: string;
  steps: SessionStep[];
}

// ─────────────────────────────────────────────────────────────────────────────
// BEGINNER — Sessions 1–5
// Goal: Any vocalisation at all. Zero pressure, maximum fun.
// ─────────────────────────────────────────────────────────────────────────────

const session1: SessionDefinition = {
  id: 1, level: 'Beginner', type: 'Vocal Play',
  title: 'Any Sound at All',
  description: 'Just get your child making noise — any noise counts!',
  steps: [
    { id: 101, instruction: 'Make a big "Ahhh!" sound together 😮', tip: 'Open your mouth wide and hold the sound for 3 seconds. Let them copy.' },
    { id: 102, instruction: 'Blow raspberries at each other 😜', tip: 'This gets lips moving — a key building block for speech.' },
    { id: 103, instruction: 'Make a cow sound — Moooo! 🐮', tip: 'Animal sounds are often the first sounds children attempt.' },
    { id: 104, instruction: 'Clap and say "Yay!" together 🙌', tip: 'Pair sound with movement — it creates stronger memory links.' },
    { id: 105, instruction: 'Say "Uh oh!" and drop a toy 😲', tip: '"Uh oh" is one of the earliest phrases toddlers learn. Repeat 3 times.' },
    { id: 106, instruction: 'Make a siren sound — Wee woo! 🚨', tip: 'Go slow then fast. Let your child control the speed.' },
  ],
};

const session2: SessionDefinition = {
  id: 2, level: 'Beginner', type: 'Vocal Play',
  title: 'Sound Shapes',
  description: 'Practice mouth movements that build speech foundations.',
  steps: [
    { id: 201, instruction: 'Round your lips into an "O" — hold it! 👄', tip: 'Hold a mirror so they can see the shape. Make it a game.' },
    { id: 202, instruction: 'Smile as wide as you can — "Eeeee!" 😁', tip: 'Exaggerate the smile. Show teeth. Wait for them to copy.' },
    { id: 203, instruction: 'Puff your cheeks up like a balloon 🎈', tip: 'Then pop them! The surprise element keeps them engaged.' },
    { id: 204, instruction: 'Stick your tongue out slowly — wiggle it 👅', tip: 'Tongue control is essential for clear speech later.' },
    { id: 205, instruction: 'Hum a simple tune together 🎵', tip: '"Mmmmm" humming exercises lip closure for M, B, P sounds.' },
    { id: 206, instruction: 'Click your tongue — now try together! 👆', tip: 'Even silly sounds build oral motor strength.' },
  ],
};

const session3: SessionDefinition = {
  id: 3, level: 'Beginner', type: 'Phoneme Focus',
  title: 'First Sounds — B, M, P',
  description: 'These are the earliest consonants most children produce.',
  steps: [
    { id: 301, instruction: 'Practice "Ba ba ba!" 3 times 👄', tip: 'Exaggerate your lip pop. "Ba" is often a first sound.' },
    { id: 302, instruction: 'Hum "Mmmmm" — like yummy food 😋', tip: '"Mama" often starts here. Pair it with something they love.' },
    { id: 303, instruction: 'Pop "Pa pa pa!" — feel the air puff 💨', tip: 'Put your hand in front of your mouth to feel the air. Let them try.' },
    { id: 304, instruction: 'Say "Boo!" and hide behind your hands 🙈', tip: 'Peekaboo is a classic — the surprise makes them want to vocalise.' },
    { id: 305, instruction: 'Try "Mmmm" at mealtimes — so yummy! 🍌', tip: 'Associating sounds with pleasure creates strong positive reinforcement.' },
    { id: 306, instruction: 'Make a popping "P" sound — pop pop pop! 🎉', tip: 'The plosive P sound is great for oral motor development.' },
  ],
};

const session4: SessionDefinition = {
  id: 4, level: 'Beginner', type: 'Simple Words',
  title: 'Body Parts',
  description: 'Point and name — body parts are always within reach!',
  steps: [
    { id: 401, instruction: 'Point to your nose and say "Nose!" 👃', tip: 'Wait 5 seconds after you say it. Give them time to attempt it.' },
    { id: 402, instruction: 'Point to their eyes — "Eyes! Blink blink!" 👀', tip: 'Blinking while saying the word adds a fun action cue.' },
    { id: 403, instruction: 'Touch your ears — "Ears! Can you hear?" 👂', tip: 'Wiggle your ears if you can — the silliness encourages vocalisation.' },
    { id: 404, instruction: 'Show your hands — "Hands! Clap clap!" 👐', tip: 'Clap on each syllable. Physical rhythm supports word learning.' },
    { id: 405, instruction: 'Pat your tummy — "Tummy! Pat pat!" 🤱', tip: 'Tummy is often one of the first body words because it\'s funny.' },
    { id: 406, instruction: 'Point to their mouth — "Mouth! Open wide!" 👄', tip: 'Point to yours then theirs. Turn-taking is key for conversation.' },
  ],
};

const session5: SessionDefinition = {
  id: 5, level: 'Beginner', type: 'Simple Words',
  title: 'Favourite Things',
  description: 'Words for objects they already love.',
  steps: [
    { id: 501, instruction: 'Hold up their favourite toy — wait silently ⏸', tip: 'Don\'t say the word first this time. See if they volunteer it.' },
    { id: 502, instruction: 'Show a ball and say "Ball! Throw!" ⚽', tip: 'Action + object pairs are easier to remember than objects alone.' },
    { id: 503, instruction: 'Hold up a cup — "Cup! Drink!" ☕', tip: 'Use words at mealtimes consistently for best results.' },
    { id: 504, instruction: 'Show a book — "Book! Read!" 📚', tip: 'Books create natural word learning opportunities.' },
    { id: 505, instruction: 'Hold a shoe — "Shoe! On or off?" 👟', tip: 'Simple choices (on/off) are easier than open-ended questions.' },
    { id: 506, instruction: 'Show something they love — wait 10 seconds ⭐', tip: 'The pause is powerful. Silence creates space for them to speak.' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// INTERMEDIATE — Sessions 6–10
// Goal: Consistent 1-word responses, beginning 2-word combinations.
// ─────────────────────────────────────────────────────────────────────────────

const session6: SessionDefinition = {
  id: 6, level: 'Intermediate', type: 'Simple Words',
  title: 'Action Words',
  description: 'Verbs are the engine of language — teach them early.',
  steps: [
    { id: 601, instruction: 'Jump up and shout "Jump!" 🦘', tip: 'Move your body when you say the word. Action verbs are easier to learn in motion.' },
    { id: 602, instruction: 'Sit down together — "Sit!" 🪑', tip: 'Use a simple command then wait for them to copy the word.' },
    { id: 603, instruction: 'Run to a wall — "Run! Go!" 🏃', tip: 'Physical games create the strongest word memories.' },
    { id: 604, instruction: 'Eat a snack — "Eat! Yum yum!" 🍎', tip: 'Mealtime vocabulary is highly motivating.' },
    { id: 605, instruction: 'Push a toy car — "Go! Vroom!" 🚗', tip: 'Sound effects alongside words reinforce learning.' },
    { id: 606, instruction: 'Stop walking — "Stop!" then resume 🛑', tip: 'Stop/go games teach turn-taking AND action words together.' },
  ],
};

const session7: SessionDefinition = {
  id: 7, level: 'Intermediate', type: 'Simple Words',
  title: 'Animal Words',
  description: 'Animals + sounds = double the learning!',
  steps: [
    { id: 701, instruction: 'Show a picture of a dog — "Dog! Woof!" 🐕', tip: 'The animal sound often comes before the word — both count as progress.' },
    { id: 702, instruction: 'Find a cat — real or picture — "Cat! Meow!" 🐱', tip: 'If you have a pet, use the real thing — it\'s far more engaging.' },
    { id: 703, instruction: 'Flap arms like a bird — "Bird! Fly!" 🐦', tip: 'Physical mime helps children connect words to concepts.' },
    { id: 704, instruction: 'Draw a fish or show a picture — "Fish! Swim!" 🐟', tip: 'Wiggle your hand like a fish swimming. Wait for them to copy.' },
    { id: 705, instruction: 'Hop like a bunny — "Hop! Bunny!" 🐰', tip: 'Movement-based learning is particularly effective for toddlers.' },
    { id: 706, instruction: 'Make elephant trunk arms — "Big! Elephant!" 🐘', tip: '"Big" is a great early adjective to introduce alongside animals.' },
  ],
};

const session8: SessionDefinition = {
  id: 8, level: 'Intermediate', type: 'Phoneme Focus',
  title: 'More Consonants — D, W, N',
  description: 'Building on B, M, P with the next set of common sounds.',
  steps: [
    { id: 801, instruction: 'Tap the table — "Da! Da! Da!" 🥁', tip: '"Da" is often a first word. Tap the table on each syllable for rhythm.' },
    { id: 802, instruction: 'Say "No no no!" with a big smile 🙅', tip: '"No" is a powerful early word. Keep it playful, not disciplinary.' },
    { id: 803, instruction: 'Round lips — "Woo! Woo!" like a train 🚂', tip: 'Round your lips into an "O" shape and show them in a mirror.' },
    { id: 804, instruction: 'Hum "Nnn" — feel it in your nose! 👃', tip: 'Put your finger on your nose — you can feel it vibrate with N sounds.' },
    { id: 805, instruction: 'Say "Down! Down! Down!" dropping a toy ⬇️', tip: 'D+action words are powerful. Repeat 3 times with the action.' },
    { id: 806, instruction: 'Wave and say "Bye bye! Wave wave!" 👋', tip: '"Bye" is a high-frequency word with built-in social reinforcement.' },
  ],
};

const session9: SessionDefinition = {
  id: 9, level: 'Intermediate', type: 'Sentence Building',
  title: 'Making Requests',
  description: 'Two-word phrases that get them what they want!',
  steps: [
    { id: 901, instruction: 'Hold snack out of reach — model "More please!" 🍪', tip: 'Wait for any attempt before giving the snack. Even "mo" counts.' },
    { id: 902, instruction: 'Model "All done!" when finishing activity ✅', tip: 'Clap hands together on "done". The gesture supports the word.' },
    { id: 903, instruction: 'Put toy away — model "Want that!" 🙋', tip: '"Want that" is one of the most motivating phrases because it works!' },
    { id: 904, instruction: 'Give a tiny portion — wait for "More!" 🥄', tip: 'Small portions create natural opportunities for "more" requests.' },
    { id: 905, instruction: 'Go to the door — model "Go out!" 🚪', tip: 'Phrases that open opportunities are the most motivating to learn.' },
    { id: 906, instruction: 'Model "Help me!" when you pretend to struggle 🤝', tip: '"Help me" is incredibly useful for toddlers and they learn it fast.' },
  ],
};

const session10: SessionDefinition = {
  id: 10, level: 'Intermediate', type: 'Sentence Building',
  title: 'Describing Things',
  description: 'Adding adjectives to create richer two-word phrases.',
  steps: [
    { id: 1001, instruction: 'Show a big toy vs small toy — "Big! Small!" 📏', tip: 'Physical comparison makes abstract concepts concrete.' },
    { id: 1002, instruction: 'Warm food — "Hot food! Blow blow!" 🍲', tip: 'Blowing on food demonstrates the concept and adds action.' },
    { id: 1003, instruction: 'Point to their cup — "My cup! Mine!" 🥤', tip: 'Possession words are highly motivating because they assert identity.' },
    { id: 1004, instruction: 'Big dog! Little cat! Compare pictures 🐕🐱', tip: 'Opposites help children understand the concept of describing.' },
    { id: 1005, instruction: 'Fast car vs slow car — race them! 🏎️', tip: 'Speed concepts are fun to demonstrate with toy cars.' },
    { id: 1006, instruction: 'Happy face / sad face — "Happy! Sad!" 😊😢', tip: 'Emotion words help children understand and communicate feelings.' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPERIENCED — Sessions 11–15
// Goal: 3-word attempts, questions, feelings, narrative sequences.
// ─────────────────────────────────────────────────────────────────────────────

const session11: SessionDefinition = {
  id: 11, level: 'Experienced', type: 'Sentence Building',
  title: 'Asking Questions',
  description: 'Simple questions are a huge communication milestone.',
  steps: [
    { id: 1101, instruction: 'Hide a toy — model "Where go?" 🙈', tip: 'Early questions don\'t need to be grammatically perfect — they just need to be said!' },
    { id: 1102, instruction: 'Point to something new — "What that?" 🤔', tip: 'Curiosity-based questions are the most natural to teach.' },
    { id: 1103, instruction: 'Point to a person — "Who is?" 👤', tip: 'People are highly interesting to toddlers — leverage that.' },
    { id: 1104, instruction: 'Knock on a door — "Who there?" 🚪', tip: 'Familiar games like knock-knock create a natural context for "who".' },
    { id: 1105, instruction: 'Hold two snacks — "Which one?" 🍎🍌', tip: 'Forced choice questions are easier than open questions.' },
    { id: 1106, instruction: 'Point outside — "Go where?" 🌳', tip: 'Location questions open up bigger conversations about the world.' },
  ],
};

const session12: SessionDefinition = {
  id: 12, level: 'Experienced', type: 'Sentence Building',
  title: 'Expressing Feelings',
  description: 'Teaching children to name emotions is life-changing.',
  steps: [
    { id: 1201, instruction: 'Big smile — "I happy! You happy?" 😊', tip: 'Mirror emotions with your face. Children learn feelings by seeing them.' },
    { id: 1202, instruction: 'Pretend to be sad — "Me sad. Hug!" 😢', tip: 'Pretend emotions are safer to explore than real distress.' },
    { id: 1203, instruction: 'Jump excitedly — "So excited! Jump!" 🎊', tip: 'High-energy emotions are the easiest to dramatise.' },
    { id: 1204, instruction: 'Yawn and stretch — "Tired now. Sleep." 😴', tip: 'Physical states (tired, hungry) are easy starting points for feelings.' },
    { id: 1205, instruction: 'After falling — "Ouch! That hurt. Okay now." 🤕', tip: 'Naming physical pain helps children communicate needs clearly.' },
    { id: 1206, instruction: 'Hug a toy — "Love you! Hug hug!" ❤️', tip: 'Love and affection are powerful emotional vocabulary starters.' },
  ],
};

const session13: SessionDefinition = {
  id: 13, level: 'Experienced', type: 'Sentence Building',
  title: 'Telling Mini Stories',
  description: 'Three-word sequences that describe what\'s happening.',
  steps: [
    { id: 1301, instruction: 'Push a car — "Car go fast!" 🚗💨', tip: 'Subject + verb + adjective is a big milestone. Celebrate any attempt.' },
    { id: 1302, instruction: 'Dog runs away — "Doggy run fast!" 🐕', tip: 'Use their favourite animal for maximum motivation.' },
    { id: 1303, instruction: 'Drop a ball — "Ball go boom!" 💥', tip: '"Boom" is often a first spontaneous word. Build on it.' },
    { id: 1304, instruction: 'Eat food — "I eat apple!" 🍎', tip: 'Subject + verb + object = a complete thought. Huge milestone!' },
    { id: 1305, instruction: 'Build a tower — "Tower fall down!" 🏗️', tip: 'Cause-and-effect sequences help children understand narrative.' },
    { id: 1306, instruction: 'Wave goodbye to dad/mum — "Daddy go bye!" 👋', tip: 'Familiar people make abstract grammar personal and meaningful.' },
  ],
};

const session14: SessionDefinition = {
  id: 14, level: 'Experienced', type: 'Phoneme Focus',
  title: 'Advanced Sounds — S, F, SH',
  description: 'Later-developing sounds that refine speech clarity.',
  steps: [
    { id: 1401, instruction: 'Hiss like a snake — "Ssssss!" 🐍', tip: 'S is one of the most common sounds in English. It\'s worth practicing.' },
    { id: 1402, instruction: 'Blow out a candle — "Ffff!" 🕯️', tip: 'F requires teeth on lower lip — show them slowly in a mirror.' },
    { id: 1403, instruction: '"Shhh!" — finger on lips for quiet 🤫', tip: 'SH is a fun sound because it has a clear action and meaning.' },
    { id: 1404, instruction: 'Snake sound + "Snake!" 🐍', tip: 'Connecting the sound to a word gives context and meaning.' },
    { id: 1405, instruction: '"Fish! Fin! Fff!" — exaggerate the F 🐟', tip: 'F words are great because many common words start with F.' },
    { id: 1406, instruction: '"Shoes! Shop! SHhhh!" — practice SH 👟', tip: 'SH often develops between ages 3-4. Don\'t worry if it\'s hard.' },
  ],
};

const session15: SessionDefinition = {
  id: 15, level: 'Experienced', type: 'Sentence Building',
  title: 'Mastery Session',
  description: 'Your child\'s graduation day — three-word sentences and beyond!',
  steps: [
    { id: 1501, instruction: 'Ask "What do you want?" — wait 10 seconds ⭐', tip: 'The long pause is intentional. Give them maximum time to formulate.' },
    { id: 1502, instruction: 'Look at a book — "Tell me what you see!" 📚', tip: 'Open-ended prompts at this stage encourage spontaneous language.' },
    { id: 1503, instruction: 'Ask "What happened?" after a toy falls 🤔', tip: 'Narrative recall is a sophisticated skill — celebrate any attempt.' },
    { id: 1504, instruction: '"What does the dog say?" — point to picture 🐕', tip: 'Connecting labels to context shows true word comprehension.' },
    { id: 1505, instruction: 'Ask "Where is your nose?" — wait silently 👃', tip: 'Body part comprehension at this stage should be automatic.' },
    { id: 1506, instruction: 'Say "Tell me something!" — your turn to listen 👂', tip: 'Reversing roles — making them the speaker — is the ultimate goal.' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Master list — ordered 1–15
// ─────────────────────────────────────────────────────────────────────────────
export const ALL_SESSIONS: SessionDefinition[] = [
  session1, session2, session3, session4, session5,
  session6, session7, session8, session9, session10,
  session11, session12, session13, session14, session15,
];

// Grouped by level for UI display
export const SESSIONS_BY_LEVEL: Record<SessionLevel, SessionDefinition[]> = {
  Beginner:     ALL_SESSIONS.filter(s => s.level === 'Beginner'),
  Intermediate: ALL_SESSIONS.filter(s => s.level === 'Intermediate'),
  Experienced:  ALL_SESSIONS.filter(s => s.level === 'Experienced'),
};

// Legacy export — used as default when no recommendation available
export const TODDLER_SESSION_STEPS = session1.steps;