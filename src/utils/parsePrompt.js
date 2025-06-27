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
  const match = text.match(/(?:generate|get|need)\s+(\d+)\s+(?:leads|contacts)/i);
  return match ? parseInt(match[1], 10) : 100;
};
