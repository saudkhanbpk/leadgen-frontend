// Type definitions converted to JSDoc comments for JavaScript

/**
 * @typedef {Object} Lead
 * @property {string} name
 * @property {string} phone
 * @property {string} address
 * @property {string} [email]
 * @property {string} [company]
 * @property {string} [website]
 * @property {string} [notes]
 */

/**
 * @typedef {Object} Message
 * @property {string} id
 * @property {'user' | 'bot'} type
 * @property {string} content
 * @property {Date} timestamp
 * @property {Lead[]} [leads]
 */

/**
 * @typedef {Object} Conversation
 * @property {string} id
 * @property {string} title
 * @property {Message[]} messages
 * @property {Date} createdAt
 * @property {Date} updatedAt
 */

/**
 * @typedef {Object} LeadRequest
 * @property {string} [niche]
 * @property {string} [location]
 * @property {number} [count]
 */

// Export empty object to maintain module structure
export {};