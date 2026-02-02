import { createServerClient } from "@/lib/supabase/server";

export type IncidentType = "api_failure" | "database_slow" | "traffic_spike";
export type Severity = "critical" | "high" | "medium" | "low";

/**
 * Detects an incident based on a user message.
 * This simulates an AI analysis that triggers DB writes.
 */
export async function detectIncident(userMessage: string) {
  const supabase = createServerClient();
  const lowerMsg = userMessage.toLowerCase();

  // 1. Parse Context
  let serviceName = "unknown-service";
  if (lowerMsg.includes("payment") || lowerMsg.includes("checkout"))
    serviceName = "Payment API";
  else if (lowerMsg.includes("db") || lowerMsg.includes("database"))
    serviceName = "Database";
  else if (lowerMsg.includes("cdn") || lowerMsg.includes("assets"))
    serviceName = "CDN";
  else if (lowerMsg.includes("auth") || lowerMsg.includes("login"))
    serviceName = "Auth";

  // 2. Identify Incident Type
  let type: IncidentType = "api_failure";
  if (lowerMsg.includes("slow") || lowerMsg.includes("latency"))
    type = "database_slow";
  else if (lowerMsg.includes("spike") || lowerMsg.includes("traffic"))
    type = "traffic_spike";

  // 3. Determine Severity
  let severity: Severity = "medium";
  if (
    lowerMsg.includes("500") ||
    lowerMsg.includes("down") ||
    lowerMsg.includes("fail")
  )
    severity = "high";
  if (lowerMsg.includes("critical") || lowerMsg.includes("sev1"))
    severity = "critical";

  // 4. Resolve Service ID (Get or Create)
  let { data: service } = await supabase
    .from("services")
    .select("id")
    .eq("name", serviceName)
    .single();

  if (!service) {
    const { data: newService } = await supabase
      .from("services")
      .insert([
        {
          name: serviceName,
          status: severity === "critical" ? "down" : "degraded",
        },
      ])
      .select("id")
      .single();
    service = newService;
  }

  if (!service) throw new Error("Could not resolve service");

  // 5. Create Incident
  const { data: incident, error: incError } = await supabase
    .from("incidents")
    .insert([
      {
        service_id: service.id,
        type,
        severity,
        status: "active",
        description: userMessage,
        started_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (incError) throw incError;

  // 6. Log Initial Event
  const { error: evtError } = await supabase.from("incident_events").insert([
    {
      incident_id: incident.id,
      event_type: "detected",
      description: `Incident detected via user report: "${userMessage}"`,
      user_id: "system-monitor", // In real app, this would be the user's ID
      metadata: { raw_message: userMessage },
    },
  ]);

  if (evtError) console.error("Failed to log event", evtError);

  return incident;
}

/**
 * Resolves an incident and logs the duration.
 */
export async function resolveIncident(
  incidentId: string,
  resolutionMessage: string,
) {
  const supabase = createServerClient();

  // 1. Update Incident
  const { data: incident, error } = await supabase
    .from("incidents")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", incidentId)
    .select()
    .single();

  if (error) throw error;

  // 2. Log Recovery Event
  await supabase.from("incident_events").insert([
    {
      incident_id: incidentId,
      event_type: "recovered",
      description: resolutionMessage,
      user_id: "system-monitor",
    },
  ]);

  // 3. Update Service Health
  if (incident.service_id) {
    await supabase
      .from("services")
      .update({ status: "healthy" })
      .eq("id", incident.service_id);
  }

  return incident;
}
