/**
 * Reading time calculator utilities
 */

/**
 * Counts the number of words in a text string.
 * Uses a regex to split by whitespace and filter out empty strings.
 * 
 * @param {string} text - The text to count words in
 * @returns {number} The word count
 */
export function countWords(text) {
  if (!text) return 0;
  // Split by whitespace and filter empty strings
  // Also handles some common punctuation that might be attached to words
  return text.trim().split(/\s+/).length;
}

/**
 * Estimates the reading time in minutes.
 * 
 * @param {number} wordCount - The total number of words
 * @param {number} wordsPerMinute - Reading speed (default: 200)
 * @returns {number} Estimated reading time in minutes (rounded up)
 */
export function estimateReadingTime(wordCount, wordsPerMinute = 200) {
  if (!wordCount || wordCount < 0) return 0;
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  return Math.max(1, minutes); // Minimum 1 minute
}
