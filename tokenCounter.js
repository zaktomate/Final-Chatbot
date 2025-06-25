const { encode } = require("gpt-3-encoder"); // works for Gemini too, similar token logic

/**
 * Estimate token count from a given string
 * @param {string} text
 * @returns {number}
 */
function countTokens(text) {
  if (!text) return 0;
  return encode(text).length;
}

/**
 * Log tokens used for full prompt
 * @param {string} context
 * @param {string} prompt
 */
function logTokenStats(context, prompt) {
  const contextTokens = countTokens(context);
  const promptTokens = countTokens(prompt);
  const totalTokens = contextTokens + promptTokens;

  console.log(`🔢 Tokens — Context: ${contextTokens}, Prompt: ${promptTokens}, Total: ${totalTokens}`);
  return { contextTokens, promptTokens, totalTokens };
}

module.exports = { countTokens, logTokenStats };
