import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, AlertTriangle, ArrowRight, CheckCircle, Database, Loader2, Play, Zap } from 'lucide-react';
import { reliableFetch } from '@/lib/api';
import toast from 'react-hot-toast';

interface SlowQuery {
  pid: number;
  query: string;
  duration: string;
}

interface Analysis {
  problem: string;
  solution: string;
  sqlCommand: string;
  estimatedImprovement: string;
}

export function QueryPerformanceWidget() {
  const [queries, setQueries] = useState<SlowQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<Record<number, Analysis>>({});
  const [fixingId, setFixingId] = useState<number | null>(null);

  // Poll for slow queries
  useEffect(() => {
    const fetchQueries = async () => {
      try {
        // Use credentials from localStorage if available, or just rely on the API to use defaults/mock
        // In a real app, we'd pass the connection context.
        // For this demo widget, we'll assume the API handles the connection or returns mock data
        const { success, data } = await reliableFetch('/external-db/queries', {
          method: 'POST',
          data: { url: 'demo', key: 'demo' }, // The API handles missing creds with fallback
        });

        if (success && data?.queries) {
          setQueries(data.queries);
        }
      } catch (err) {
        console.error('Failed to fetch slow queries', err);
      } finally {
        setLoading(false);
      }
    };

    fetchQueries();
    const interval = setInterval(fetchQueries, 5000); // 5s poll
    return () => clearInterval(interval);
  }, []);

  const handleAnalyze = async (q: SlowQuery) => {
    setAnalyzingId(q.pid);
    toast.loading('AI Analyzing Query Strategy...');

    try {
      const { success, data } = await reliableFetch('/external-db/analyze-query', {
        method: 'POST',
        data: { query: q.query, schema: 'public' },
      });

      if (success && data?.diagnosis) {
        setAnalysis((prev) => ({ ...prev, [q.pid]: data.diagnosis }));
        toast.dismiss();
        toast.success('Optimization Strategy Found!');
      }
    } catch (err) {
      toast.error('Analysis Failed');
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleFix = async (q: SlowQuery) => {
    setFixingId(q.pid);
    const fix = analysis[q.pid];

    // Simulate Fix execution
    await new Promise((resolve) => setTimeout(resolve, 2000));

    toast.success(`Applied Fix: ${fix.solution}`);
    setFixingId(null);

    // Remove from list to simulate resolution
    setQueries((prev) => prev.filter((query) => query.pid !== q.pid));
  };

  if (loading) return <div className="p-6 text-center text-neutral-500">Loading Database Metrics...</div>;

  return (
    <div className="w-full bg-white/50 dark:bg-neutral-900/50 backdrop-blur-md border border-neutral-200 dark:border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-500" />
          The Query Doctor 🩺
        </h3>
        <span className="text-[10px] bg-neutral-100 dark:bg-white/10 px-2 py-1 rounded-full text-neutral-500 border border-neutral-200 dark:border-white/5">
          {queries.length} Active Slow Queries
        </span>
      </div>

      <div className="space-y-4">
        <AnimatePresence>
          {queries.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-neutral-400 text-sm"
            >
              No slow queries detected. Database is healthy 🟢
            </motion.div>
          )}

          {queries.map((q) => (
            <motion.div
              key={q.pid}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-black/40 border border-neutral-200 dark:border-white/5 rounded-xl p-4 group hover:border-amber-500/50 transition-colors"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-500">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-mono text-xs text-neutral-900 dark:text-white font-bold">PID: {q.pid}</h4>
                    <p className="text-[10px] text-red-500 font-bold flex items-center gap-1">
                      Duration: {q.duration}s
                    </p>
                  </div>
                </div>

                {!analysis[q.pid] ? (
                  <button
                    onClick={() => handleAnalyze(q)}
                    disabled={analyzingId === q.pid}
                    className="text-xs bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {analyzingId === q.pid ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                    Analyze
                  </button>
                ) : (
                  <button
                    onClick={() => handleFix(q)}
                    disabled={fixingId === q.pid}
                    className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                  >
                    {fixingId === q.pid ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                    Auto-Fix
                  </button>
                )}
              </div>

              <div className="text-xs font-mono text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-black/20 p-2 rounded border border-neutral-100 dark:border-white/5 overflow-x-auto whitespace-pre-wrap mb-3">
                {q.query}
              </div>

              {/* AI Diagnosis */}
              {analysis[q.pid] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-lg p-3"
                >
                  <div className="flex items-center gap-2 mb-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider">
                    <Zap className="w-3 h-3" /> AI Insight
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs mb-2">
                    <div>
                      <span className="block text-neutral-400 text-[10px] uppercase">Problem</span>
                      <span className="text-neutral-900 dark:text-white font-medium">{analysis[q.pid].problem}</span>
                    </div>
                    <div>
                      <span className="block text-neutral-400 text-[10px] uppercase">Solution</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        {analysis[q.pid].solution}
                      </span>
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-white/50 dark:bg-black/20 p-2 rounded border border-emerald-100 dark:border-emerald-500/10">
                    {analysis[q.pid].sqlCommand}
                  </div>
                  <div className="mt-2 text-[10px] text-indigo-400 text-right">
                    Estimated Impact:{' '}
                    <span className="font-bold text-white">{analysis[q.pid].estimatedImprovement}</span>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
