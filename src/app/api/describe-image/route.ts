import { NextRequest, NextResponse } from 'next/server';
import { groq } from '@/lib/groq';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'Missing GROQ_API_KEY' }, { status: 500 });
    }
    const model = process.env.GROQ_VISION_MODEL || 'llama-3.2-11b-vision-preview';

    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

    const buf = Buffer.from(await file.arrayBuffer());
    const b64 = buf.toString('base64');
    const mime = file.type || 'image/png';
    const dataUrl = `data:${mime};base64,${b64}`;

    // OpenAI-compatible "multimodal" content
    const completion = await groq.chat.completions.create({
      model,
      temperature: 0.2,
      max_tokens: 700,
      messages: [
        {
          role: 'system',
          content: 'You are an expert image describer. Provide a rich, accurate caption plus key details and potential objects, text (OCR), and context.'
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Describe this image in detail, then provide a bullet list of notable elements.' },
            { type: 'image_url', image_url: { url: dataUrl } }
          ] as any
        }
      ]
    });

    const description = completion.choices?.[0]?.message?.content || '';
    return NextResponse.json({ description });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
