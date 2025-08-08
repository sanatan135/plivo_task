import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Playground – Conversation Analysis',
  description: 'STT + 2-speaker diarization (non-vendor) + summary with Groq'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="container py-8">
          {children}
        </div>
      </body>
    </html>
  );
}
