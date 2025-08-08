'use client';

import { useRef, useState } from 'react';

export default function ImageDescribe() {
  const ref = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [preview, setPreview] = useState<string>();
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setName(f.name);
    setPreview(URL.createObjectURL(f));
    setDesc('');
    setErr('');

    const fd = new FormData();
    fd.set('file', f);
    try {
      setBusy(true);
      const res = await fetch('/api/describe-image', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Describe failed');
      setDesc(data.description || '');
    } catch (e: any) {
      setErr(e?.message || 'Error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <div className="label mb-1">Image</div>
            <div className="subtle">{name || 'Choose an image (PNG/JPG)'}</div>
          </div>
          <button className="btn" onClick={() => ref.current?.click()}>Choose file</button>
          <input ref={ref} type="file" accept="image/*" hidden onChange={onPick} />
        </div>
      </div>

      {preview && (
        <div className="card">
          <div className="label mb-2">Preview</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="preview" className="max-h-96 rounded-xl border border-edge" />
        </div>
      )}

      <div className="card">
        <div className="label mb-2">Description</div>
        {busy ? 'Analyzing…' : (desc || '—')}
        {err && <div className="mt-3 text-red-300">{err}</div>}
      </div>
    </div>
  );
}
