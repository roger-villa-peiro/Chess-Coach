# ♟️ ChessCoach | Vibe Coding Showcase

> **AI-Powered Chess Study Suite** — Built rapidly through **Vibe Coding** (AI-assisted development) to demonstrate advanced prompt engineering, multi-agent orchestration, and rapid prototyping capabilities.

This project is a comprehensive training platform for chess players, combining traditional study methods with cutting-edge AI coaching. It was developed as a technical showcase to demonstrate how modern AI tools can be orchestrated to build a feature-rich, production-ready application in record time.

---

## 🚀 Why This Project? (The Vibe Coding Approach)

This application was built to highlight key competencies in AI-assisted development:
- **Rapid Prototyping:** Moving from concept to a complex, multi-feature application quickly and iteratively.
- **Agentic AI Integration:** Featuring an AI Coach with "Agent Memory" that analyzes your games and training data to give personalized advice.
- **Full-Stack Orchestration:** Integrating with Supabase for data sync and Lichess for puzzle fetching and OAuth.
- **UX/UI Design:** A dark, sleek "elevated glass" interface designed for focus and aesthetic appeal.

---

## ✨ Core Features

| Feature | Description |
|---------|-------------|
| **🧠 AI Coach (GM Caissa)** | An AI assistant powered by Gemini and agent graphs. It reads your recent sessions, blunders, and games to provide tailored tactical advice. |
| **📊 Analytics & Dashboard** | Track your training volume, success rates, and daily streaks to maintain discipline. |
| **🎯 Lichess Exercises** | Pulls puzzles directly from Lichess via API/OAuth to train specific themes. |
| **📚 Yusupov Method** | A structured training module based on the famous training method by Artur Yusupov. |
| **💀 Blunder Dungeon** | A specialized area to review and resolve your past tactical mistakes (blunders) so you don't repeat them. |
| **🔑 Local API Key Management** | **Privacy First:** Users bring their own Gemini API key and Lichess PAT. Keys are stored locally and never exposed. |

---

## 🛠 Tech Stack

- **Framework:** [Vite](https://vite.dev/) + React
- **Language:** TypeScript
- **AI Integration:** [Google Gemini API](https://ai.google.dev/)
- **Backend/Database:** [Supabase](https://supabase.com/) for data persistence
- **Styling:** Tailwind CSS with a custom glassmorphism design system
- **Icons:** Lucide React

---

## 🚀 Quick Start (Run Locally)

### Prerequisites

- Node.js 18+
- A free [Gemini API key](https://aistudio.google.com/apikey)
- (Optional) A [Lichess Personal Access Token](https://lichess.org/account/oauth/token)

### Setup Instructions

```bash
# 1. Clone the repository
git clone https://github.com/roger-villa-peiro/Chess-Coach.git
cd ChessCoach

# 2. Install dependencies
npm install

# 3. Setup Environment Variables
cp .env.example .env
# (Optional) Add your keys to .env or add them directly in the app UI.

# 4. Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).
**Note:** To use the AI features, click the Settings icon in the **AI Coach** tab and paste your Google API Key.

---

## 🔒 Privacy & Security

- **Bring Your Own Key (BYOK):** Your API keys are stored only in your browser's `localStorage` or local `.env`.
- **Direct API Calls:** AI requests go directly to Google's Gemini API.
- **Secure Storage:** Sensitive data is never committed to the repository.

---

## 📄 License

This project is open-source and available under the MIT License.
