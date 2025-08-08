'use client';

type Props = {
  src?: string;
};
export default function AudioPlayer({ src }: Props) {
  if (!src) return null;
  return (
    <div className="card">
      <div className="label mb-2">Preview</div>
      <audio controls src={src} className="w-full" />
    </div>
  );
}
