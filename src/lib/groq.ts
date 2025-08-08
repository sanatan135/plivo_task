import OpenAI from 'openai';

const baseURL = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';

export const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL
});
