"use server";

import { detectIncident, resolveIncident } from "@/lib/incident-detector";
import { supabase } from "@/lib/supabase";

export async function submitUserQuery(query: string) {
  try {
    const incident = await detectIncident(query);
    return { success: true, incident };
  } catch (error) {
    console.error("Failed to detect incident:", error);
    return { success: false, error: "Failed to process query" };
  }
}

export async function resolveIncidentAction(
  incidentId: string,
  resolution: string,
) {
  try {
    const incident = await resolveIncident(incidentId, resolution);
    return { success: true, incident };
  } catch (error) {
    console.error("Failed to resolve incident:", error);
    return { success: false, error: "Failed to resolve incident" };
  }
}

// --- DEMO GOD MODE ACTIONS ---

export async function triggerDemoIncident() {
  if (!supabase) return { success: false, error: "Supabase not connected" };

  try {
    const { data, error } = await supabase.rpc("simulate_payment_incident");
    if (error) throw error;
    return { success: true, incidentId: data };
  } catch (error) {
    console.error("Failed to trigger demo:", error);
    return { success: false, error: "Failed to trigger demo incident" };
  }
}

export async function triggerDemoResolution(incidentId: string) {
  if (!supabase) return { success: false, error: "Supabase not connected" };

  try {
    const { error } = await supabase.rpc("resolve_incident", {
      incident_uuid: incidentId,
    });
    if (error) throw error;
    return { success: true };
  } catch (error) {}
}

export async function triggerTrafficSpike() {
  if (!supabase) return { success: false, error: "Supabase not connected" };

  try {
    // 1. Resolve Gateway/CDN Service
    const { data: service } = await supabase
      .from("services")
      .select("id")
      .eq("name", "Frontend CDN")
      .single();

    const serviceId = service?.id || "33333333-3333-3333-3333-333333333333";

    // 2. Create Incident
    const { data: incident, error: incError } = await supabase
      .from("incidents")
      .insert({
        service_id: serviceId,
        type: "traffic_spike",
        severity: "critical",
        status: "active",
        description: "API Gateway Overload: >5000 req/sec detected",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (incError) throw incError;

    // 3. Log Detection Event
    await supabase.from("incident_events").insert({
      incident_id: incident.id,
      event_type: "detected",
      description:
        "Traffic anomaly detected: 500% surge in traffic (5k+ req/s)",
      user_id: "system-monitor",
    });

    // 4. Insert Fake Spike Metrics
    const now = new Date();
    const metrics = Array.from({ length: 5 }).map((_, i) => ({
      service_id: serviceId,
      metric_type: "request_count",
      value: 4500 + Math.floor(Math.random() * 1000),
      timestamp: new Date(now.getTime() - (4 - i) * 60000).toISOString(),
    }));
    await supabase.from("metrics").insert(metrics);

    // 5. Insert Logs
    await supabase.from("error_logs").insert([
      {
        service_id: serviceId,
        incident_id: incident.id,
        severity: "warn",
        message: "Rate limit exceeded for 45 IP addresses",
      },
      {
        service_id: serviceId,
        incident_id: incident.id,
        severity: "error",
        message: "Load Balancer CPU utilization > 90%",
      },
      {
        service_id: serviceId,
        incident_id: incident.id,
        severity: "error",
        message: "Upstream timeout: Payment API unrelated to load",
      },
    ]);

    // 6. Update Service Status
    await supabase
      .from("services")
      .update({ status: "degraded" })
      .eq("id", serviceId);

    return { success: true, incidentId: incident.id };
  } catch (error) {
    console.error("Failed to trigger traffic spike:", error);
    return { success: false, error: "Failed to trigger traffic spike" };
  }
}
