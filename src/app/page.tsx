'use client';

import { useMemo, useState } from 'react';
import SkillSelector from '@/components/SkillSelector';
import UploadCard from '@/components/UploadCard';
import AudioPlayer from '@/components/AudioPlayer';
import { extractFramesMFCC, diarizeTwoSpeakers, DiarizedSegment, DGWord } from '@/lib/diarize';

type TranscribeResponse = { transcript: string; words: DGWord[] };

export default function Page() {
  const [skill, setSkill] = useState('conversation');
  const [audioUrl, setAudioUrl] = useState<string>();
  const [rawTranscript, setRawTranscript] = useState<string>('');
  const [words, setWords] = useState<DGWord[]>([]);
  const [diarized, setDiarized] = useState<DiarizedSegment[]>([]);
  const [summary, setSummary] = useState<string>('');
  const [busy, setBusy] = useState<'idle' | 'upload' | 'transcribe' | 'diarize' | 'summarize'>('idle');
  const [error, setError] = useState<string>('');

  const canSummarize = useMemo(() => rawTranscript.trim().length > 0, [rawTranscript]);

  async function handleFile(file: File) {
    setError('');
    setRawTranscript('');
    setWords([]);
    setDiarized([]);
    setSummary('');
    const url = URL.createObjectURL(file);
    setAudioUrl(url);

    try {
      setBusy('transcribe');
      const fd = new FormData();
      fd.set('file', file);
      const res = await fetch('/api/transcribe', { method: 'POST', body: fd });
      const data: TranscribeResponse = await res.json();
      if (!res.ok) throw new Error((data as any)?.error || 'Transcription failed');

      setRawTranscript(data.transcript || '');
      setWords(data.words || []);

      setBusy('diarize');
      const frames = await extractFramesMFCC(file);
      const segs = diarizeTwoSpeakers(frames, data.words || []);
      setDiarized(segs);
      setBusy('idle');
    } catch (e: any) {
      setBusy('idle');
      setError(e?.message || 'Something went wrong');
    }
  }

  async function doSummarize() {
    if (!canSummarize) return;
    try {
      setBusy('summarize');
      const res = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawTranscript })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Summarization failed');
      setSummary(data.summary || '');
      setBusy('idle');
    } catch (e: any) {
      setBusy('idle');
      setError(e?.message || 'Summarization error');
    }
  }

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="h1">AI Playground</h1>
        <span className="badge">Objective 1: Conversation Analysis</span>
      </div>

      <SkillSelector value={skill} onChange={setSkill} />

      {skill === 'conversation' && (
        <>
          <UploadCard onFile={handleFile} accept="audio/*" title="Upload audio (WAV/MP3/M4A)" />
          <AudioPlayer src={audioUrl} />

          {error && <div className="card border-red-900 text-red-300">{error}</div>}

          <div className="grid md:grid-cols-2 gap-6">
            <div className="card">
              <div className="label mb-2">Transcript</div>
              <div className="whitespace-pre-wrap text-sm leading-6 text-gray-200 min-h-24">
                {busy === 'transcribe' ? 'Transcribing…' : (rawTranscript || '—')}
              </div>
            </div>

            <div className="card">
              <div className="label mb-2">Diarization (max 2 speakers)</div>
              <div className="space-y-3 text-sm leading-6">
                {busy === 'diarize' && <div>Analyzing speakers…</div>}
                {(!busy || busy === 'idle') && diarized.length === 0 && <div>—</div>}
                {diarized.map((s, i) => (
                  <div key={i} className="p-3 rounded-xl bg-soft border border-edge">
                    <div className="text-xs text-gray-400 mb-1">
                      {s.speaker} • {s.start.toFixed(1)}s–{s.end.toFixed(1)}s
                    </div>
                    <div>{s.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="label mb-1">Summary</div>
                <div className="subtle">Generated with Groq</div>
              </div>
              <button className="btn" disabled={!canSummarize || busy === 'summarize'} onClick={doSummarize}>
                {busy === 'summarize' ? 'Summarizing…' : 'Summarize'}
              </button>
            </div>
            <div className="whitespace-pre-wrap text-sm leading-6">
              {summary || '—'}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
