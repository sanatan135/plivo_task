'use client';

import { useRef, useState } from 'react';

type Props = {
  onFile: (file: File) => void;
  accept?: string;
  title?: string;
};

export default function UploadCard({ onFile, accept = 'audio/*', title = 'Upload audio' }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [name, setName] = useState<string>('');

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <div className="label mb-1">{title}</div>
          <div className="subtle">{name || 'Select a file (≤ ~25MB recommended)'}</div>
        </div>
        <button className="btn" onClick={() => ref.current?.click()}>Choose file</button>
      </div>
      <input
        type="file"
        ref={ref}
        accept={accept}
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) { setName(f.name); onFile(f); }
        }}
      />
    </div>
  );
}
