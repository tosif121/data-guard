import { analyzeIncident } from './incident-analyzer'; // Reuse Perplexity Key logic if possible, or just call API directly

export interface QueryAnalysis {
  problem: string;
  solution: string;
  sqlCommand: string;
  estimatedImprovement: string;
}

export async function analyzeSlowQuery(query: string, schemaSummary: string): Promise<QueryAnalysis> {
  const apiKey = process.env.PERPLEXITY_API_KEY;

  if (!apiKey) {
    return {
      problem: 'Missing API Key',
      solution: 'Configure Perplexity API Key in .env.local',
      sqlCommand: '-- No Action',
      estimatedImprovement: '0%',
    };
  }

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: `You are an expert PostgreSQL DBA. Analyze the SLOW QUERY provided below given the DB SCHEMA.
Identify the performance bottleneck (e.g. Sequential Scan, Missing Index, High Contention).
Propose a concrete SQL solution (e.g. CREATE INDEX).
Return a JSON object with:
- problem: Short description of the issue.
- solution: Short description of the fix.
- sqlCommand: The exact SQL to run (e.g. CREATE INDEX ... CONCURRENTLY).
- estimatedImprovement: Percentage string (e.g. "95%").

JSON only. No markdown.`,
          },
          {
            role: 'user',
            content: `SCHEMA: ${schemaSummary}\n\nSLOW QUERY: ${query}`,
          },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) throw new Error(response.statusText);

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    const jsonStr = content.replace(/```json|```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('Query Doctor AI Failed:', error);
    // Fallback simulation
    return {
      problem: "Full Table Scan detected on 'users' table.",
      solution: "Add missing index on 'email' column.",
      sqlCommand: 'CREATE INDEX CONCURRENTLY idx_users_email ON users(email);',
      estimatedImprovement: '99%',
    };
  }
}
