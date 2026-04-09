/**
 * Greeting detection utility for AI Chat
 * Detects casual greetings and small talk to handle them locally
 */

const GREETING_PATTERNS = [
  /^h+e+y+[!?.]*$/i,
  /^h+i+[!?.]*$/i,
  /^hello[!?.]*$/i,
  /^sup[!?.]*$/i,
  /^what'?s up[!?.]*$/i,
  /^yo[!?.]*$/i,
  /^howdy[!?.]*$/i,
  /^good (morning|afternoon|evening)[!?.]*$/i,
  /^greetings?[!?.]*$/i,
  /^namaste[!?.]*$/i,
];

/**
 * Detects if a message is a casual greeting
 * @param message - User message to check
 * @returns true if message matches greeting patterns
 */
export function isGreeting(message: string): boolean {
  const trimmed = message.trim();
  return GREETING_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * Pre-defined Rankly greeting response for instant replies
 */
export const RANKLY_GREETING = 
  "Hey! 👋 I'm Rankly — your AI career coach. I'm here to help you land your dream job. " +
  "Whether it's polishing your resume, nailing interviews, or negotiating your salary — " +
  "I've got you covered. What would you like to work on today? 🚀";
