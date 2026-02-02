# 🚨 WarRoom: The Incident Commander ("God Mode")

> **"When production is burning, don't search for dashboards. WarRoom builds them for you, in real-time."**

![WarRoom Demo](/public/screenshot-1.png)

## 🏆 Tambo Hackathon Submission: "The UI Strikes Back"

**WarRoom** is a next-generation incident management console that uses **Generative UI** + **Supabase Realtime** to radically reduce Mean Time To Resolution (MTTR).

It transforms the traditional static dashboard into a **Multiplayer Crisis Center** where the UI adapts to the incident at hand.

---

## 🌟 Key Features

### 1. ⚡ Real-Time Multiplayer Sync

**Powered by Supabase Realtime**

- **Instant Propagation**: Actions taken by one SRE (`rollback`, `scale`, `restart`) are instantly reflected for all connected users via WebSockets.
- **Live Timeline**: The **Incident Timeline** streams events, chat, and system logs live as they happen.
- **Presence**: See who is online and what they are doing (simulated).

### 2. 🧠 "Magical" Incident Detection

The AI doesn't just chat; it **acts**.

- **Natural Language Parsing**: Type _"Payment API is 500-ing!"_ and the system understands the service, severity, and intent.
- **Automated Incident Creation**:
  1.  Analyzes intent via Server Actions (`src/app/actions.ts`).
  2.  **Writes to DB**: Creates a `CRITICAL` incident row in Supabase strategies.
  3.  **Triggers Alert**: The UI instantly turns **RED** (`ALERT` state) for all connected users.

### 3. 🛡️ Generative Remediation

- **Context-Aware Actions**: The AI suggests specific buttons based on the incident type (e.g., "Rollback" for bad deploys, "Scale Up" for traffic spikes).
- **One-Click Execution**: Complex remedial workflows are abstracted into single clicks.

### 4. 🌙 Dark Mode & Glassmorphism

- **Theme Support**: Seamless switching between Light, Dark, and System themes.
- **Visuals**: Built with Tailwind CSS and Framer Motion for a "scifi-console" aesthetic essential for high-stress environments.

### 5. 🤖 AI Post-Mortems

- **Automated Reporting**: When an incident resolves, the system automatically generates a **Post-Mortem Report**.
- **Insights**: Summarizes the timeline, root cause, and remediation steps to prevent recurrence.

---

## 🏗️ Architecture

The application follows a **Realtime Event-Driven** architecture:

```mermaid
graph TD
    User[User Chat / Interaction] -->|Server Action| AI[Incident Detector (AI)]
    AI -->|Insert/Update| DB[(Supabase Postgres)]

    subgraph Realtime Loop
        DB -->|postgres_changes| Clients[Connected Clients]
        Clients -->|Update Store| UI[Dashboard UI]
    end

    UI -->|Trigger Action| RPC[Supabase RPC]
    RPC -->|UpdateRows| DB
```

- **Frontend**: Next.js 14 (App Router), Framer Motion, Recharts.
- **Backend**: Supabase (Database, Auth, Realtime, RPC Functions).
- **AI Layer**: Generative logic running via Server Actions.

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) Project

### 1. Setup Supabase

1.  Create a fresh Supabase project.
2.  Go to the **SQL Editor** in your Supabase dashboard.
3.  Run the migration file located at `supabase/migrations/001_warroom_schema.sql` to create the schema.
4.  (Optional) Run `supabase/migrations/002_warroom_seed.sql` to seed initial data.

### 2. Configure Environment

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_TAMBO_API_KEY=your_tambo_api_key
```

### 3. Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

---

## 🎭 The "Winning Demo" Flow

To impress judges or stakeholders, follow this script:

1.  **Setup**: Open the app in **two separate browser windows** side-by-side.
2.  **Trigger**: In Window A, type **"Checkout is failing with 500 errors"**.
3.  **Witness Magic**:
    - Both windows turn **RED** instantly.
    - "Payment API Failure" incident appears.
    - Graphs spike up.
4.  **Remediate**: In Window B, click the **"Emergency Rollback"** button.
5.  **Recovery**:
    - System logs show "Rollback initiated".
    - Both windows turn **GREEN** ("RECOVERY" mode).
    - Confetti/Success animations play.
6.  **Simulation**: Click the **"Test: Traffic Surge"** chip to simulate a 500k req/s load test using live data injection.

---

## 📂 Project Structure

```bash
├── src/
│   ├── app/
│   │   ├── page.tsx             # Main Dashboard (Realtime Client)
│   │   └── actions.ts           # Server Actions (AI & DB Logic)
│   ├── components/warroom/      # Generative Widgets
│   │   ├── ActionButton.tsx     # Remediation Buttons
│   │   ├── ErrorGraph.tsx       # Live Metrics Chart
│   │   ├── IncidentTimeline.tsx # Realtime Event Stream
│   │   ├── LogStream.tsx        # Matrix-style Logs
│   │   └── ServiceHealth.tsx    # Status Indicators
│   ├── lib/
│   │   ├── supabase.ts         # Supabase Client & Helpers
│   │   └── incident-detector.ts # AI Logic
├── supabase/
│   └── migrations/              # SQL Schema & Seeds
└── public/
```

---

## 🛠️ Troubleshooting

- **Realtime not working?** Ensure "Realtime" is enabled for your tables (`incidents`, `logs`, `metrics`) in the Supabase Dashboard > Database > Replication.
- **Missing Data?** Check your RLS policies. For this demo, we allow public read/write (not recommended for prod).

---

> Built with ❤️ for the Tambo Hackathon.
