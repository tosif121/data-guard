"use client";

import { useTambo } from "@tambo-ai/react";
import { Check, Copy, Hash, MessageSquare, Send, User } from "lucide-react";
import { useState } from "react";

export function SlackDraft({
  channel = "#engineering",
  draftText = "🚨 *INCIDENT DECLARED*\n\n*Service:* payment-gateway\n*Severity:* SEV-1\n*Status:* Investigating\n\n_Team is looking into 500 errors on checkout._",
}: {
  channel?: string;
  draftText?: string;
}) {
  const { sendThreadMessage } = useTambo();
  const [text, setText] = useState(draftText);
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = () => {
    setSent(true);
    // Simulate sending to actual Slack API
    setTimeout(() => {
      sendThreadMessage(`✅ Posted to Slack ${channel}`);
    }, 1000);
  };

  return (
    <div className="w-full bg-card text-card-foreground border border-border rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-[#4A154B] text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-white/80" />
          <span className="font-bold text-sm">Draft for {channel}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-white/60 bg-white/10 px-2 py-0.5 rounded">
          <Hash className="w-3 h-3" />
          <span>incidents-critical</span>
        </div>
      </div>

      {/* Body */}
      <div className="p-6">
        {/* Mock Slack Message Look */}
        <div className="flex gap-3 mb-4">
          <div className="w-9 h-9 rounded bg-emerald-600 flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="w-full">
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="font-bold text-neutral-900 dark:text-neutral-100 text-sm">
                Tambo Bot
              </span>
              <span className="text-xs text-neutral-500">APP</span>
              <span className="text-xs text-neutral-400">12:42 PM</span>
            </div>

            <div className="relative">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full min-h-[120px] p-3 text-sm bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-lg focus:ring-2 focus:ring-[#4A154B]/20 focus:border-[#4A154B]/50 transition-all font-sans resize-none text-neutral-800 dark:text-neutral-200"
              />
              <div className="absolute bottom-3 right-3 text-[10px] text-neutral-400 font-mono bg-white/50 dark:bg-black/50 px-1.5 rounded">
                {text.length} chars
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end border-t border-border pt-4">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-border"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            {copied ? "Copied" : "Copy Text"}
          </button>

          <button
            onClick={handleSend}
            disabled={sent}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-all shadow-sm ${
              sent
                ? "bg-green-600 hover:bg-green-700 cursor-default"
                : "bg-[#007a5a] hover:bg-[#006C4F] active:scale-95"
            }`}
          >
            {sent ? (
              <Check className="w-4 h-4" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {sent ? "Sent!" : "Send to Slack"}
          </button>
        </div>
      </div>
    </div>
  );
}
