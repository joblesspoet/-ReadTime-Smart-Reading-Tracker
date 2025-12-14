import ArticleDetector from './detector.js';
import { countWords, estimateReadingTime } from '../utils/calculator.js';
import StorageManager from '../utils/storage.js';

class ReadTimeBadge {
  constructor() {
    this.badge = null;
    this.detector = new ArticleDetector();
  }

  create() {
    if (this.badge) return; // Prevent duplicates

    this.badge = document.createElement('div');
    this.badge.className = 'readtime-badge';
    // Style will be applied by content.css
  }

  show(readingTimeMinutes) {
    if (!this.badge) this.create();
    
    // Safety check
    if (!readingTimeMinutes || readingTimeMinutes < 1) return;

    this.badge.innerHTML = `<span>${readingTimeMinutes} min read</span>`;
    
    // Inject if not already there
    if (!document.body.contains(this.badge)) {
        document.body.appendChild(this.badge);
    }

    // Trigger reflow for animation
    void this.badge.offsetWidth; 

    // Add visible class
    this.badge.classList.add('readtime-badge-visible');
  }

  hide() {
    if (this.badge) {
      this.badge.classList.remove('readtime-badge-visible');
    }
  }
}

// Initialize
async function init() {
  // Load settings
  const settings = await new Promise(resolve => {
    chrome.storage.sync.get({
        settings: {
            readingSpeed: 200,
            showBadge: true,
            showProgressBar: true,
            showResumeNotification: true
        }
    }, (items) => resolve(items.settings));
  });

  const badge = new ReadTimeBadge();
  const detector = new ArticleDetector();
  const progress = new ProgressTracker();
  
  // Checking if it's an article page
  if (detector.isArticlePage()) {
    const content = detector.extractMainContent();
    const wordCount = countWords(content);
    const readingTime = estimateReadingTime(wordCount, settings.readingSpeed);
    
    if (settings.showBadge) {
        badge.create();
        badge.show(readingTime);
    }

    // Initialize progress tracker
    if (settings.showProgressBar) {
        progress.init();
    }

    // Check for saved position
    if (settings.showResumeNotification) {
        const savedPosition = await StorageManager.getPosition(window.location.href);
        if (savedPosition && savedPosition.progress > 10 && savedPosition.progress < 95) {
            // Show resume
            const resume = new ResumeNotification(savedPosition);
            resume.show();
        }
    }

    // Save on unload
    window.addEventListener('beforeunload', () => {
        let currentProgress = 0;
        if (settings.showProgressBar) {
            currentProgress = progress.calculateProgress();
        } else {
             // Calculate casually if tracker is hidden
            const docHeight = document.documentElement.scrollHeight;
            const winHeight = window.innerHeight;
            currentProgress = (window.scrollY / (docHeight - winHeight)) * 100;
        }

        if (currentProgress > 5) { // Only save if started reading
             StorageManager.savePosition({
                 url: window.location.href,
                 title: document.title,
                 domain: window.location.hostname,
                 scrollPosition: window.scrollY,
                 progress: currentProgress,
                 timestamp: Date.now(),
                 completed: currentProgress >= 95,
                 readingTime: readingTime,
                 wordCount: wordCount
             });
        }
    });
  }
}

class ProgressTracker {
  constructor() {
    this.progressBar = null;
    this.progressFill = null;
    this.ticking = false;
  }

  create() {
    if (this.progressBar) return;

    this.progressBar = document.createElement('div');
    this.progressBar.className = 'readtime-progress-bar';
    
    this.progressFill = document.createElement('div');
    this.progressFill.className = 'readtime-progress-fill';
    
    this.progressBar.appendChild(this.progressFill);
    document.body.appendChild(this.progressBar);
  }

  calculateProgress() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight;
    const winHeight = window.innerHeight;
    
    const scrollPercent = (scrollTop / (docHeight - winHeight)) * 100;
    return Math.min(100, Math.max(0, scrollPercent));
  }

  update() {
    const percent = this.calculateProgress();
    
    if (this.progressFill) {
      this.progressFill.style.width = `${percent}%`;
      
      if (percent >= 99) {
        this.progressFill.classList.add('complete');
      } else {
        this.progressFill.classList.remove('complete');
      }
    }
    
    this.ticking = false;
  }

  onScroll = () => {
    if (!this.ticking) {
      window.requestAnimationFrame(() => this.update());
      this.ticking = true;
    }
  }

  init() {
    this.create();
    window.addEventListener('scroll', this.onScroll, { passive: true });
    // Initial update
    this.update();
  }
  
  destroy() {
    window.removeEventListener('scroll', this.onScroll);
    if(this.progressBar) this.progressBar.remove();
  }
}

class ResumeNotification {
    constructor(data) {
        this.data = data;
        this.element = null;
    }

    create() {
        this.element = document.createElement('div');
        this.element.className = 'readtime-resume-notification';
        
        const remainingPercent = 100 - this.data.progress;
        const remainingTime = Math.ceil((this.data.readingTime * remainingPercent) / 100);

        this.element.innerHTML = `
            <div class="readtime-resume-content">
                <span class="readtime-resume-icon">📖</span>
                <div class="readtime-resume-text">
                    <strong>Continue Reading?</strong>
                    <span>You were at ${Math.round(this.data.progress)}% (${remainingTime} min left)</span>
                </div>
                <button class="readtime-resume-btn" id="rt-resume-btn">Resume</button>
                <button class="readtime-dismiss-btn" id="rt-dismiss-btn">✕</button>
            </div>
        `;

        document.body.appendChild(this.element);

        // Listeners
        this.element.querySelector('#rt-resume-btn').addEventListener('click', () => {
            window.scrollTo({ top: this.data.scrollPosition, behavior: 'smooth' });
            this.hide();
        });

        this.element.querySelector('#rt-dismiss-btn').addEventListener('click', () => {
            this.hide();
        });
    }

    show() {
        if (!this.element) this.create();
        
        // Trigger reflow
        void this.element.offsetWidth;
        this.element.classList.add('readtime-resume-visible');

        // Auto hide after 10s
        setTimeout(() => this.hide(), 10000);
    }

    hide() {
        if (this.element) {
            this.element.classList.remove('readtime-resume-visible');
            setTimeout(() => this.element.remove(), 500);
        }
    }
}

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init); // init is async now, but that's fine
} else {
  // If already loaded (e.g. injected later), run immediately
  init();
}
