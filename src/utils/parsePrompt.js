// src/utils/leadGenerator/parsePrompt.js

export const extractNiche = (text) => {
  const match = text.match(/(?:for|about)\s+([a-zA-Z\s]+)/i);
  return match ? match[1].trim() : null;
};

export const extractLocation = (text) => {
  const match = text.match(/in\s+([a-zA-Z\s]+)/i);
  return match ? match[1].trim() : null;
};

export const extractLeadCount = (text) => {
  // Use a clean RegExp pattern that looks for "generate X" specifically
  const match = text.match(/generate\s+(\d+)/i);
  return match ? parseInt(match[1], 10) : 50; // Default to 50 only if no number found
};
