"use client";

import { useTambo } from "@tambo-ai/react";
import { AnimatePresence, motion } from "framer-motion";
import { Send, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// Components
import { ThemeToggle } from "@/components/ThemeToggle";
import { ActionButton } from "@/components/warroom/ActionButton";
import { ErrorGraph } from "@/components/warroom/ErrorGraph";
import { IncidentTimeline } from "@/components/warroom/IncidentTimeline";
import { LogStream } from "@/components/warroom/LogStream";
import { PostMortem } from "@/components/warroom/PostMortem";
import { ServiceHealth } from "@/components/warroom/ServiceHealth";
import { SlackDraft } from "@/components/warroom/SlackDraft";

// Server Actions
import { submitUserQuery } from "@/app/actions";

// DB Access
import {
  getIncidents,
  initiateRollback,
  subscribeToIncidents,
  unsubscribeAll,
} from "@/lib/supabase";

// Types
import { IncidentAnalysis, WidgetConfig } from "@/lib/incident-analyzer";

type DashboardState = "HEALTHY" | "ALERT" | "RECOVERY";

export default function WarRoomDashboard() {
  const { thread, sendThreadMessage } = useTambo();
  const [status, setStatus] = useState<DashboardState>("HEALTHY");
  const [incident, setIncident] = useState<IncidentAnalysis | null>(null);
  const [input, setInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Timeline events state (managed here for the demo flow)
  const [events, setEvents] = useState<any[]>([]);

  // Refs for scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => {
    scrollToBottom();
  }, [thread?.messages]);

  // --- Realtime Setup ---

  // Helper to map DB incident to UI Analysis object
  const mapDbToAnalysis = (dbIncident: any): IncidentAnalysis => {
    return {
      type: dbIncident.type || "UNKNOWN",
      severity: (dbIncident.severity?.toUpperCase() as any) || "HIGH",
      service: "Payment API", // In a real app we'd join this from service_id
      widgets: [
        {
          componentName: "ErrorGraph",
          reason: "Visualizing spike",
          props: { threshold: 50 },
        },
        {
          componentName: "LogStream",
          reason: "Showing logs",
          props: { serviceFilter: "payment" }, // We could map dbIncident.service_id here
        },
        {
          componentName: "ActionButton",
          reason: "Remediation",
          props: { actions: ["rollback", "restart", "scale_up"] },
        },
        {
          componentName: "SlackDraft",
          reason: "Comms",
          props: {
            channel: "#incidents",
            draftText: `🚨 Incident: ${dbIncident.description || dbIncident.type}`,
          },
        },
      ],
      suggestedActions: ["Check Logs", "Rollback", "Updates Status Page"],
    };
  };

  useEffect(() => {
    // 1. Initial Fetch
    const init = async () => {
      const recents = await getIncidents();
      const active = recents.find((i) => i.status === "active");
      if (active) {
        setIncident(mapDbToAnalysis(active));
        setStatus("ALERT");
      }
    };
    init();

    // 2. Subscribe to Realtime Changes
    subscribeToIncidents((payload) => {
      console.log("Realtime Incident Update:", payload);
      const newRec = payload.new;
      const oldRec = payload.old; // Only available on update if configured, or we infer

      if (payload.eventType === "INSERT") {
        // New Incident!
        setIncident(mapDbToAnalysis(newRec));
        setStatus("ALERT");
      } else if (payload.eventType === "UPDATE") {
        // Status changed?
        if (newRec.status === "resolved") {
          setStatus("RECOVERY");
          // Wait a bit then go healthy
          setTimeout(() => setStatus("HEALTHY"), 8000);
        } else if (newRec.status === "active" && status !== "ALERT") {
          // Re-opened or just late arrival
          setIncident(mapDbToAnalysis(newRec));
          setStatus("ALERT");
        }
      }
    });

    return () => {
      unsubscribeAll();
    };
  }, []);

  // --- Handlers ---

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userQuery = input;
    setInput("");

    // 1. Send to Tambo Chat (for history)
    sendThreadMessage(userQuery);

    // 2. Analyze Intent via Real Supabase Backend
    setIsAnalyzing(true);
    try {
      // Call Server Action -> This triggers DB changes -> Realtime catches it -> UI updates
      const result = await submitUserQuery(userQuery);

      if (!result.success) {
        console.error("Analysis Error:", result.error);
        sendThreadMessage("⚠️ Error analyzing input. Check console.");
      }
      // We do NOT manually setStatus here anymore. Realtime does it.
    } catch (err) {
      console.error("AI Analysis Failed", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleActionComplete = async (action: string) => {
    // Optimistically add event to timeline (local only, for instant feedback)
    // Realtime events will come through IncidentTimeline component separately
    setEvents((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString(),
        type: "action",
        message: `Executed remediation: ${action}`,
        user: "User",
      },
    ]);

    // Perform actual logic
    if (action === "rollback") {
      // Trigger rollback via Supabase RPC helper
      const res = await initiateRollback("payment-service");
      if (res.success) {
        sendThreadMessage("✅ Rollback initiated successfully.");
      } else {
        sendThreadMessage(`❌ Rollback failed: ${res.message}`);
      }
      // We do NOT manually setStatus("RECOVERY"). Realtime does it when DB updates.
    }
  };

  // --- Render Helpers ---

  // Helper to find a specific widget in the AI's suggestion list
  const getWidget = (name: string): WidgetConfig | undefined => {
    return incident?.widgets.find((w) => w.componentName === name);
  };

  // --- Animation Variants ---

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
    exit: { opacity: 0, scale: 0.95 },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 24 },
    },
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#050505] transition-colors duration-1000 selection:bg-emerald-500/30">
      {/* Alert State Backdrop (Subtle) */}
      <AnimatePresence>
        {status === "ALERT" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none z-0"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 via-transparent to-transparent" />
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. Header / Top Bar */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 border-b backdrop-blur-xl ${
          status === "ALERT"
            ? "bg-white/80 dark:bg-black/80 border-red-500/30"
            : "bg-white/80 dark:bg-black/80 border-neutral-200 dark:border-white/10"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {status === "ALERT" ? (
              <div className="flex items-center gap-3">
                <div className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </div>
                <span className="font-bold tracking-widest uppercase text-red-600 dark:text-red-500 text-sm">
                  INCIDENT ACTIVE
                </span>
                <span className="hidden md:inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30">
                  SEV-1
                </span>
              </div>
            ) : status === "RECOVERY" ? (
              <div className="flex items-center gap-2 text-emerald-500">
                <Sparkles className="w-5 h-5" />
                <span className="font-bold tracking-widest uppercase text-sm">
                  Recovery Mode
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-neutral-900 to-neutral-700 dark:from-white dark:to-neutral-300 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                  <span className="text-white dark:text-black font-bold text-sm font-mono">
                    W
                  </span>
                </div>
                <span className="font-bold text-neutral-900 dark:text-white tracking-tight">
                  WarRoom
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-2 text-xs font-mono text-neutral-500 dark:text-neutral-400">
              <div
                className={`w-1.5 h-1.5 rounded-full ${status === "ALERT" ? "bg-red-500 animate-pulse" : "bg-emerald-500"}`}
              />
              {status === "ALERT" ? "SYSTEM UNSTABLE" : "SYSTEM ONLINE"}
            </div>
            <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800" />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* 2. Main Content Area */}
      <main className="pt-28 pb-40 px-6 max-w-[1400px] mx-auto min-h-screen relative z-10">
        <AnimatePresence mode="wait">
          {/* STATE: HEALTHY */}
          {status === "HEALTHY" && (
            <motion.div
              key="healthy"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center justify-center min-h-[60vh] gap-12"
            >
              <ServiceHealth />

              <div className="text-center space-y-2 opacity-50 hover:opacity-100 transition-opacity">
                <p className="text-xs font-mono text-neutral-400 uppercase tracking-widest">
                  Monitoring Active • No Signal Anomalies
                </p>
              </div>
            </motion.div>
          )}

          {/* STATE: ALERT (The War Room Grid) */}
          {(status === "ALERT" || status === "RECOVERY") && incident && (
            <motion.div
              key="alert"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Left Column: Interactive Widgets (8/12) */}
              <div className="lg:col-span-8 flex flex-col gap-8">
                {/* Row 1: Graphs & Logs */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  <motion.div variants={itemVariants} className="h-full">
                    {getWidget("ErrorGraph") ? (
                      <ErrorGraph {...getWidget("ErrorGraph")?.props} />
                    ) : (
                      <ErrorGraph threshold={30} />
                    )}
                  </motion.div>
                  <motion.div variants={itemVariants} className="h-full">
                    {getWidget("LogStream") ? (
                      <LogStream {...getWidget("LogStream")?.props} />
                    ) : (
                      <LogStream />
                    )}
                  </motion.div>
                </div>

                {/* Row 2: Actions & Comms */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <motion.div variants={itemVariants}>
                    {getWidget("ActionButton") && (
                      <div onClick={() => handleActionComplete("rollback")}>
                        <ActionButton {...getWidget("ActionButton")?.props} />
                      </div>
                    )}
                  </motion.div>
                  <motion.div variants={itemVariants}>
                    {getWidget("SlackDraft") && (
                      <SlackDraft {...getWidget("SlackDraft")?.props} />
                    )}
                  </motion.div>
                </div>
              </div>

              {/* Right Column: Timeline (4/12) */}
              <motion.div
                variants={itemVariants}
                className="lg:col-span-4 h-full"
              >
                <div className="sticky top-28 space-y-8">
                  {status === "RECOVERY" && (
                    <PostMortem incidentId={incident?.type || "INC-123"} />
                  )}
                  {/* Pass explicit incidentId to ensure subscriptions work */}
                  <IncidentTimeline
                    events={events}
                    incidentId={"INC-2024-001"}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* 3. Floating Chat Bar (Always present) */}
      <div className="fixed bottom-8 left-0 right-0 px-6 z-40 pointer-events-none">
        <div className="max-w-2xl mx-auto pointer-events-auto">
          <form
            onSubmit={handleSendMessage}
            className="relative group perspective-[1000px]"
          >
            {/* Glow Effect behind input */}
            <div
              className={`absolute -inset-0.5 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition duration-1000 ${
                status === "ALERT" ? "bg-red-500" : "bg-emerald-500"
              }`}
            />

            <div className="relative flex items-center bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl rounded-full border border-neutral-200 dark:border-white/10 shadow-2xl has-[:focus]:border-neutral-300 dark:has-[:focus]:border-white/20 transition-colors">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  status === "ALERT"
                    ? "Ask WarRoom AI (e.g., 'Analyze logs', 'Who is on call?')..."
                    : "Describe system status..."
                }
                className="flex-1 px-6 py-4 bg-transparent outline-none text-neutral-900 dark:text-white placeholder:text-neutral-500 text-sm font-medium"
                disabled={isAnalyzing}
              />
              <button
                type="submit"
                disabled={!input.trim() || isAnalyzing}
                className="p-2 mr-2 rounded-full hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <Sparkles className="w-5 h-5 animate-spin text-purple-500" />
                ) : (
                  <div
                    className={`p-2 rounded-full ${status === "ALERT" ? "bg-red-500 text-white" : "bg-black dark:bg-white text-white dark:text-black"}`}
                  >
                    <Send className="w-4 h-4" />
                  </div>
                )}
              </button>
            </div>
          </form>

          {/* Quick Suggestion Chips */}
          {status === "HEALTHY" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="flex justify-center gap-2 mt-4"
            >
              <button
                onClick={async () => {
                  setInput("Simulating payment failure...");
                  const res = await import("@/app/actions").then((mod) =>
                    mod.triggerDemoIncident(),
                  );
                  if (res.success) {
                    // No manual call to setStatus anymore! Realtime will catch it.
                    sendThreadMessage(
                      "Triggering Demo Incident... Waiting for detection...",
                    );
                    // Clear input manually since we managed flow above
                    setInput("");
                  }
                }}
                className="group relative flex items-center gap-2 text-xs font-bold bg-white dark:bg-neutral-900 text-red-500 border border-red-200 dark:border-red-900/50 px-4 py-1.5 rounded-full shadow-lg shadow-red-500/10 hover:shadow-red-500/20 hover:scale-105 transition-all"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                Trigger Live Incident
              </button>
              <button
                onClick={async () => {
                  setInput("Checking database health...");
                  const res = await import("@/app/actions").then((mod) =>
                    mod.triggerTrafficSpike(),
                  );
                  // Realtime will catch it
                  if (res.success) {
                    sendThreadMessage("Traffic load test initiated.");
                    setInput("");
                  }
                }}
                className="text-xs font-medium bg-white/50 dark:bg-neutral-900/50 hover:bg-white dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 px-4 py-1.5 rounded-full backdrop-blur-sm transition-all hover:scale-105"
              >
                Test: Traffic Surge (5k)
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
