# 🧠 Agent Skills Collection

[🇺🇸 English](README.md) / [🇨🇳 中文](README_zh.md)

<div align="center">

**Your personal AI Agent Skills management hub — One collection, all your coding assistants.**

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite)](https://vite.dev/)
[![Express](https://img.shields.io/badge/Express-4.18-000000?style=flat-square&logo=express)](https://expressjs.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3FCF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

</div>

---

## 💡 Why This Project?

Modern developers often juggle multiple AI-powered coding assistants — Claude Code, Cursor, Windsurf, Antigravity, and more. Each tool requires its own Skills configuration, leading to:

- **Fragmented management**: Skills scattered across different tools with no unified view
- **Repetitive setup**: Configuring the same Skills repeatedly for each new tool
- **Token waste**: Accumulating too many Skills without proper curation bloats context and wastes tokens

**Agent Skills Collection** solves this by providing a centralized, web-based hub to manage all your AI Agent Skills in one place. Curate once, export anywhere.

---

## 📑 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
- [Configuration](#-configuration)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

### 📂 Skill Management

- **Upload & Organize** — Import `.md` files or `.zip` packages directly
- **GitHub Import** — Import Skills directly from any GitHub repository
- **Manual Creation** — Author Skills with built-in Markdown editor
- **Smart Search** — Full-text search across all your Skills

### 🏷️ Intelligent Tagging

- **LLM Auto-Tagging** — Automatically generate category tags using AI (OpenAI / Anthropic / Google)
- **Tag Filtering** — Quick navigation via sidebar tag cloud
- **Manual Tags** — Add custom tags for personal organization

### ⭐ Curation Tools

- **Star System** — Bookmark your favorite Skills for quick access
- **Batch Operations** — Select multiple Skills for export or deletion
- **Trash & Recovery** — 30-day trash bin with auto-cleanup

### 📤 Export Ready

- **One-Click Export** — Download selected Skills as `.zip` for any coding assistant
- **Portable Format** — Standard Markdown format works everywhere

### 🎨 Enhanced UX

- **Loading Animations** — Visual progress feedback for import/upload operations
- **Finder-style Explorer** — Navigate Skill file structures with familiar UI

---

## 🛠️ Tech Stack

### Frontend

[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7.2-646CFF?style=flat-square&logo=vite)](https://vite.dev/)
[![React Router](https://img.shields.io/badge/React_Router-7-CA4245?style=flat-square&logo=reactrouter)](https://reactrouter.com/)
[![React Markdown](https://img.shields.io/badge/React_Markdown-10-000000?style=flat-square)](https://github.com/remarkjs/react-markdown)
[![Highlight.js](https://img.shields.io/badge/Highlight.js-11-F7DF1E?style=flat-square)](https://highlightjs.org/)

### Backend

[![Express](https://img.shields.io/badge/Express-4.18-000000?style=flat-square&logo=express)](https://expressjs.com/)
[![Supabase](https://img.shields.io/badge/Supabase-2.90-3FCF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Node Cron](https://img.shields.io/badge/Node_Cron-3-339933?style=flat-square&logo=nodedotjs)](https://github.com/node-cron/node-cron)
[![Multer](https://img.shields.io/badge/Multer-1.4-FF6600?style=flat-square)](https://github.com/expressjs/multer)

---

## 🏗️ Project Structure

```
📦 Agent Skills Collection
├── 📂 client/                 # Frontend (React + Vite)
│   ├── 📂 src/
│   │   ├── 📂 components/     # UI Components
│   │   │   ├── 📂 common/     # Shared components (SearchBar, Modal, etc.)
│   │   │   ├── 📂 layout/     # Header, Sidebar
│   │   │   ├── 📂 skills/     # Skill-specific components
│   │   │   └── 📂 files/      # File explorer
│   │   ├── 📂 pages/          # Route pages
│   │   ├── 📂 hooks/          # Custom React hooks
│   │   ├── 📂 services/       # API client
│   │   └── 📂 styles/         # Global styles
│   └── 📄 vite.config.js
│
├── 📂 server/                 # Backend (Express)
│   ├── 📂 src/
│   │   ├── 📂 routes/         # API endpoints
│   │   ├── 📂 services/       # Business logic
│   │   │   ├── 📄 llmService.js        # LLM tag generation
│   │   │   ├── 📄 supabaseSkillService.js
│   │   │   └── 📄 trashService.js
│   │   └── 📂 config/         # Supabase config
│   └── 📂 data/               # Local data storage
│
└── 📄 package.json            # Root scripts
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+
- **npm** or **pnpm**
- **Supabase** account (for database)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/agent-skills-collection.git
cd agent-skills-collection

# Install all dependencies
npm run install:all

# Configure environment
cp .env.example .env
# Edit .env with your Supabase and LLM credentials

# Start development servers
npm run dev
```

The app will be available at `http://localhost:5173` (frontend) and `http://localhost:8080` (API).

### Environment Variables

```bash
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key

# LLM Auto-Tagging (Optional)
LLM_BASE_URL=https://api.anthropic.com  # or openai/google
LLM_API_KEY=your_api_key
LLM_MODEL=claude-3-haiku-20240307

# Admin
ADMIN_EMAIL=your_email@example.com
```

---

## 🗺️ Roadmap

- [x] Core Skill management (upload, view, delete)
- [x] LLM-powered auto-tagging
- [x] Tag filtering & search
- [x] Star & batch operations
- [x] Trash bin with auto-cleanup
- [x] Supabase backend integration
- [x] 🔄 Import from GitHub repos
- [ ] 🔐 User authentication & login
- [ ] 🌐 Cloud deployment (Vercel)
- [ ] 📱 Mobile-responsive design

---

## 📝 Changelog

### v1.1.0 (2026-01)

- ✨ **GitHub Import** — Import Skills directly from any GitHub repository with automatic file filtering
- ✨ **Loading Animations** — Circular progress indicator for uploads, step-based progress for GitHub imports
- ✨ **Enhanced Upload** — Real-time progress tracking for file uploads
- 🐛 **Trash Display** — Fixed issues with trash page item display
- 🐛 **Tag Updates** — Fixed tag saving on Skill detail page
- 🔧 **File Explorer** — Improved breadcrumb navigation and preview modal

### v1.0.0 (2026-01)

- 🎉 Initial release with core Skill management
- ✨ Supabase backend integration
- ✨ LLM auto-tagging with multi-provider support
- ✨ Finder-style file explorer

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Crafted for developers who value their AI coding companions**

> "One collection to rule them all, one hub to find them,  
> One click to export them all, and in the workflow bind them."

[🐛 Report Bug](https://github.com/yourusername/agent-skills-collection/issues) · [✨ Request Feature](https://github.com/yourusername/agent-skills-collection/issues)

</div>
