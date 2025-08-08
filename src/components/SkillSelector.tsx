'use client';

type Props = {
  value: string;
  onChange: (v: string) => void;
};

export default function SkillSelector({ value, onChange }: Props) {
  return (
    <div className="card mb-6">
      <div className="label mb-1">Skill</div>
      <select
        className="select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="conversation">Conversation Analysis</option>
        {/* Future skills can be added here (Image, Doc/URL) */}
      </select>
    </div>
  );
}
