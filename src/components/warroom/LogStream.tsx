"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Terminal, Wifi } from "lucide-react";
import { useEffect, useState } from "react";

type LogEntry = {
  id: string;
  timestamp: string;
  level: "ERROR" | "WARN" | "INFO";
  service: string;
  message: string;
};

export function LogStream({
  logs: initialLogs = [],
  autoScroll = true,
  serviceFilter,
}: {
  logs?: LogEntry[];
  autoScroll?: boolean;
  serviceFilter?: string;
}) {
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs);

  // Data Fetching
  useEffect(() => {
    // If we have initial logs, use them
    if (initialLogs.length > 0) {
      setLogs(initialLogs);
      return;
    }

    // Otherwise, fetch from Supabase if we have a service filter (or just get recent)
    const fetchLogs = async () => {
      const { getSystemLogs } = await import("@/lib/supabase"); // Dynamic import to avoid server-side issues if any
      // We can filter by service if needed, but for now getSystemLogs returns all recent
      // TODO: Add service filter to getSystemLogs in supabase.ts if strict filtering needed
      const realLogs = await getSystemLogs(25);

      if (realLogs && realLogs.length > 0) {
        // Client-side filter if prop provided
        const filtered = serviceFilter
          ? realLogs.filter((l: any) =>
              l.service?.toLowerCase().includes(serviceFilter.toLowerCase()),
            )
          : realLogs;

        setLogs(
          filtered.map((l: any) => ({
            id: l.id,
            timestamp: new Date(l.created_at).toLocaleTimeString(),
            level: l.severity.toUpperCase() as "ERROR" | "WARN" | "INFO", // Ensure upper case for UI
            service: l.service || "System",
            message: l.message,
          })),
        );
      }
    };

    fetchLogs();

    // Set up polling for "live" feel
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [initialLogs, serviceFilter]);

  return (
    <div className="w-full bg-[#050505] border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col h-[400px] font-mono relative group">
      {/* Glossy Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/5 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/50" />
          </div>
          <div className="h-4 w-px bg-white/10 mx-1" />
          <div className="flex items-center gap-2 text-neutral-400">
            <Terminal className="w-3.5 h-3.5" />
            <span className="text-xs font-medium tracking-widest opacity-80">
              TERMINAL_OUTPUT
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <div className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </div>
            <span className="text-[10px] text-emerald-500 font-bold tracking-wider">
              LIVE
            </span>
          </div>
        </div>
      </div>

      {/* Terminal Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        <AnimatePresence initial={false}>
          {logs.map((log, idx) => (
            <motion.div
              key={log.id || idx}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className={`flex items-baseline gap-3 text-[11px] leading-relaxed group/line ${
                log.level === "ERROR"
                  ? "text-red-400 bg-red-500/5 -mx-4 px-4 py-0.5 border-l-2 border-red-500"
                  : log.level === "WARN"
                    ? "text-amber-400"
                    : "text-neutral-400"
              }`}
            >
              <span className="shrink-0 opacity-40 select-none w-16">
                {log.timestamp}
              </span>

              <span
                className={`shrink-0 font-bold w-12 ${
                  log.level === "ERROR"
                    ? "text-red-500"
                    : log.level === "WARN"
                      ? "text-amber-500"
                      : "text-emerald-500"
                }`}
              >
                [{log.level}]
              </span>

              <span className="shrink-0 text-white/60 w-24 truncate">
                {log.service}:
              </span>

              <span className="break-all opacity-80 group-hover/line:opacity-100 transition-opacity text-neutral-300">
                {log.message}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>

        {logs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-neutral-700 gap-2">
            <Wifi className="w-8 h-8 opacity-20" />
            <p className="text-xs uppercase tracking-widest opacity-50">
              Signal Acquired... Waiting for Data
            </p>
          </div>
        )}

        {/* Blinking Cursor at the end */}
        {logs.length > 0 && (
          <motion.div
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            className="w-2 h-4 bg-emerald-500/50 mt-1"
          />
        )}
      </div>

      {/* Scanline overlay (Subtle) */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-50 bg-[length:100%_2px,3px_100%] opacity-10" />
    </div>
  );
}
