// --- Types ---

export type IncidentType =
  | "API_FAILURE"
  | "DATABASE_SLOW"
  | "TRAFFIC_SPIKE"
  | "SECURITY_BREACH"
  | "UNKNOWN";

export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type WidgetConfig = {
  componentName:
    | "LogStream"
    | "ErrorGraph"
    | "ServiceHealth"
    | "ActionButton"
    | "IncidentTimeline"
    | "SlackDraft";
  props?: Record<string, any>;
  reason: string;
};

export type IncidentAnalysis = {
  type: IncidentType;
  service: string | undefined;
  severity: Severity;
  widgets: WidgetConfig[];
  suggestedActions: string[];
};

// --- Logic ---

export async function analyzeIncident(
  userMessage: string,
): Promise<IncidentAnalysis> {
  const lowerMsg = userMessage.toLowerCase();

  // 1. Determine Incident Type
  let type: IncidentType = "UNKNOWN";
  if (/500 error|failing|down|status code|5xx/.test(lowerMsg)) {
    type = "API_FAILURE";
  } else if (/slow|timeout|latency|queries|stuck/.test(lowerMsg)) {
    type = "DATABASE_SLOW";
  } else if (/traffic|spike|overload|capacity|limit/.test(lowerMsg)) {
    type = "TRAFFIC_SPIKE";
  } else if (/security|breach|ddos|attack|hacker/.test(lowerMsg)) {
    type = "SECURITY_BREACH";
  }

  // 2. Identify Service
  let service = undefined;
  if (/payment|checkout|stripe/.test(lowerMsg)) service = "payment-service";
  else if (/auth|login|user|session/.test(lowerMsg)) service = "auth-service";
  else if (/db|database|postgres|sql/.test(lowerMsg))
    service = "postgres-primary";
  else if (/frontend|ui|web|cdn/.test(lowerMsg)) service = "frontend-cdn";

  // 3. Determine Severity
  let severity: Severity = "MEDIUM";
  if (/critical|down|outage|all users/.test(lowerMsg)) severity = "CRITICAL";
  else if (/intermittent|some users|high/.test(lowerMsg)) severity = "HIGH";
  else if (/low|minor|warning/.test(lowerMsg)) severity = "LOW";

  // 4. Map to Widgets
  const widgets: WidgetConfig[] = [];
  const actions: string[] = [];

  // Always show Timeline & Health
  widgets.push({
    componentName: "IncidentTimeline",
    reason: "Show event history",
  });
  widgets.push({
    componentName: "ServiceHealth",
    reason: "Show overall system status",
  });

  switch (type) {
    case "API_FAILURE":
      widgets.push({
        componentName: "ErrorGraph",
        props: { title: "Error Rate (5xx)", color: "#ef4444" },
        reason: "Visualize error spike",
      });
      if (service) {
        widgets.push({
          componentName: "LogStream",
          props: { serviceFilter: service },
          reason: `Show logs for ${service}`,
        });
      }
      actions.push("rollback", "restart");
      widgets.push({
        componentName: "SlackDraft",
        props: {
          draftText: `🚨 *API FAILURE DETECTED*\nService: ${service || "Unknown"}\nSeverity: ${severity}\nInvestigating 500 errors.`,
        },
        reason: "Draft incident alert",
      });
      break;

    case "DATABASE_SLOW":
      widgets.push({
        componentName: "ErrorGraph",
        props: { title: "Query Latency (ms)", color: "#eab308" }, // Yellow
        reason: "Visualize latency",
      });
      if (service) {
        widgets.push({
          componentName: "LogStream",
          props: { serviceFilter: service },
          reason: "Show slow query logs",
        });
      }
      actions.push("enable_cache", "restart");
      widgets.push({
        componentName: "SlackDraft",
        props: {
          draftText: `⚠️ *DATABASE ISSUES*\nService: ${service || "DB"}\nSeverity: ${severity}\nHigh latency detected in read replicas.`,
        },
        reason: "Draft latency alert",
      });
      break;

    case "TRAFFIC_SPIKE":
      widgets.push({
        componentName: "ErrorGraph",
        props: { title: "Requests/sec", color: "#3b82f6" }, // Blue
        reason: "Visualize traffic volume",
      });
      actions.push("scale_up", "enable_cache");
      widgets.push({
        componentName: "SlackDraft",
        props: {
          draftText: `� *TRAFFIC SURGE*\nService: ${service || "Gateway"}\nSeverity: ${severity}\nAuto-scaling trigger imminent.`,
        },
        reason: "Draft scaling alert",
      });
      break;

    case "SECURITY_BREACH":
      widgets.push({
        componentName: "ErrorGraph",
        props: { title: "Blocked Requests", color: "#a855f7" }, // Purple
        reason: "Show blocked malicious traffic",
      });
      widgets.push({
        componentName: "LogStream",
        props: { serviceFilter: "firewall" },
        reason: "Show security audit logs",
      });
      actions.push("monitor", "restart"); // "block_ip" if we had it
      widgets.push({
        componentName: "SlackDraft",
        props: {
          channel: "#sec-ops",
          draftText: `🛡️ *SECURITY ALERT*\nSuspicious activity detected.\nSeverity: ${severity}`,
        },
        reason: "Notify SecOps",
      });
      break;
  }

  // Add ActionButton if we found actions
  if (actions.length > 0) {
    widgets.push({
      componentName: "ActionButton",
      props: { actions },
      reason: "Suggested remediation actions",
    });
  }

  return {
    type,
    service,
    severity,
    widgets,
    suggestedActions: actions,
  };
}

// --- Legacy Adapters (for compatibility with existing code if needed) ---
// We can remove these if we update tambo.ts to use analyzeIncident directly.
export async function analyzeIntent(query: string) {
  const analysis = await analyzeIncident(query);
  return {
    detectedType: analysis.type,
    suggestedSeverity: analysis.severity,
    detectedService: analysis.service,
    // We'll attach the full analysis to context if needed, but for now map fields
    _fullAnalysis: analysis,
  };
}

export function getWidgetSuggestions(context: any) {
  return context._fullAnalysis.widgets;
}
