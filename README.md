# CodeSense AI

> AI-powered coding assistant Chrome extension for competitive programming platforms.

CodeSense AI sits in your browser's side panel while you solve problems — analyzing your code, giving hints, generating solutions, showing which companies asked the problem, and a lot more. Works on 10 platforms out of the box.

---

## Features

- **Code Analysis** — Approach breakdown, current vs. expected time & space complexity, readability/quality scores, and targeted suggestions with a one-click **Apply** button that patches your code inline
- **Hints** — Progressive hints that nudge you toward the insight without spoiling the solution
- **Optimal Solution** — Full solution with intuition, approach walkthrough, and complexity analysis in your chosen language
- **Optimize** — Rewrites your existing code to a better complexity with before/after diff
- **Debug** — Pinpoints bugs and explains why they happen
- **Dry Run** — Step-by-step trace through your code with example inputs
- **Edit** — Targeted code edits via natural language ("add edge case for empty input")
- **Mock Interview** — Simulated interview Q&A with scoring and feedback
- **Company Tags** — Real "Asked By" badges from a dataset of 3,365 problems × 700+ companies. Click any company to browse its other problems with **Load More** pagination — no AI guessing
- **Chat** — Contextual chat about the current problem

---

## Supported Platforms

| Platform | URL Pattern |
|---|---|
| LeetCode | `leetcode.com/problems/*` |
| Codeforces | `codeforces.com/problemset/*`, `codeforces.com/contest/*` |
| GeeksForGeeks | `geeksforgeeks.org/problems/*` |
| CodeChef | `codechef.com/problems/*` |
| AtCoder | `atcoder.jp/contests/*/tasks/*` |
| HackerRank | `hackerrank.com/challenges/*` |
| Coding Ninjas | `codingninjas.com/studio/problems/*` |
| Naukri Code360 | `naukri.com/code360/problems/*` |
| InterviewBit | `interviewbit.com/problems/*` |
| CSES | `cses.fi/problemset/task/*` |
| SPOJ | `spoj.com/problems/*` |

---

## AI Providers

Choose between two backends in Settings:

### NVIDIA NIM (default)
Get a free API key at [build.nvidia.com](https://build.nvidia.com)

| Model | Notes |
|---|---|
| `meta/llama-3.3-70b-instruct` | Fast, great for hints & chat |
| `meta/llama-4-maverick-17b-128e-instruct` | Efficient multimodal |
| `nvidia/nemotron-3-ultra-550b-a55b` | Highest quality |
| `nvidia/nemotron-3-super-120b-a12b` | Balanced speed/quality |

### OpenRouter
Get a free API key at [openrouter.ai/keys](https://openrouter.ai/keys) — no credit card required for free models.

**Free models (zero cost):**
- `meta-llama/llama-3.3-70b-instruct:free`
- `nvidia/nemotron-3-ultra-550b-a55b:free`
- `nvidia/nemotron-3-super-120b-a12b:free`
- `qwen/qwen3-coder:free`

**Paid models also supported:** Claude Sonnet 4.6, Claude Opus 4, GPT-4o, GPT-4o mini, o4-mini, Gemini 3.5 Flash, Gemini 3.1 Pro, DeepSeek R1, DeepSeek V3.2, Mistral Large, Qwen3 235B

---

## Installation

### Option A — Pre-built ZIP (recommended, no setup needed)

1. Download **`CodeSense-AI-v1.1.zip`** from [Releases](../../releases)
2. Extract the ZIP to any folder
3. Open Chrome → go to `chrome://extensions`
4. Enable **Developer Mode** (toggle in top-right corner)
5. Click **Load unpacked** → select the extracted folder
6. Open any supported problem page — the extension activates automatically

### Option B — Build from source

**Requirements:** Node.js 18+, pnpm

```bash
git clone https://github.com/YOUR_USERNAME/codesense-ai.git
cd codesense-ai
pnpm install
pnpm build
```

Then load the generated `dist/` folder as an unpacked extension (same steps 3–6 above).

---

## First-time Setup

1. Press `Ctrl+Shift+A` (or click the extension icon) to open the side panel
2. Go to **Settings** tab
3. Choose your AI provider — **NVIDIA NIM** or **OpenRouter**
4. Paste your API key
5. Navigate to any supported problem — the extension detects it automatically and the panel fills in

---

## Project Structure

```
src/
├── background/          Chrome MV3 service worker
├── content/             Content script injected into problem pages
├── platforms/           One parser per platform (leetcode, codeforces, gfg …)
├── services/
│   ├── ai-service.ts    Unified AI client — routes to NVIDIA or OpenRouter
│   ├── nvidia-nim.ts    NVIDIA NIM streaming client
│   ├── openrouter.ts    OpenRouter streaming client
│   └── prompt-engine.ts All AI prompts
├── components/tabs/     AnalysisTab, SolutionTab, HintsTab, DebugTab …
├── sidebar/             Side panel React app
├── popup/               Toolbar popup React app
├── data/
│   └── problems-data.json  3,365 problems × 700+ companies lookup table
├── storage/             Chrome storage wrapper (API keys encrypted at rest)
└── types/               All TypeScript interfaces
```

---

## Changelog

### v1.1.0
- **Real company data** — 3,365 LeetCode problems × 700+ companies sourced from actual interview datasets. No more AI-guessing the same FAANG list for every problem
- **Company problem browser** — click any company badge to see its full problem list, paginated with Load More; each problem links directly to LeetCode
- **Apply suggestions** — each analysis suggestion now has an **Apply** button that generates a targeted code patch inline with a **Copy** button
- **Full complexity display** — Efficiency card always shows Your Code (Time + Space) vs Expected Optimal (Time + Space) side by side, highlighted green when they differ
- **Auto-reload on navigation** — side panel now reloads automatically when navigating between problems in the same tab (via `chrome.tabs.onUpdated`)
- **Default language** changed from Python → C++

### v1.0.0
- Initial release with 10 platform parsers, NVIDIA NIM + OpenRouter support, full AI feature set (analyze, hints, solve, optimize, debug, dry run, edit, mock interview, chat)

---

## Tech Stack

- **React 19** + TypeScript + Tailwind CSS v4
- **Framer Motion** — animations
- **Vite** (popup/sidebar UI) + **esbuild** (content/background scripts)
- **Chrome Extension Manifest V3**
- **pnpm** — package manager

---

## License

MIT
