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
        <option value="conversation">Conversation Analysis</option>
        <option value="image">Image Analysis</option>
        <option value="doc">Document / URL Summarization</option>


      </select>
    </div>
  );
}
