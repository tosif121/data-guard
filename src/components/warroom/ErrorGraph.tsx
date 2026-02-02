"use client";

import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type DataPoint = {
  timestamp: string;
  errorCount: number;
};

export function ErrorGraph({
  data = [],
  threshold = 50,
}: {
  data?: DataPoint[];
  threshold?: number;
}) {
  if (!data || data.length === 0) {
    return (
      <div className="w-full h-[300px] bg-card border border-border rounded-xl p-6 shadow-sm flex items-center justify-center">
        <div className="text-center text-neutral-500">
          <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No Error Data Available</p>
        </div>
      </div>
    );
  }

  const currentCount = data[data.length - 1].errorCount;
  const previousCount = data.length > 1 ? data[data.length - 2].errorCount : 0;
  const isSpiking = currentCount > threshold;
  const trend = currentCount >= previousCount ? "up" : "down";

  return (
    <div className="w-full bg-card text-card-foreground border border-border rounded-xl p-6 shadow-sm relative overflow-hidden">
      {/* Background Pulse for Critical State */}
      {isSpiking && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.1 }}
          transition={{ repeat: Infinity, duration: 1, repeatType: "reverse" }}
          className="absolute inset-0 bg-red-500 z-0 pointer-events-none"
        />
      )}

      <div className="relative z-10 flex justify-between items-start mb-6">
        <div>
          <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-widest flex items-center gap-2">
            <Activity className="w-4 h-4" /> Error Rate (5xx)
          </h3>
          <div className="flex items-end gap-3 mt-2">
            <span
              className={`text-3xl font-bold font-mono ${isSpiking ? "text-red-500" : "text-neutral-900 dark:text-neutral-100"}`}
            >
              {currentCount}
            </span>
            <div
              className={`flex items-center text-xs font-medium mb-1 ${trend === "up" ? "text-red-500" : "text-emerald-500"}`}
            >
              {trend === "up" ? (
                <TrendingUp className="w-3 h-3 mr-1" />
              ) : (
                <TrendingDown className="w-3 h-3 mr-1" />
              )}
              errors/min
            </div>
          </div>
        </div>

        {isSpiking && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full text-xs font-bold animate-pulse"
          >
            <AlertTriangle className="w-3 h-3" />
            CRITICAL SPIKE
          </motion.div>
        )}
      </div>

      <div className="h-[250px] w-full relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              strokeOpacity={0.1}
              stroke="#888888"
            />
            <XAxis
              dataKey="timestamp"
              stroke="#666"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              minTickGap={20}
            />
            <YAxis
              stroke="#666"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              width={30}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0f172a", // Dark slate
                border: "1px solid #1e293b",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "12px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
              itemStyle={{ color: "#ef4444" }}
              labelStyle={{ color: "#94a3b8", marginBottom: "4px" }}
            />
            <ReferenceLine
              y={threshold}
              stroke="#f59e0b"
              strokeDasharray="3 3"
              strokeOpacity={0.5}
              label={{
                value: "Threshold",
                fill: "#f59e0b",
                fontSize: 10,
                position: "insideBottomRight",
              }}
            />
            <Line
              type="monotone"
              dataKey="errorCount"
              stroke="#ef4444"
              strokeWidth={3}
              dot={{ r: 4, fill: "#ef4444", strokeWidth: 0 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
              animationDuration={1000}
              isAnimationActive={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
