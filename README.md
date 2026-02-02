# 🚨 WarRoom: The Incident Commander ("God Mode")

> **"When production is burning, don't search for dashboards. WarRoom builds them for you, in real-time."**

![WarRoom Demo](/public/screenshot-1.png)

## 🏆 Hackathon Submission: "The UI Strikes Back"

**WarRoom** is a next-generation incident management console that uses **Generative UI** + **Supabase Realtime** to radically reduce Mean Time To Resolution (MTTR).

It is not just a dashboard; it is a **Multiplayer Crisis Center**.

---

## 🌟 Key Features (God Mode)

### 1. ⚡ Real-Time Multiplayer Sync

Powered by **Supabase Realtime**.

- Open the app in multiple windows/devices.
- Actions taken by one SRE (`rollback`, `scale`) are instantly reflected for everyone.
- The **Incident Timeline** streams events live as they happen.

### 2. 🧠 "Magical" Incident Detection

The AI doesn't just chat; it **acts**.

- **User:** _"Payment API is 500-ing!"_
- **System:**
  1.  Analyzes intent via Server Actions (`src/app/actions.ts`).
  2.  **Writes to DB:** Creates a `CRITICAL` incident row in Supabase.
  3.  **Triggers Alert:** The UI instantly turns **RED** for all connected users.

### 3. 🌙 Dark Mode & Glassmorphism

- Full support for **Light**, **Dark**, and **System** themes.
- Beautiful, accessible UI built with Tailwind CSS and Framer Motion.

### 4. 🤖 AI Post-Mortems

- Upon recovery, the system automatically generates a **Post-Mortem Report**.
- Summarizes the timeline, root cause, and remediation steps.

---

## 🚀 Quick Start

### 1. Setup Supabase

1.  Create a Supabase project.
2.  Run the SQL migration in `supabase/migrations/001_warroom_schema.sql` to create:
    - `services`, `incidents`, `incident_events`, `metrics`, `logs` tables.
3.  Add `.env.local`:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=...
    NEXT_PUBLIC_SUPABASE_ANON_KEY=...
    ```

### 2. Run the App

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 3. The "Winning Demo" Flow

1.  **Open 2 Browser Windows** (Simulate SRE 1 and SRE 2).
2.  **SRE 1:** Type **"Checkout is failing with 500 errors"**.
3.  **Witness Magic:**
    - Both screens turn **RED**.
    - New Incident "Payment API Failure" appears.
    - Timeline updates: "Incident Detected".
4.  **SRE 2:** Click **"Rollback"** in the Action Panel.
5.  **Recovery:**
    - Both screens turn **GREEN**.
    - AI Post-Mortem card appears in the timeline.

---

## 🛠️ Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Backend:** Supabase (Postgres + Realtime)
- **AI Logic:** Custom Server Actions
- **Styling:** Tailwind CSS + Framer Motion
- **Components:** Shadcn UI + Recharts

## 📂 Project Structure

```bash
├── src/
│   ├── app/
│   │   ├── page.tsx             # Main "War Room" Dashboard
│   │   └── actions.ts           # Server Actions (AI Logic)
│   ├── components/warroom/      # Generative Widgets (Timeline, Graphs)
│   ├── lib/
│   │   ├── incident-detector.ts # Realtime Detection Logic
│   │   ├── supabase/            # Server Client
│   │   └── incident-analyzer.ts # Types & Config
│   └── components/ThemeToggle.tsx
├── supabase/
│   └── migrations/              # SQL Schema
└── public/
```

---

> Built with ❤️ for the Tambo Hackathon.
