import { NextResponse } from 'next/server';
import { analyzeSlowQuery } from '@/lib/query-doctor';

export async function POST(req: Request) {
  try {
    const { query, schema } = await req.json();

    if (!query) {
      return NextResponse.json({ success: false, error: 'Missing query' }, { status: 400 });
    }

    const diagnosis = await analyzeSlowQuery(query, schema || 'Unknown Schema');
    return NextResponse.json({ success: true, diagnosis });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
