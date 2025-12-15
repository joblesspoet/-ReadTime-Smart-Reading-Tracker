/**
 * Storage Manager for ReadTime
 * Handles saving and retrieving reading progress.
 */

class StorageManager {
  constructor() {
    this.MAX_ARTICLES = 100;
    this.STORAGE_KEY = 'readtime_articles';
  }

  /**
   * Saves the current article progress.
   * @param {Object} articleData 
   * @returns {Promise<boolean>}
   */
  async savePosition(articleData) {
    try {
      const articles = await this.getAllArticles();
      
      // Use URL as key
      articles[articleData.url] = articleData;
      
      // Cleanup if needed (LRU)
      const keys = Object.keys(articles);
      if (keys.length > this.MAX_ARTICLES) {
        this.cleanupOldArticles(articles);
      }
      
      await chrome.storage.local.set({ [this.STORAGE_KEY]: articles });
      return true;
    } catch (error) {
      if (error.message.includes('Extension context invalidated')) {
          console.warn('ReadTime: Extension updated/reloaded. Please refresh the page.');
          return false;
      }
      console.error('ReadTime: Save failed', error);
      return false;
    }
  }

  /**
   * Retrieves saved position for a URL.
   * @param {string} url 
   * @returns {Promise<Object|null>}
   */
  async getPosition(url) {
    try {
      const articles = await this.getAllArticles();
      return articles[url] || null;
    } catch (error) {
      console.error('ReadTime: Load failed', error);
      return null;
    }
  }

  /**
   * Gets all saved articles.
   * @returns {Promise<Object>}
   */
  async getAllArticles() {
    return new Promise((resolve) => {
        chrome.storage.local.get(this.STORAGE_KEY, (result) => {
            resolve(result[this.STORAGE_KEY] || {});
        });
    });
  }

  /**
   * Removes oldest articles to stay within limit.
   * @param {Object} articles 
   */
  cleanupOldArticles(articles) {
    const sorted = Object.entries(articles)
      .sort((a, b) => b[1].timestamp - a[1].timestamp) // Newest first
      .slice(0, this.MAX_ARTICLES);
    
    // Clear and rebuild
    for (const key in articles) delete articles[key];
    
    sorted.forEach(([key, val]) => {
      articles[key] = val;
    });
  }

  /**
   * Deletes a specific article.
   * @param {string} url 
   */
  async deleteArticle(url) {
    const articles = await this.getAllArticles();
    if (articles[url]) {
        delete articles[url];
        await chrome.storage.local.set({ [this.STORAGE_KEY]: articles });
    }
  }
}

export default new StorageManager();
