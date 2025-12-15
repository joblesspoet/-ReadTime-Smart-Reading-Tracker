/**
 * Article Detector
 * Responsible for identifying the main content of a page.
 */

export default class ArticleDetector {
  constructor() {
    this.articleSelectors = [
      'article',
      '[role="article"]',
      '.post-content',
      '.entry-content',
      '.article-content',
      '#content',
      'main'
    ];
  }

  /**
   * Checks if the current page is likely an article.
   * @returns {boolean}
   */
  isArticlePage() {
    // Quick checks
    const hasArticleTag = document.getElementsByTagName('article').length > 0;
    if (hasArticleTag) return true;

    // Check for common schematic structures
    // If we have a lot of text in paragraphs, it's likely an article
    const pCount = document.getElementsByTagName('p').length;
    if (pCount > 5) return true;

    return false;
  }

  /**
   * Extracts the main content text from the page.
   * @returns {string} The text content
   */
  extractMainContent() {
    let contentElement = null;

    // 1. Try specific selectors first (highest priority)
    for (const selector of this.articleSelectors) {
      const element = document.querySelector(selector);
      if (element && element.innerText.length > 500) { // arbitrary threshold
        contentElement = element;
        break;
      }
    }

    // 2. Fallback: Find the element with the most text
    if (!contentElement) {
        contentElement = this.findLargestTextBlock();
    }

    if (contentElement) {
      this.contentElement = contentElement; // Store for progress tracking
      return contentElement.innerText;
    }

    // 3. Fallback: Body text
    return document.body.innerText;
  }

  /**
   * Finds the element with the most text content.
   * @returns {HTMLElement|null}
   */
  findLargestTextBlock() {
    // This is a naive implementation. A robust one would score elements.
    // For MVP, we check specific containers.
    
    // Attempt to find a container with many paragraphs
    const paragraphs = Array.from(document.getElementsByTagName('p'));
    if (paragraphs.length === 0) return null;

    // Find the common ancestor of the most paragraphs? 
    // Or just return the body if we can't be smart.
    // Let's try to return the parent of the first paragraph for now if it contains multiple
    // or finding the parent with the most paragraph children.
    
    const parentCounts = new Map();
    let maxCount = 0;
    let bestParent = null;

    for(const p of paragraphs) {
        const parent = p.parentElement;
        const count = (parentCounts.get(parent) || 0) + 1;
        parentCounts.set(parent, count);
        
        if (count > maxCount) {
            maxCount = count;
            bestParent = parent;
        }
    }

    return bestParent;
  }
}
