import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs'; // serverless on Vercel

export async function POST(req: NextRequest) {
  try {
    const dgKey = process.env.DEEPGRAM_API_KEY;
    if (!dgKey) return NextResponse.json({ error: 'Missing DEEPGRAM_API_KEY' }, { status: 500 });

    // Expect raw audio as binary (FormData also supported below)
    const contentType = req.headers.get('content-type') || '';
    let audioBuffer: ArrayBuffer;
    let mimetype = 'audio/wav';

    if (contentType.startsWith('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('file') as File | null;
      if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });
      mimetype = file.type || 'application/octet-stream';
      audioBuffer = await file.arrayBuffer();
    } else {
      // raw
      audioBuffer = await req.arrayBuffer();
    }

    const params = new URLSearchParams({
      punctuate: 'true',
      diarize: 'false', // DO NOT use vendor diarization
      smart_format: 'true'
    });

    const resp = await fetch(`https://api.deepgram.com/v1/listen?${params.toString()}`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${dgKey}`,
        'Content-Type': mimetype
      },
      body: Buffer.from(audioBuffer)
    });

    const data = await resp.json();

    if (!resp.ok) {
      return NextResponse.json({ error: data?.error || 'Deepgram error', raw: data }, { status: resp.status });
    }

    // Normalize Deepgram response to transcript + words
    const alt = data?.results?.channels?.[0]?.alternatives?.[0];
    const transcript = alt?.transcript || '';
    const words = (alt?.words || []).map((w: any) => ({
      word: w.word,
      start: w.start,
      end: w.end
    }));

    return NextResponse.json({ transcript, words });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
