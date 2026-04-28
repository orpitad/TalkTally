export interface SessionStep {
  id: number;
  instruction: string;
  tip: string;
}

export const TODDLER_SESSION_STEPS: SessionStep[] = [
  { id: 1, instruction: "Hold up a favorite toy.", tip: "Wait for your child to look at it." },
  { id: 2, instruction: "Ask 'What is this?'", tip: "Give them 5 seconds to think." },
  { id: 3, instruction: "Point to your nose.", tip: "Wait for them to try and mimic the word 'Nose'." },
];