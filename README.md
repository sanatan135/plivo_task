# AI Playground – Objective 1 (Conversation Analysis)

Deployed with Next.js + Vercel. Features:
- Upload audio → **Deepgram STT** (vendor allowed)
- **Diarization (2 speakers)** in the **browser** with MFCC + K-means (no vendor diarization)
- **Groq** LLM summary of the transcript
- Minimal Linear-like UI, ready to add Image & Doc skills later

## Stack
- Next.js 14 (App Router), TypeScript, Tailwind
- Deepgram API (STT — diarization disabled)
- Meyda (client-side MFCC) + K-means (2 clusters)
- Groq (OpenAI-compatible Chat Completions) for summarization

## Local setup

```bash
pnpm i   # or npm i / yarn
cp .env.example .env.local
# Fill in keys
# DEEPGRAM_API_KEY=...
# GROQ_API_KEY=...
# GROQ_BASE_URL=https://api.groq.com/openai/v1

pnpm dev
# open http://localhost:3000
