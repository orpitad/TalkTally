export type PhonemeTarget = {
  word: string;
  target_phoneme: string;
  emoji: string;
  coaching: string;
};

export type PhonemeCategory = {
  id: string;
  label: string;
  phoneme_group: string; // e.g. "/p, b, m/"
  age_min_months: number;
  color: string; // background tint
  emoji: string;
  description: string;
  targets: PhonemeTarget[];
};

// 15 developmental milestones (age-graded, ordered by typical emergence)
export const PHONEME_CATEGORIES: PhonemeCategory[] = [
  {
    id: "bilabials",
    label: "Bilabials",
    phoneme_group: "/p, b, m/",
    age_min_months: 12,
    color: "#FFE0B2",
    emoji: "👄",
    description: "Lips together — the first sounds babies form.",
    targets: [
      { word: "Mama", target_phoneme: "/m/", emoji: "🤱", coaching: "Press lips, hum 'mmm' before opening." },
      { word: "Papa", target_phoneme: "/p/", emoji: "👨", coaching: "Little pop of air off the lips." },
      { word: "Ball", target_phoneme: "/b/", emoji: "⚽", coaching: "Voiced pop — lips together, then release." },
      { word: "Baby", target_phoneme: "/b/", emoji: "👶", coaching: "Two beats: BAY-bee. Bounce lips." },
    ],
  },
  {
    id: "alveolars",
    label: "Alveolars",
    phoneme_group: "/t, d, n/",
    age_min_months: 15,
    color: "#B2DFDB",
    emoji: "👅",
    description: "Tongue tip taps behind the top teeth.",
    targets: [
      { word: "Toe", target_phoneme: "/t/", emoji: "🦶", coaching: "Tap tongue behind teeth: 't-oh'." },
      { word: "Dog", target_phoneme: "/d/", emoji: "🐶", coaching: "Same tap but voiced." },
      { word: "No", target_phoneme: "/n/", emoji: "🙅", coaching: "Nose hum + tongue tap." },
      { word: "Duck", target_phoneme: "/d/", emoji: "🦆", coaching: "Short 'duh' then 'k'." },
    ],
  },
  {
    id: "velars",
    label: "Velars",
    phoneme_group: "/k, g/",
    age_min_months: 18,
    color: "#C5CAE9",
    emoji: "🗣️",
    description: "Back of the tongue lifts to the soft palate.",
    targets: [
      { word: "Cat", target_phoneme: "/k/", emoji: "🐱", coaching: "Hold tongue tip down, back goes up." },
      { word: "Go", target_phoneme: "/g/", emoji: "🚗", coaching: "Voiced 'guh' — throaty." },
      { word: "Cup", target_phoneme: "/k/", emoji: "🥤", coaching: "Sharp 'k' pop at back." },
    ],
  },
  {
    id: "glides",
    label: "Glides",
    phoneme_group: "/w, j/",
    age_min_months: 18,
    color: "#FFF9C4",
    emoji: "🌊",
    description: "Smooth lip- or tongue-glides.",
    targets: [
      { word: "Wow", target_phoneme: "/w/", emoji: "😮", coaching: "Round lips, glide open." },
      { word: "Yes", target_phoneme: "/j/", emoji: "✅", coaching: "Tongue lifts, glide to 'ess'." },
      { word: "Water", target_phoneme: "/w/", emoji: "💧", coaching: "Two beats, round then tap." },
    ],
  },
  {
    id: "nasals-final",
    label: "Nasal Endings",
    phoneme_group: "/-n, -m, -ng/",
    age_min_months: 20,
    color: "#F8BBD0",
    emoji: "👃",
    description: "Nasal sounds finishing words.",
    targets: [
      { word: "Down", target_phoneme: "/n/", emoji: "👇", coaching: "Hold 'n' at the end — feel the hum." },
      { word: "Home", target_phoneme: "/m/", emoji: "🏠", coaching: "Close lips at end for 'mmm'." },
      { word: "Sing", target_phoneme: "/ng/", emoji: "🎵", coaching: "Hum from the back of nose." },
    ],
  },
  {
    id: "fricatives-early",
    label: "Early Fricatives",
    phoneme_group: "/f, s/",
    age_min_months: 22,
    color: "#B3E5FC",
    emoji: "💨",
    description: "Air hiss through teeth or lip.",
    targets: [
      { word: "Fish", target_phoneme: "/f/", emoji: "🐟", coaching: "Top teeth on bottom lip, blow." },
      { word: "Sun", target_phoneme: "/s/", emoji: "☀️", coaching: "Teeth close, long hiss 'sss'." },
      { word: "Off", target_phoneme: "/f/", emoji: "🔌", coaching: "Bite lip lightly, then blow." },
    ],
  },
  {
    id: "hword",
    label: "Aspirated /h/",
    phoneme_group: "/h/",
    age_min_months: 22,
    color: "#FFCCBC",
    emoji: "🫁",
    description: "Airy exhale from the chest.",
    targets: [
      { word: "Hi", target_phoneme: "/h/", emoji: "👋", coaching: "Warm breath first: 'hhh-eye'." },
      { word: "Hop", target_phoneme: "/h/", emoji: "🐰", coaching: "Breathy start, close with 'p'." },
    ],
  },
  {
    id: "twosyllable",
    label: "Two-Syllable Words",
    phoneme_group: "CVCV",
    age_min_months: 24,
    color: "#D1C4E9",
    emoji: "🔤",
    description: "Combining two beats in one word.",
    targets: [
      { word: "Bunny", target_phoneme: "/b/ + /n/", emoji: "🐰", coaching: "Two beats: BUH-nee. Bounce lips." },
      { word: "Doggy", target_phoneme: "/d/ + /g/", emoji: "🐕", coaching: "Tap, then throat: DAW-gee." },
      { word: "Kitty", target_phoneme: "/k/ + /t/", emoji: "🐈", coaching: "Two taps: KIH-tee." },
    ],
  },
  {
    id: "lateral",
    label: "Lateral /l/",
    phoneme_group: "/l/",
    age_min_months: 26,
    color: "#DCEDC8",
    emoji: "👅",
    description: "Tongue lifts, air flows around sides.",
    targets: [
      { word: "Love", target_phoneme: "/l/", emoji: "❤️", coaching: "Tongue tip on ridge, hum 'lll'." },
      { word: "Ball", target_phoneme: "/-l/", emoji: "⚽", coaching: "Hold 'l' at the end of the word." },
      { word: "Lion", target_phoneme: "/l/", emoji: "🦁", coaching: "Long 'lie' + soft 'un'." },
    ],
  },
  {
    id: "rhotic",
    label: "Rhotic /r/",
    phoneme_group: "/r/",
    age_min_months: 30,
    color: "#F0F4C3",
    emoji: "🐯",
    description: "Curled tongue growl — often late to emerge.",
    targets: [
      { word: "Roar", target_phoneme: "/r/", emoji: "🦁", coaching: "Curl tongue back, growl: 'rrr'." },
      { word: "Red", target_phoneme: "/r/", emoji: "🍎", coaching: "Growl start: RED." },
      { word: "Car", target_phoneme: "/-r/", emoji: "🚗", coaching: "Hold 'r' after 'cah'." },
    ],
  },
  {
    id: "shwords",
    label: "Sh Words",
    phoneme_group: "/ʃ/",
    age_min_months: 30,
    color: "#B3E5FC",
    emoji: "🤫",
    description: "Rounded lips, whispered 'shh'.",
    targets: [
      { word: "Shoe", target_phoneme: "/ʃ/", emoji: "👟", coaching: "Round lips, whisper 'shhh'." },
      { word: "Fish", target_phoneme: "/-ʃ/", emoji: "🐟", coaching: "End with quiet 'shh'." },
      { word: "Shell", target_phoneme: "/ʃ/", emoji: "🐚", coaching: "Shh + ell." },
    ],
  },
  {
    id: "chwords",
    label: "Ch Words",
    phoneme_group: "/tʃ/",
    age_min_months: 30,
    color: "#FFCCBC",
    emoji: "🚂",
    description: "Stop-then-shush: 't' + 'sh'.",
    targets: [
      { word: "Chair", target_phoneme: "/tʃ/", emoji: "🪑", coaching: "Tap tongue, then 'shh': ch-air." },
      { word: "Cheese", target_phoneme: "/tʃ/", emoji: "🧀", coaching: "Smile + ch." },
    ],
  },
  {
    id: "voiced-fric",
    label: "Voiced Fricatives",
    phoneme_group: "/v, z/",
    age_min_months: 32,
    color: "#C5E1A5",
    emoji: "🐝",
    description: "Buzz through teeth or lip — voiced.",
    targets: [
      { word: "Van", target_phoneme: "/v/", emoji: "🚐", coaching: "Buzz on lip: 'vvv-an'." },
      { word: "Zoo", target_phoneme: "/z/", emoji: "🦓", coaching: "Bee buzz: 'zzz-oo'." },
      { word: "Bees", target_phoneme: "/-z/", emoji: "🐝", coaching: "End with a soft buzz." },
    ],
  },
  {
    id: "blends",
    label: "Consonant Blends",
    phoneme_group: "/bl, tr, sp/",
    age_min_months: 34,
    color: "#B39DDB",
    emoji: "🧩",
    description: "Two consonants stuck together.",
    targets: [
      { word: "Blue", target_phoneme: "/bl/", emoji: "🟦", coaching: "Blend 'b' straight into 'l'." },
      { word: "Truck", target_phoneme: "/tr/", emoji: "🚚", coaching: "Tap + growl: 't-r-uck'." },
      { word: "Spoon", target_phoneme: "/sp/", emoji: "🥄", coaching: "Hiss then pop: 'sp'." },
    ],
  },
  {
    id: "phrases",
    label: "Short Phrases",
    phoneme_group: "Multi-word",
    age_min_months: 30,
    color: "#FFCCBC",
    emoji: "🗨️",
    description: "Two-word combos — the start of language.",
    targets: [
      { word: "More milk", target_phoneme: "phrase", emoji: "🥛", coaching: "Two beats separated cleanly." },
      { word: "All done", target_phoneme: "phrase", emoji: "✅", coaching: "Emphasize 'done' with a lip pop." },
      { word: "My turn", target_phoneme: "phrase", emoji: "🙋", coaching: "Slow it down — my. turn." },
    ],
  },
];

export function ageCohortMinMonths(cohort: string): number {
  const map: Record<string, number> = { "12-18M": 12, "18-24M": 18, "24-30M": 24, "30-36M": 30 };
  return map[cohort] ?? 12;
}
