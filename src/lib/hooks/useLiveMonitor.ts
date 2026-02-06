import { useState, useEffect } from 'react';
import { reliableFetch } from '@/lib/api';

export interface MonitoredService {
  id?: string;
  name: string;
  status: 'operational' | 'degraded' | 'outage';
  latency: string;
  errorRate: string;
  uptime: string;
  isMonitored?: boolean;
  isDb?: boolean;
  monitored_url?: string;
  api_key?: string;
  connected_db_url?: string;
  connected_db_key?: string;
  monitored_tables?: string[];
  metrics?: any;
}

export function useLiveMonitor(initialServices: any[], intervalMs: number = 3000, isPaused: boolean = false) {
  const [services, setServices] = useState<MonitoredService[]>([]);
  // We can also track a history of metrics for graphs
  const [metricHistory, setMetricHistory] = useState<{ timestamp: string; errorCount: number; latency: number }[]>([]);

  useEffect(() => {
    // If paused, just return (but maybe keep existing data?)
    if (isPaused) return;

    if (initialServices.length === 0) {
      setServices([]);
      return;
    }

    const checkHealth = async () => {
      const servicesWithHealth = await Promise.all(
        initialServices.map(async (s: any) => {
          const url = s.connected_db_url || s.monitored_url;
          const key = s.connected_db_key || s.api_key;
          const tables = s.monitored_tables || ['orders'];

          let status = s.status === 'healthy' ? 'operational' : s.status || 'operational';
          let latency = s.response_time_ms || 0;
          let isMonitored = !!url;
          let isDb = !!key;

          if (url && key) {
            const { success, data } = await reliableFetch('/external-db/monitor', {
              method: 'POST',
              data: { url, key, tables },
            });

            if (success && data) {
              status = data.status === 'healthy' ? 'operational' : data.status;
              latency = data.latency;
              isMonitored = true;
              isDb = true;
            }
          }

          return {
            ...s,
            name: s.name,
            status,
            latency: latency + 'ms',
            errorRate: '0.00%', // Placeholder until API returns this
            uptime: (s.uptime_percent || 100) + '%',
            isMonitored,
            isDb,
            monitored_url: url,
            api_key: key,
            _rawLatency: latency, // Internal use
          };
        }),
      );

      setServices(servicesWithHealth as MonitoredService[]);

      // Update History (Aggregate max latency of all services for now, or just the first DB)
      // This allows the ErrorGraph to show *something* live
      const monitoredDb = servicesWithHealth.find((s: any) => s.isDb);
      if (monitoredDb) {
        setMetricHistory((prev) => {
          const newPoint = {
            timestamp: new Date().toLocaleTimeString(),
            errorCount: monitoredDb.status !== 'operational' ? 50 : Math.floor(monitoredDb._rawLatency / 10), // Fake error count based on latency for demo visual
            latency: monitoredDb._rawLatency,
          };
          // Keep last 20 points
          return [...prev.slice(-19), newPoint];
        });
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, intervalMs);
    return () => clearInterval(interval);
  }, [initialServices, intervalMs, isPaused]);

  return { services, metricHistory };
}
