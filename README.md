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

## 📐 System Architecture & Data Flow

```mermaid
flowchart TB
    subgraph UI_Layer["💻 CLIENT & INTERFACE LAYER"]
        User([👤 User / Auditor]) -->|"1. Submit Target URL"| WebApp["💻 Next.js Cyber-Dark Dashboard<br/>(App Router & Server Actions)"]
        WebApp -->|"8. Render Live Audit Report & Visual Evidence"| User
    end

    subgraph Orchestration_Layer["🤖 AUTONOMOUS AGENT ORCHESTRATOR"]
        WebApp -->|"2. Trigger Audit Session"| AgentCore["⚙️ Autonomous Agent Loop<br/>(lib/agent.js)"]
        AgentCore -->|"3. Extract Interactive DOM Elements"| ElementMap["🗺️ Element Resolution Map<br/>(Target ID ➔ Interactive Node)"]
    end

    subgraph AI_Intelligence_Layer["🧠 AI DECISION & LLM CASCADE"]
        ElementMap -->|"4. Prompt Payload"| LLMProvider{"🧠 Multi-Provider LLM Cascade<br/>(lib/llm.js)"}
        LLMProvider -->|"Tier 1"| Tavily["🔍 Tavily AI"]
        LLMProvider -->|"Tier 2"| Claude["⚡ Anthropic Claude 3.5"]
        LLMProvider -->|"Tier 3"| OpenAI["🟢 OpenAI GPT-4o"]
        LLMProvider -->|"Tier 4"| Gemini["✨ Google Gemini 2.0"]
        LLMProvider -->|"Tier 5"| Groq["🚀 Groq Llama 3.3"]
        LLMProvider -->|"Tier 6 Fallback"| Deterministic["🛡️ Deterministic Heuristic Engine"]
        LLMProvider -->|"5. Action Decision (Click / Form / Finish)"| AgentCore
    end

    subgraph Execution_Layer["🌐 STEALTH BROWSER AUTOMATION"]
        AgentCore -->|"6. Real Hardware Pointer Clicks & Form Fill"| StealthEngine["🕵️ Stealth Browser Engine<br/>(@solarisdk/browser + Playwright)"]
        StealthEngine -->|"Auto-Dismiss"| Popups["🚫 Modal & Vision Mode Overlay Handler"]
        StealthEngine -->|"Full-Page Snapshots & State"| Screenshots["📸 Screenshot & Step Recorder"]
    end

    subgraph Analytics_Layer["🔍 AUDIT & SCORING PIPELINE"]
        Screenshots -->|"DOM Snapshots"| DetectionEngine["🔍 Dark Pattern Detector Engine<br/>(lib/checks.js)"]
        DetectionEngine -->|"Calculates Penalties & Asymmetry"| ReportBuilder["📊 Audit Report Generator<br/>(lib/report.js)"]
        ReportBuilder -->|"7. Save Findings & Evidence"| JSONStore[("📁 Persistent JSON Store<br/>data/audits.json")]
        JSONStore -->|"Fetch Audit Results"| WebApp
    end

    classDef ui fill:#0f172a,stroke:#38bdf8,stroke-width:2px,color:#f8fafc;
    classDef agent fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#f8fafc;
    classDef ai fill:#14532d,stroke:#4ade80,stroke-width:2px,color:#f8fafc;
    classDef browser fill:#701a75,stroke:#f0abfc,stroke-width:2px,color:#f8fafc;
    classDef analytics fill:#7c2d12,stroke:#fb923c,stroke-width:2px,color:#f8fafc;

    class WebApp,User ui;
    class AgentCore,ElementMap agent;
    class LLMProvider,Tavily,Claude,OpenAI,Gemini,Groq,Deterministic ai;
    class StealthEngine,Popups,Screenshots browser;
    class DetectionEngine,ReportBuilder,JSONStore analytics;
```

### ⚙️ Component Responsibilities

| Subsystem | Module | Key Responsibility |
| :--- | :--- | :--- |
| **Agent Orchestrator** | `lib/agent.js` | Manages the dual-flow exploration loop (**Signup Flow ➔ Reset ➔ Cancellation Flow**), element map generation, and state transition validation. |
| **Multi-LLM Resiliency** | `lib/llm.js` | Executes a **zero-downtime cascade** across 5 AI providers with resilient JSON response parsing, prompt truncation (<300 chars), and heuristic fallbacks. |
| **Stealth Browser Engine** | `lib/solari-agent.js` | Emulates real human hardware mouse coordinates `(cx, cy)`, handles popups/modals automatically, and records step-by-step full-page screenshots. |
| **Detection & Scoring** | `lib/checks.js` | Runs 6 deterministic heuristics against DOM snapshots, deducting severity penalties (High `-25`, Medium `-15`) to generate the **0–100 UX Health Score**. |
| **Report Builder** | `lib/report.js` | Consolidates audit findings, deduplicates flagged patterns, calculates flow step asymmetry, and formats audit evidence for the frontend. |

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
