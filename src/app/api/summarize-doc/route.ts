import { NextRequest, NextResponse } from 'next/server';
import { groq } from '@/lib/groq';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export const runtime = 'nodejs';

async function extractFromDocx(buf: Buffer) {
  const { value } = await mammoth.extractRawText({ buffer: buf });
  return value || '';
}

async function extractFromPdf(buf: Buffer) {
  const data = await pdfParse(buf);
  return data.text || '';
}

async function extractFromUrl(url: string) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const html = await res.text();
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();
  if (article?.textContent) return article.textContent;
  // fallback: strip tags
  return dom.window.document.body?.textContent || '';
}

function chunk(text: string, maxChars = 6000) {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + maxChars));
    i += maxChars;
  }
  return chunks;
}

async function summarizeText(text: string) {
  const model = 'llama-3.1-8b-instant';
  const chunks = chunk(text);
  // Summarize chunks progressively
  let current = '';
  for (let idx = 0; idx < chunks.length; idx++) {
    const piece = chunks[idx];
    const prompt =
      idx === 0
        ? `Summarize this document chunk in concise bullets with headings and any action items:\n\n${piece}`
        : `We already summarized previous parts. Merge this chunk into the existing summary. Keep it concise:\n\nEXISTING SUMMARY:\n${current}\n\nNEW CHUNK:\n${piece}\n\nReturn an updated cohesive summary.`;

    const completion = await groq.chat.completions.create({
      model,
      temperature: 0.2,
      max_tokens: 800,
      messages: [
        { role: 'system', content: 'You are a precise technical summarizer.' },
        { role: 'user', content: prompt }
      ]
    });

    const out = completion.choices?.[0]?.message?.content || '';
    current = out.trim();
  }
  return current || 'No summary produced.';
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'Missing GROQ_API_KEY' }, { status: 500 });
    }

    const contentType = req.headers.get('content-type') || '';
    let text = '';

    if (contentType.startsWith('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('file') as File | null;
      const url = (form.get('url') as string) || '';

      if (file) {
        const buf = Buffer.from(await file.arrayBuffer());
        const mime = file.type || '';
        if (mime.includes('pdf')) {
          text = await extractFromPdf(buf);
        } else if (mime.includes('word') || mime.includes('docx')) {
          text = await extractFromDocx(buf);
        } else if (mime.includes('text') || file.name.endsWith('.txt')) {
          text = buf.toString('utf8');
        } else {
          return NextResponse.json({ error: 'Unsupported file type. Use PDF, DOCX, or TXT.' }, { status: 400 });
        }
      } else if (url) {
        text = await extractFromUrl(url);
      } else {
        return NextResponse.json({ error: 'Provide a file or a URL.' }, { status: 400 });
      }
    } else {
      const body = await req.json().catch(() => ({}));
      if (body?.url) {
        text = await extractFromUrl(body.url);
      } else if (body?.text) {
        text = String(body.text);
      } else {
        return NextResponse.json({ error: 'Provide multipart/form-data with file/url or JSON with url/text.' }, { status: 400 });
      }
    }

    const normalized = text.replace(/\s+/g, ' ').trim();
    if (!normalized) return NextResponse.json({ error: 'No extractable text found.' }, { status: 400 });

    const summary = await summarizeText(normalized);
    return NextResponse.json({ summary, chars: normalized.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
