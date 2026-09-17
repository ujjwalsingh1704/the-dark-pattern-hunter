# 🕵️ Dark Pattern Hunter — Autonomous UX Auditor

[![Next.js 14](https://img.shields.io/badge/Next.js-14_App_Router-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Playwright](https://img.shields.io/badge/Playwright-Stealth_Browser-green?style=for-the-badge&logo=playwright)](https://playwright.dev/)
[![Solari SDK](https://img.shields.io/badge/Solari_SDK-Active_Stealth-purple?style=for-the-badge)](https://getsolari.com)
[![Multi-LLM](https://img.shields.io/badge/AI_Engine-Tavily_%7C_Claude_%7C_OpenAI_%7C_Gemini_%7C_Groq-blue?style=for-the-badge)](https://tavily.com)
[![License](https://img.shields.io/badge/License-MIT-orange?style=for-the-badge)](LICENSE)

> An **Autonomous AI UX Auditor** that navigates real web applications, compares **Signup vs. Cancellation** flow complexity, and detects manipulative UX patterns with full-page screenshot evidence.

---

## 🌟 Key Highlights

- 🧠 **Autonomous Multi-LLM Agent:** Uses AI models (**Tavily AI**, **Claude 3.5**, **GPT-4o-mini**, **Gemini**, or **Groq Llama 3.3**) to navigate web forms and multi-step UI flows.
- 🕵️ **Stealth Browser Engine:** Powered by `@solarisdk/browser` and Playwright with hardware-level mouse pointer events, automated popup auto-dismissal, and dynamic SPA state tracking.
- 🔍 **6 Core Dark Pattern Detectors:** Heuristic inspection engine identifying **False Urgency**, **Confirm Shaming**, **Preselected Options**, **Hidden Fees**, **Forced Continuity**, and **Flow Asymmetry**.
- 📊 **UX Risk & Health Score (0–100):** Real-time health scoring system with clear severity deductions and intuitive color coding:
  - 🟢 **75 – 100:** Clean / Transparent UX
  - 🟡 **50 – 74:** Medium Risk
  - 🔴 **0 – 49:** High Risk / Deceptive UX
- 📸 **Visual Receipt Evidence:** Captures full-page screenshots for every step taken during signup and cancellation exploration.
- 🎮 **Interactive Cyber-Dark UI:** Built-in **Dark Pattern Quiz**, **Interactive Risk Estimator**, and **Automated Re-audit Subscription Alerts**.

---

## 📐 System Architecture

```mermaid
flowchart TD
    User([👤 User]) -->|Submits Target URL| WebUI[💻 Next.js Cyber-Dark UI]
    WebUI -->|Triggers Audit API| Agent[🤖 Autonomous Agent Engine]
    
    subgraph Browser & AI Loop
        Agent -->|State & Interactive Elements| LLM[🧠 Multi-LLM Navigator\nTavily | Claude | OpenAI | Gemini | Groq]
        LLM -->|Decision: Click / Form / Finish| Agent
        Agent -->|Hardware Mouse Events & Nav| StealthBrowser[🌐 Solari Stealth Browser]
        StealthBrowser -->|Page State Snapshot & Screenshots| Agent
    end
    
    Agent -->|DOM Evaluation| Detector[🔍 Dark Pattern Detector Engine\nlib/checks.js]
    Detector -->|Audit Findings & Penalty Deductions| Report[📊 Audit Report Builder\nlib/report.js]
    Report -->|JSON Data + Screenshots| Storage[(📁 data/audits.json)]
    Storage -->|Renders Live Findings| WebUI
```

---

## 🔍 Dark Pattern Detection Matrix

| Pattern Type | Kind | Detection Method | Penalty |
| :--- | :--- | :--- | :--- |
| ⏳ **False Urgency** | `false_urgency` | Scans for active countdown timers, artificial stock scarcity (`only 2 left!`), and high-demand popups. | -15 pts |
| 😔 **Confirm Shaming** | `confirm_shaming` | Identifies guilt-inducing decline button copy (e.g., *"No thanks, I hate saving money"*). | -15 pts |
| 🔘 **Preselected Options** | `preselected_addon` | Detects pre-checked opt-in checkboxes for add-on insurance, newsletters, or third-party cookies. | -15 pts |
| 💳 **Hidden Fees** | `hidden_fee` | Catches undisclosed service surcharges or delivery fees appearing unexpectedly at final steps. | -25 pts |
| 🔄 **Forced Continuity** | `forced_continuity` | Identifies free trials that automatically transition into recurring billing without explicit warning. | -25 pts |
| 🚪 **Flow Asymmetry** | `flow_asymmetry` | Compares step complexity between joining vs. leaving (e.g., 2-step signup vs. blocked/hidden cancellation). | -25 pts |

---

## 🛠️ Stack & Technology

- **Frontend & Backend:** [Next.js 14](https://nextjs.org/) (App Router, React 18, Server Actions)
- **Browser Steerability:** Playwright + [@solarisdk/browser](https://getsolari.com)
- **AI / LLM Integration:** Tavily Search AI, Anthropic Claude, OpenAI, Google Gemini, Groq
- **Styling:** Vanilla CSS & Tailwind CSS (Cyber-Dark Aesthetic)
- **Data Store:** File-based JSON Database (`data/audits.json`)

---

## ⚡ Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/ujjwalsingh1704/THE-DARK-PATTERN-HUNTER.git
cd THE-DARK-PATTERN-HUNTER
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env.local` file in the root directory:
```env
# Stealth Browser API Key (get one at console.getsolari.com)
SOLARI_API_KEY=slr_live_your_key_here

# Enable AI LLM Navigation Mode
ENABLE_LLM=true

# AI Provider Credentials (Tavily, Anthropic, OpenAI, Gemini, or Groq)
TAVILY_API_KEY=tvly-dev-your_key_here
OPENAI_API_KEY=sk-proj-your_key_here
ANTHROPIC_API_KEY=sk-ant-your_key_here
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📊 UX Health Score Scale

```
 🟢 75 ─────────── 100  : Low Risk (Clean & Transparent UX)
 🟡 50 ─────────── 74   : Medium Risk (Subtle Manipulative UI)
 🔴  0 ─────────── 49   : High Risk (Deceptive Patterns & Hard Cancellation)
```

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
