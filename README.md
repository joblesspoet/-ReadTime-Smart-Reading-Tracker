# ReadTime - Smart Reading Tracker

> A Chrome extension that helps you track reading time, save progress, and never lose your place in articles.

---

## 📖 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

**ReadTime** is a Chrome extension designed to enhance your reading experience by:
- Automatically calculating reading time for any article
- Tracking your reading progress in real-time
- Saving your position so you can resume later
- Maintaining a history of everything you've read

---

![ReadTime Demo](assets/demo-screenshot.png)

## ✨ Features

### MVP Features (v1.0.0)

#### 1. **Reading Time Calculator**
- Automatically detects articles on web pages
- Calculates estimated reading time based on word count
- Displays a clean, non-intrusive badge with "X min read"

#### 2. **Visual Progress Tracker**
- Thin progress bar at the top of the page
- Real-time updates as you scroll

#### 3. **Resume Reading**
- Automatically saves your position when you leave a page
- "Continue from X%" notification when you return

#### 4. **Reading History Dashboard**
- View all articles you've read
- See currently reading vs. completed articles

---

## 💻 Development Setup

### Prerequisites

- **Chrome Browser** (latest version)
- **Node.js** (optional)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/joblesspoet/-ReadTime-Smart-Reading-Tracker.git
   cd ReadTime-Smart-Reading-Tracker
   ```

2. **Load in Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the project folder

---

## 📁 Project Structure

```
readtime-extension/
│
├── manifest.json                 # Extension configuration
├── src/
│   ├── background/               # Background scripts
│   ├── content/                  # Content scripts
│   ├── popup/                    # Extension popup
│   ├── options/                  # Settings page
│   └── utils/                    # Shared utilities
│
└── icons/                        # Extension icons
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
