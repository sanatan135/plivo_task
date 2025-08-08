'use client';

import { useRef, useState } from 'react';

export default function DocUrlSummarizer() {
  const ref = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function runForm(fd: FormData) {
    setErr(''); setSummary('');
    try {
      setBusy(true);
      const res = await fetch('/api/summarize-doc', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Summarize failed');
      setSummary(data.summary || '');
    } catch (e: any) {
      setErr(e?.message || 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUrl('');
    setName(f.name);
    const fd = new FormData();
    fd.set('file', f);
    await runForm(fd);
  }

  async function onSubmitUrl(e: React.FormEvent) {
    e.preventDefault();
    setName('');
    const fd = new FormData();
    fd.set('url', url);
    await runForm(fd);
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="label mb-1">Upload PDF/DOCX/TXT</div>
        <div className="flex items-center justify-between">
          <div className="subtle">{name || 'No file selected'}</div>
          <button className="btn" onClick={() => ref.current?.click()}>Choose file</button>
          <input ref={ref} type="file" accept=".pdf,.docx,.txt" hidden onChange={onPick} />
        </div>
      </div>

      <div className="card">
        <form onSubmit={onSubmitUrl} className="space-y-2">
          <div className="label">Or paste a URL</div>
          <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/article" />
          <button className="btn" type="submit">Summarize URL</button>
        </form>
      </div>

      <div className="card">
        <div className="label mb-2">Summary</div>
        {busy ? 'Summarizing…' : (summary || '—')}
        {err && <div className="mt-3 text-red-300">{err}</div>}
      </div>
    </div>
  );
}
