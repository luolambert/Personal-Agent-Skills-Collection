# 🧠 Agent Skills Collection

[🇺🇸 English](README.md) / [🇨🇳 中文](README_zh.md)

<div align="center">

**你的个人 AI Agent Skills 管理中枢 —— 一处收藏，全局可用**

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite)](https://vite.dev/)
[![Express](https://img.shields.io/badge/Express-4.18-000000?style=flat-square&logo=express)](https://expressjs.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3FCF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

</div>

---

## 💡 开发初衷

作为一名热衷于尝试新工具的开发者，你可能同时在使用多款 AI 编程助手 —— Claude Code、Cursor、Windsurf、Antigravity……每款工具都需要单独配置 Skills，这带来了几个痛点：

- **管理碎片化**：Skills 分散在各个工具中，没有统一的视图
- **重复配置**：每换一个工具就要重新配置一遍相同的 Skills
- **Token 浪费**：Skills 越加越多，却缺乏梳理，导致上下文膨胀、Token 消耗激增

**Agent Skills Collection** 的诞生就是为了解决这些问题 —— 一个集中式的 Web 管理平台，让你在一处统一管理所有 AI Agent Skills。精心策展一次，随处导出使用。

---

## 📑 目录

- [核心特性](#-核心特性)
- [技术栈](#️-技术栈)
- [项目结构](#️-项目结构)
- [快速开始](#-快速开始)
- [环境配置](#-环境配置)
- [开发路线](#️-开发路线)
- [参与贡献](#-参与贡献)
- [开源协议](#-开源协议)

---

## ✨ 核心特性

### 📂 Skill 管理

- **上传与整理** —— 直接导入 `.md` 文件或 `.zip` 压缩包
- **在线创作** —— 内置 Markdown 编辑器，随时撰写新 Skill
- **智能搜索** —— 全文检索所有 Skills

### 🏷️ 智能标签

- **LLM 自动打标** —— 使用 AI 自动生成分类标签（支持 OpenAI / Anthropic / Google）
- **标签筛选** —— 侧边栏标签云，一键过滤
- **自定义标签** —— 支持手动添加个人标签

### ⭐ 策展工具

- **收藏系统** —— 星标常用 Skills，快速访问
- **批量操作** —— 多选导出或删除
- **回收站** —— 30 天回收站，自动清理

### 📤 一键导出

- **打包下载** —— 选中的 Skills 一键导出为 `.zip`
- **标准格式** —— Markdown 格式，适配所有编程助手

---

## 🛠️ 技术栈

### 前端

[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7.2-646CFF?style=flat-square&logo=vite)](https://vite.dev/)
[![React Router](https://img.shields.io/badge/React_Router-7-CA4245?style=flat-square&logo=reactrouter)](https://reactrouter.com/)
[![React Markdown](https://img.shields.io/badge/React_Markdown-10-000000?style=flat-square)](https://github.com/remarkjs/react-markdown)
[![Highlight.js](https://img.shields.io/badge/Highlight.js-11-F7DF1E?style=flat-square)](https://highlightjs.org/)

### 后端

[![Express](https://img.shields.io/badge/Express-4.18-000000?style=flat-square&logo=express)](https://expressjs.com/)
[![Supabase](https://img.shields.io/badge/Supabase-2.90-3FCF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Node Cron](https://img.shields.io/badge/Node_Cron-3-339933?style=flat-square&logo=nodedotjs)](https://github.com/node-cron/node-cron)
[![Multer](https://img.shields.io/badge/Multer-1.4-FF6600?style=flat-square)](https://github.com/expressjs/multer)

---

## 🏗️ 项目结构

```
📦 Agent Skills Collection
├── 📂 client/                 # 前端 (React + Vite)
│   ├── 📂 src/
│   │   ├── 📂 components/     # UI 组件
│   │   │   ├── 📂 common/     # 通用组件 (SearchBar, Modal 等)
│   │   │   ├── 📂 layout/     # 布局组件 (Header, Sidebar)
│   │   │   ├── 📂 skills/     # Skill 相关组件
│   │   │   └── 📂 files/      # 文件浏览器
│   │   ├── 📂 pages/          # 页面路由
│   │   ├── 📂 hooks/          # 自定义 Hooks
│   │   ├── 📂 services/       # API 客户端
│   │   └── 📂 styles/         # 全局样式
│   └── 📄 vite.config.js
│
├── 📂 server/                 # 后端 (Express)
│   ├── 📂 src/
│   │   ├── 📂 routes/         # API 路由
│   │   ├── 📂 services/       # 业务逻辑
│   │   │   ├── 📄 llmService.js        # LLM 标签生成
│   │   │   ├── 📄 supabaseSkillService.js
│   │   │   └── 📄 trashService.js
│   │   └── 📂 config/         # Supabase 配置
│   └── 📂 data/               # 本地数据存储
│
└── 📄 package.json            # 根目录脚本
```

---

## 🚀 快速开始

### 环境要求

- **Node.js** 18+
- **npm** 或 **pnpm**
- **Supabase** 账号（用于数据库）

### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/yourusername/agent-skills-collection.git
cd agent-skills-collection

# 安装所有依赖
npm run install:all

# 配置环境变量
cp .env.example .env
# 编辑 .env，填入你的 Supabase 和 LLM 凭证

# 启动开发服务器
npm run dev
```

启动后访问 `http://localhost:5173`（前端）和 `http://localhost:8080`（API）。

---

## ⚙️ 环境配置

```bash
# Supabase 配置
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key

# LLM 自动打标（可选）
LLM_BASE_URL=https://api.anthropic.com  # 或 openai/google
LLM_API_KEY=your_api_key
LLM_MODEL=claude-3-haiku-20240307

# 管理员
ADMIN_EMAIL=your_email@example.com
```

---

## 🗺️ 开发路线

- [x] 核心 Skill 管理（上传、查看、删除）
- [x] LLM 智能标签生成
- [x] 标签筛选与搜索
- [x] 收藏与批量操作
- [x] 回收站自动清理
- [x] Supabase 后端集成
- [ ] 🔐 用户认证与登录
- [ ] 🌐 云端部署（Vercel）
- [ ] 📱 移动端响应式适配
- [ ] 🔄 从 GitHub 仓库导入

---

## 🤝 参与贡献

欢迎提交 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 发起 Pull Request

---

## 📄 开源协议

本项目基于 **MIT 协议** 开源 —— 详见 [LICENSE](LICENSE) 文件。

---

<div align="center">

**为珍视 AI 编程伙伴的开发者精心打造**

> "一处收藏统管所有，一个中枢尽揽无余，  
> 一键导出随处可用，融入工作流畅无阻。"

[🐛 报告问题](https://github.com/yourusername/agent-skills-collection/issues) · [✨ 功能建议](https://github.com/yourusername/agent-skills-collection/issues)

</div>
