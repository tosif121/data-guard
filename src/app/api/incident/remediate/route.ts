import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { action, incidentId } = await request.json();

    if (!action) {
      return NextResponse.json({ success: false, error: 'Missing action' }, { status: 400 });
    }

    const supabase = createServerClient();

    if (action === 'clear_logs') {
      // Delete all error logs
      const { error } = await supabase.from('error_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Hack to delete all

      if (error) throw error;

      return NextResponse.json({
        success: true,
        message: 'All error logs purged.',
      });
    }

    if (action === 'resolve') {
      // Resolve all active incidents or specific one
      let query = supabase
        .from('incidents')
        .update({ status: 'resolved', resolved_at: new Date().toISOString() })
        .eq('status', 'active');

      if (incidentId) {
        query = query.eq('id', incidentId);
      }

      const { data, error } = await query.select();

      if (error) throw error;

      // Log the action
      if (data && data.length > 0) {
        for (const incident of data) {
          await supabase.from('incident_events').insert([
            {
              incident_id: incident.id,
              event_type: 'resolved',
              description: '✅ Incident resolved via Remediation Action.',
              user_id: 'commander',
            },
          ]);
        }
      }

      return NextResponse.json({
        success: true,
        message: `Resolved ${data?.length || 0} active incidents.`,
        resolvedCount: data?.length || 0,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Remediation API failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Remediation failed',
      },
      { status: 500 },
    );
  }
}
