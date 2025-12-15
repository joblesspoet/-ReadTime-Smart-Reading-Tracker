import ArticleDetector from './detector.js';
import { countWords, estimateReadingTime } from '../utils/calculator.js';
import StorageManager from '../utils/storage.js';

// Helper for consistent progress calculation
function calculateCurrentProgress(element = null) {
    if (!element) {
        // Fallback to page scroll
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight;
        const winHeight = window.innerHeight;
        const totalScrollable = docHeight - winHeight;

        if (totalScrollable <= 0) return 100;

        let percent = (scrollTop / totalScrollable) * 100;
        const remainingPx = docHeight - (scrollTop + winHeight);

        // If within 100px of bottom, consider it done (100%)
        if (remainingPx < 100) return 100;
        
        return Math.min(100, Math.max(0, percent));
    }

    // Article-specific scroll logic
    const rect = element.getBoundingClientRect();
    const elementTop = rect.top + window.scrollY;
    const elementHeight = element.offsetHeight;
    const winHeight = window.innerHeight;
    
    // Position of bottom of screen relative to document
    const scrollBottom = window.scrollY + winHeight;
    const elementBottom = elementTop + elementHeight;

    // If bottom of screen is past bottom of element, we are done
    if (scrollBottom >= elementBottom - 100) return 100; // 100px buffer

    // Calculate percent based on how much of the element we've traversed
    // We consider "start" when the top of element enters view ? 
    // Usually people start reading when top is at top.
    
    // Let's stick to: Scrolled distance past element top vs Total element height
    // But we need to account for window height.
    
    const validScrollStart = Math.max(0, elementTop);
    const validScrollEnd = elementBottom - winHeight; 
    const totalScrollRange = validScrollEnd - validScrollStart;

    if (totalScrollRange <= 0) return 100; // Element fits in screen

    const currentScroll = window.scrollY - validScrollStart;
    const percent = (currentScroll / totalScrollRange) * 100;

    return Math.min(100, Math.max(0, percent));
}

// State variables
let appInitialized = false;
let observer = null;
let lastUrl = location.href;
let saveListenerAdded = false;

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

    this.badge.innerHTML = `
      <span>${readingTimeMinutes} min read</span>
      <button class="readtime-close-btn" title="Dismiss">×</button>
    `;

    // Add close listener
    this.badge.querySelector('.readtime-close-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.hide();
      // Optionally prevent it from showing again on this specific page load?
      this.badge.remove(); 
      this.badge = null;
    });
    
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

// Deprecated old init, replaced by runReadTime
// async function init() { ... } 
// We are removing the old init function entirely to avoid confusion

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
    return calculateCurrentProgress(this.trackElement);
  }

  update() {
    const percent = this.calculateProgress();
    
    if (this.progressFill) {
      this.progressFill.style.width = `${percent}%`;
      
      if (percent >= 90) { // Lower threshold for visual feedback
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

  init(trackElement = null) {
    this.trackElement = trackElement;
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


function initApp() {
    // Initial run
    runReadTime();

    // Watch for URL changes (SPA)
    setInterval(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            // Short delay to let new content load
            setTimeout(runReadTime, 1000);
        }
    }, 1000);

    // Watch for DOM changes (Dynamic content loading)
    if (!observer) {
        observer = new MutationObserver((mutations) => {
            // Debounce
            if (window.readTimeTimeout) clearTimeout(window.readTimeTimeout);
            window.readTimeTimeout = setTimeout(runReadTime, 500); 
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }
}

async function runReadTime() {
    // console.log('ReadTime: Scanning...');
    const detector = new ArticleDetector();
    
    // If we already have a badge, maybe update it? 
    // For now, let's just ensure we create it if missing, or update if content changed significantly?
    // Simplest: Check if article exists.
    
    if (detector.isArticlePage()) {
        const badge = new ReadTimeBadge(); // Is a singleton wrapper basically?
        // Actually ReadTimeBadge class creates a new element every time if we aren't careful.
        // Let's look at ReadTimeBadge class. It has `if (this.badge) return;` but `this` is a new instance.
        // We need a singleton or the class needs to check DOM.
        
        // Let's rely on checking DOM for .readtime-badge first
        if (document.querySelector('.readtime-badge')) {
            // Already exists. Maybe update?
            return; 
        }

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

        const content = detector.extractMainContent();
        const wordCount = countWords(content);
        const readingTime = estimateReadingTime(wordCount, settings.readingSpeed);
        
        if (settings.showBadge) {
             const b = new ReadTimeBadge();
             b.create();
             b.show(readingTime);
        }
    
        if (settings.showProgressBar) {
            const p = new ProgressTracker();
            // Pass the article element if available
            p.init(detector.contentElement);
        }

        // Resume logic...
        if (settings.showResumeNotification) {
             const savedPosition = await StorageManager.getPosition(window.location.href);
             if (savedPosition && savedPosition.progress > 10 && savedPosition.progress < 95) {
                 const resume = new ResumeNotification(savedPosition);
                 resume.show();
             }
        }

        // Save on unload - This duplicates listeners if run multiple times.
        // Ideally we should set this up once.
        setupSaveListener(settings, readingTime, wordCount, detector.contentElement);
    }
}

function setupSaveListener(settings, readingTime, wordCount, trackElement = null) {
    if (saveListenerAdded) return;
    
    const saveProgress = () => {
         let currentProgress = calculateCurrentProgress(trackElement);
         
         if (currentProgress > 5) {
             const isCompleted = currentProgress >= 90; // Ease completion rule

             StorageManager.savePosition({
                 url: window.location.href,
                 title: document.title,
                 domain: window.location.hostname,
                 scrollPosition: window.scrollY,
                 progress: currentProgress,
                 timestamp: Date.now(),
                 completed: isCompleted,
                 readingTime: readingTime,
                 wordCount: wordCount
             });
         }
    };

    // Save periodically (every 5 seconds)
    setInterval(saveProgress, 5000);

    // Also save on unload (fallback)
    window.addEventListener('beforeunload', saveProgress);
    
    saveListenerAdded = true;
}

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initApp());
} else {
  initApp();
}
