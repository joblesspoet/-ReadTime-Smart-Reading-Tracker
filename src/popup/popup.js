import StorageManager from '../utils/storage.js';

class PopupDashboard {
  constructor() {
    this.articles = [];
    this.filteredArticles = [];
    this.currentFilter = 'all';
    this.searchQuery = '';
  }

  async init() {
    // Load articles from storage
    await this.loadArticles();
    
    // Display stats
    this.displayStats();
    
    // Render article list
    this.renderArticles();
    
    // Set up event listeners
    this.attachListeners();
  }

  async loadArticles() {
    const articlesObj = await StorageManager.getAllArticles();
    this.articles = Object.values(articlesObj)
      .sort((a, b) => b.timestamp - a.timestamp);
    
    this.filterArticles();
  }

  displayStats() {
    const stats = {
      total: this.articles.length,
      completed: this.articles.filter(a => a.completed).length,
      minutesRead: this.articles.reduce((sum, a) => {
         // Naive estimation of minutes read = (progress/100) * readingTime
         const progressFactor = (a.progress || 0) / 100;
         return sum + Math.round((a.readingTime || 0) * progressFactor);
      }, 0)
    };
    
    document.getElementById('totalArticles').textContent = stats.total;
    document.getElementById('completedArticles').textContent = stats.completed;
    document.getElementById('minutesSaved').textContent = stats.minutesRead;
  }

  renderArticles() {
    const listContainer = document.getElementById('articleList');
    const emptyState = document.getElementById('emptyState');
    
    if (this.filteredArticles.length === 0) {
      listContainer.style.display = 'none';
      emptyState.style.display = 'flex';
      return;
    }
    
    listContainer.style.display = 'block';
    emptyState.style.display = 'none';
    
    listContainer.innerHTML = this.filteredArticles
      .map(article => this.createArticleCard(article))
      .join('');
    
    // Re-attach listeners since we overwrote innerHTML
    this.attachCardListeners();
  }

  createArticleCard(article) {
    const progressColor = article.completed ? '#10b981' : '#3b82f6';
    const statusText = article.completed ? 
      'Completed' : 
      `${Math.round(article.progress)}%`;
    
    const remainingTime = Math.ceil((article.readingTime || 0) * (1 - (article.progress/100)));
    const timeText = article.completed ? 
       'Done' : 
       `${remainingTime}m left`;

    const faviconUrl = article.domain ? 
      `https://www.google.com/s2/favicons?domain=${article.domain}&sz=32` : 
      '../../icons/icon16.png';
    
    return `
      <div class="article-card" data-url="${article.url}">
        <img src="${faviconUrl}" 
             class="article-favicon" 
             alt="icon"
        />
        <div class="article-content">
          <h3 class="article-title" title="${this.escapeHtml(article.title)}">${this.escapeHtml(article.title)}</h3>
          <span class="article-domain">${article.domain}</span>
          <div class="article-progress">
            <div class="progress-bar-mini">
              <div class="progress-fill-mini" 
                   style="width: ${article.progress}%; background: ${progressColor}">
              </div>
            </div>
            <span class="progress-text">${statusText} • ${timeText}</span>
          </div>
        </div>
        <div class="article-actions">
          ${!article.completed ? `
            <button class="action-btn resume-btn" data-url="${article.url}" title="Resume">
              ▶️
            </button>
          ` : ''}
          <button class="action-btn delete-btn" data-url="${article.url}" title="Delete">
            🗑️
          </button>
        </div>
      </div>
    `;
  }

  attachCardListeners() {
    // Resume buttons
    document.querySelectorAll('.resume-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const url = btn.dataset.url;
        this.openArticle(url);
      });
    });
    
    // Delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const url = btn.dataset.url;
        this.deleteArticle(url);
      });
    });
    
    // Article cards (open article)
    document.querySelectorAll('.article-card').forEach(card => {
      card.addEventListener('click', (e) => {
        // Don't trigger if clicked on action buttons
        if(e.target.closest('.action-btn')) return;
        const url = card.dataset.url;
        this.openArticle(url);
      });
    });
  }

  attachListeners() {
    // Search input
    document.getElementById('searchInput').addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase();
      this.filterArticles();
      this.renderArticles(); // Need to re-render explicitly
    });
    
    // Filter select
    document.getElementById('filterSelect').addEventListener('change', (e) => {
      this.currentFilter = e.target.value;
      this.filterArticles();
      this.renderArticles();
    });
    
    // Settings button
    document.getElementById('settingsBtn').addEventListener('click', () => {
      if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        window.open(chrome.runtime.getURL('options.html'));
      }
    });
  }

  filterArticles() {
    this.filteredArticles = this.articles.filter(article => {
      // Filter by status
      let statusMatch = true;
      if (this.currentFilter === 'reading') {
        statusMatch = !article.completed && article.progress > 0;
      } else if (this.currentFilter === 'completed') {
        statusMatch = article.completed;
      }
      
      // Filter by search query
      const searchMatch = this.searchQuery === '' ||
        (article.title && article.title.toLowerCase().includes(this.searchQuery)) ||
        (article.domain && article.domain.toLowerCase().includes(this.searchQuery));
      
      return statusMatch && searchMatch;
    });
  }

  async openArticle(url) {
    chrome.tabs.create({ url, active: true });
  }

  async deleteArticle(url) {
    if (confirm('Remove this article from history?')) {
      await StorageManager.deleteArticle(url);
      await this.init(); // Reload everything
    }
  }

  escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const dashboard = new PopupDashboard();
  dashboard.init();
});
