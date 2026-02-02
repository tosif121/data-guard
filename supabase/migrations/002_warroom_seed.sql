-- SEED DATA FOR WARROOM DEMO
-- Run this after creating the schema

-- ==============================================
-- 1. INSERT SERVICES (4 microservices)
-- ==============================================
INSERT INTO services (id, name, status, response_time_ms, uptime_percent, last_check) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Payment API', 'healthy', 45, 99.95, now()),
  ('22222222-2222-2222-2222-222222222222', 'Database', 'healthy', 12, 99.99, now()),
  ('33333333-3333-3333-3333-333333333333', 'CDN', 'healthy', 8, 99.98, now()),
  ('44444444-4444-4444-4444-444444444444', 'Authentication', 'healthy', 23, 99.97, now());


-- ==============================================
-- 2. INSERT HISTORICAL INCIDENT (RESOLVED)
-- ==============================================
-- This shows users that WarRoom has handled incidents before
INSERT INTO incidents (id, service_id, type, severity, status, description, started_at, resolved_at) VALUES
  (
    '99999999-9999-9999-9999-999999999999',
    '11111111-1111-1111-1111-111111111111', -- Payment API
    'api_failure',
    'critical',
    'resolved',
    'Payment gateway returning 500 errors during checkout flow',
    now() - interval '2 hours',
    now() - interval '1 hour 57 minutes'
  );


-- ==============================================
-- 3. INSERT HISTORICAL INCIDENT EVENTS
-- ==============================================
INSERT INTO incident_events (incident_id, event_type, description, created_at) VALUES
  ('99999999-9999-9999-9999-999999999999', 'detected', 'Incident detected - Payment API failure', now() - interval '2 hours'),
  ('99999999-9999-9999-9999-999999999999', 'investigation', 'Investigating error spike in payment service', now() - interval '1 hour 59 minutes'),
  ('99999999-9999-9999-9999-999999999999', 'action_taken', 'Rollback to previous deployment initiated', now() - interval '1 hour 58 minutes'),
  ('99999999-9999-9999-9999-999999999999', 'recovered', 'Service recovered - Incident resolved in 3 minutes', now() - interval '1 hour 57 minutes');


-- ==============================================
-- 4. INSERT NORMAL METRICS (LAST 60 MINUTES)
-- ==============================================
-- Generate 60 data points for "normal" error rates (2-5 errors/min)
DO $$
DECLARE
  i INTEGER;
  service_uuid UUID := '11111111-1111-1111-1111-111111111111';
  error_val INTEGER;
BEGIN
  FOR i IN 0..59 LOOP
    error_val := 2 + floor(random() * 4)::int; -- Random 2-5
    INSERT INTO metrics (service_id, metric_type, value, timestamp) VALUES
      (service_uuid, 'error_count', error_val, now() - (60 - i) * interval '1 minute');
  END LOOP;
END $$;


-- ==============================================
-- 5. INSERT SAMPLE ERROR LOGS (NORMAL STATE)
-- ==============================================
-- Recent logs showing normal operations
INSERT INTO error_logs (service_id, severity, message, created_at) VALUES
  ('11111111-1111-1111-1111-111111111111', 'info', 'Payment processed successfully - Order #12345', now() - interval '2 minutes'),
  ('11111111-1111-1111-1111-111111111111', 'warn', 'Slow response from Stripe API (1.2s)', now() - interval '5 minutes'),
  ('22222222-2222-2222-2222-222222222222', 'info', 'Database connection pool: 45/100 connections active', now() - interval '3 minutes'),
  ('33333333-3333-3333-3333-333333333333', 'info', 'CDN cache hit rate: 98.5%', now() - interval '1 minute'),
  ('44444444-4444-4444-4444-444444444444', 'info', 'OAuth token refreshed for user session', now() - interval '4 minutes');


-- ==============================================
-- 6. CREATE FUNCTION FOR DEMO INCIDENT
-- ==============================================
-- This function simulates a realistic incident with spike data
CREATE OR REPLACE FUNCTION simulate_payment_incident()
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  new_incident_id UUID;
  payment_service_id UUID := '11111111-1111-1111-1111-111111111111';
  i INTEGER;
  spike_value INTEGER;
BEGIN
  -- Create new incident
  INSERT INTO incidents (service_id, type, severity, status, description)
  VALUES (
    payment_service_id,
    'api_failure',
    'critical',
    'active',
    'Users reporting 500 errors on payment checkout'
  )
  RETURNING id INTO new_incident_id;

  -- Add detection event
  INSERT INTO incident_events (incident_id, event_type, description)
  VALUES (new_incident_id, 'detected', 'Incident detected via user report');

  -- Insert spike metrics (150-200 errors/min for last 5 minutes)
  FOR i IN 0..4 LOOP
    spike_value := 150 + floor(random() * 51)::int; -- Random 150-200
    INSERT INTO metrics (service_id, metric_type, value, timestamp)
    VALUES (payment_service_id, 'error_count', spike_value, now() - (5 - i) * interval '1 minute');
  END LOOP;

  -- Insert realistic error logs
  INSERT INTO error_logs (service_id, incident_id, severity, message, created_at) VALUES
    (payment_service_id, new_incident_id, 'error', 'Payment API: 500 Internal Server Error - Connection timeout', now() - interval '4 minutes'),
    (payment_service_id, new_incident_id, 'error', 'Stripe API returned 503 Service Unavailable', now() - interval '3 minutes'),
    (payment_service_id, new_incident_id, 'error', 'Database connection pool exhausted (100/100)', now() - interval '3 minutes'),
    (payment_service_id, new_incident_id, 'error', 'Payment webhook failed after 3 retries', now() - interval '2 minutes'),
    (payment_service_id, new_incident_id, 'error', 'Transaction rollback failed - data inconsistency', now() - interval '2 minutes'),
    (payment_service_id, new_incident_id, 'warn', 'High memory usage detected: 95% utilized', now() - interval '1 minute'),
    (payment_service_id, new_incident_id, 'error', 'Payment service health check failed', now() - interval '30 seconds');

  -- Update service status to down
  UPDATE services SET status = 'down', last_check = now() WHERE id = payment_service_id;

  RETURN new_incident_id;
END;
$$;


-- ==============================================
-- 7. CREATE FUNCTION FOR RESOLVING INCIDENT
-- ==============================================
CREATE OR REPLACE FUNCTION resolve_incident(incident_uuid UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  service_uuid UUID;
  i INTEGER;
  recovery_value INTEGER;
BEGIN
  -- Get service_id from incident
  SELECT service_id INTO service_uuid FROM incidents WHERE id = incident_uuid;

  -- Add resolution event
  INSERT INTO incident_events (incident_id, event_type, description)
  VALUES (incident_uuid, 'recovered', 'Service recovered - Rollback successful');

  -- Update incident status
  UPDATE incidents SET status = 'resolved', resolved_at = now() WHERE id = incident_uuid;

  -- Update service status
  UPDATE services SET status = 'healthy', last_check = now() WHERE id = service_uuid;

  -- Insert recovery metrics (gradual decrease to normal)
  FOR i IN 0..4 LOOP
    recovery_value := 80 - (i * 15); -- 80 → 65 → 50 → 35 → 20
    INSERT INTO metrics (service_id, metric_type, value, timestamp)
    VALUES (service_uuid, 'error_count', recovery_value, now() + i * interval '30 seconds');
  END LOOP;

  -- Add recovery log
  INSERT INTO error_logs (service_id, incident_id, severity, message)
  VALUES (service_uuid, incident_uuid, 'info', 'Payment service recovered - Error rate normalizing');
END;
$$;


-- ==============================================
-- 8. CREATE FUNCTION TO RESET DEMO
-- ==============================================
CREATE OR REPLACE FUNCTION reset_demo()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delete all active incidents (keep historical for demo purposes)
  DELETE FROM incident_events WHERE incident_id IN (SELECT id FROM incidents WHERE status = 'active');
  DELETE FROM error_logs WHERE incident_id IN (SELECT id FROM incidents WHERE status = 'active');
  DELETE FROM incidents WHERE status = 'active';

  -- Reset all services to healthy
  UPDATE services SET status = 'healthy', last_check = now();

  -- Clear recent spike metrics (keep only last hour of normal data)
  DELETE FROM metrics WHERE timestamp > now() - interval '1 hour';
END;
$$;
