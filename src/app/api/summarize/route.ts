import { NextRequest, NextResponse } from 'next/server';
import { groq } from '@/lib/groq';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text: string = body?.text || '';

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'Missing GROQ_API_KEY' }, { status: 500 });
    }
    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    const completion = await groq.chat.completions.create({
      // Pick a Groq-supported chat model (e.g., llama-3.1-8b-instant or mixtral-8x7b)
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: 'You are a concise meeting summarizer. Return bullet points with action items and who said what when possible.' },
        { role: 'user', content: `Summarize this transcript in 6-10 bullets with action items and key decisions:\n\n${text}` }
      ],
      temperature: 0.2,
      max_tokens: 600
    });

    const summary = completion.choices?.[0]?.message?.content || '';
    return NextResponse.json({ summary });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
