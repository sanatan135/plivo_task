// Lightweight 2-speaker diarization using Meyda MFCC + K-means
// Runs client-side (no vendor diarization). Good for short interview-style audio.

import Meyda from 'meyda';

export type DGWord = {
  word: string;
  start: number; // seconds
  end: number;   // seconds
};

export type DiarizedSegment = {
  speaker: 'Speaker 1' | 'Speaker 2';
  start: number;
  end: number;
  text: string;
};

type Frame = {
  time: number;   // center time (s)
  mfcc: number[]; // feature vector
};

function kmeans2(vectors: number[], dims: number[]): number[] {
  // Not used; we need actual vector list. Keeping stub off.
  return [];
}

// Simple k-means for 2 clusters
function kMeans2D(features: number[][], iters = 20): { labels: number[], c0: number[], c1: number[] } {
  if (features.length === 0) return { labels: [], c0: [], c1: [] };
  const dim = features[0].length;

  // init centroids: pick two farthest points
  let c0 = features[0].slice();
  let c1 = features[Math.max(1, Math.floor(features.length / 2))].slice();

  const dist2 = (a: number[], b: number[]) => a.reduce((s, v, i) => {
    const d = v - b[i]; return s + d * d;
  }, 0);

  let labels = new Array(features.length).fill(0);

  for (let t = 0; t < iters; t++) {
    // assign
    for (let i = 0; i < features.length; i++) {
      const d0 = dist2(features[i], c0);
      const d1 = dist2(features[i], c1);
      labels[i] = d0 <= d1 ? 0 : 1;
    }
    // update
    const sum0 = new Array(dim).fill(0), sum1 = new Array(dim).fill(0);
    let n0 = 0, n1 = 0;
    for (let i = 0; i < features.length; i++) {
      const f = features[i];
      if (labels[i] === 0) { n0++; for (let d = 0; d < dim; d++) sum0[d] += f[d]; }
      else { n1++; for (let d = 0; d < dim; d++) sum1[d] += f[d]; }
    }
    if (n0 > 0) for (let d = 0; d < dim; d++) c0[d] = sum0[d] / n0;
    if (n1 > 0) for (let d = 0; d < dim; d++) c1[d] = sum1[d] / n1;
  }
  return { labels, c0, c1 };
}

export async function extractFramesMFCC(file: File, opts?: { hopMs?: number; frameMs?: number }) {
  const hopMs = opts?.hopMs ?? 20;   // 20ms hop
  const frameMs = opts?.frameMs ?? 40; // 40ms window

  const arrayBuf = await file.arrayBuffer();
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const audioBuf = await audioCtx.decodeAudioData(arrayBuf.slice(0));
  const channelData = audioBuf.getChannelData(0); // mono (use first channel)
  const sr = audioBuf.sampleRate;

  const hop = Math.floor((hopMs / 1000) * sr);
  const frame = Math.floor((frameMs / 1000) * sr);

  const frames: Frame[] = [];
  const meyda = Meyda.createMeydaAnalyzer({
    audioContext: audioCtx,
    source: audioCtx.createBufferSource(), // not used as a node graph; we do offline
    bufferSize: frame,
    sampleRate: sr,
    numberOfMFCCCoefficients: 13,
    featureExtractors: ['mfcc']
  });

  // Manual windowing: extract slices and run Meyda extract on them
  for (let start = 0; start + frame <= channelData.length; start += hop) {
    const end = start + frame;
    const slice = channelData.slice(start, end);
    // Meyda offline call:
    const res = Meyda.extract('mfcc', slice, {
      sampleRate: sr,
      bufferSize: frame,
      numberOfMFCCCoefficients: 13
    } as any);
    if (res && Array.isArray(res)) {
      const center = (start + end) / 2;
      frames.push({ time: center / sr, mfcc: res as number[] });
    }
  }
  await audioCtx.close();
  return frames;
}

export function diarizeTwoSpeakers(frames: Frame[], words: DGWord[]): DiarizedSegment[] {
  if (frames.length === 0 || words.length === 0) return [];

  // Feature normalization
  const feats = frames.map(f => f.mfcc);
  const dim = feats[0].length;
  const mean = new Array(dim).fill(0);
  feats.forEach(v => v.forEach((x, i) => { mean[i] += x; }));
  mean.forEach((m, i) => mean[i] = m / feats.length);
  const std = new Array(dim).fill(1e-8);
  feats.forEach(v => v.forEach((x, i) => { const d = x - mean[i]; std[i] += d*d; }));
  std.forEach((s, i) => std[i] = Math.sqrt(s / feats.length) || 1);

  const norm = feats.map(v => v.map((x, i) => (x - mean[i]) / std[i]));

  // K-means into 2 clusters
  const { labels } = kMeans2D(norm, 25);

  // Smooth labels with small median window (optional simple smoothing)
  const smooth = labels.slice();
  const W = 3;
  for (let i = 0; i < labels.length; i++) {
    const a = Math.max(0, i - W), b = Math.min(labels.length - 1, i + W);
    let c0 = 0, c1 = 0;
    for (let j = a; j <= b; j++) labels[j] === 0 ? c0++ : c1++;
    smooth[i] = c0 >= c1 ? 0 : 1;
  }

  // Build time segments from frame labels
  type Seg = { start: number; end: number; lab: number; };
  const segs: Seg[] = [];
  let cur: Seg | null = null;
  for (let i = 0; i < smooth.length; i++) {
    const t = frames[i].time;
    const lab = smooth[i];
    if (!cur) cur = { start: t, end: t, lab };
    else if (lab === cur.lab) cur.end = t;
    else { segs.push(cur); cur = { start: t, end: t, lab }; }
  }
  if (cur) segs.push(cur);

  // Merge very short segments (<0.5s)
  const merged: Seg[] = [];
  for (const s of segs) {
    const duration = s.end - s.start;
    if (merged.length > 0 && duration < 0.5) {
      // snap to previous
      merged[merged.length - 1].end = s.end;
    } else {
      merged.push(s);
    }
  }

  // Map words → nearest segment (by word midpoint)
  const out: DiarizedSegment[] = [];
  for (const seg of merged) {
    const midStart = seg.start;
    const midEnd = seg.end;
    const segWords = words.filter(w => {
      const mid = (w.start + w.end) / 2;
      return mid >= midStart && mid <= midEnd;
    });
    if (segWords.length === 0) continue;
    out.push({
      speaker: seg.lab === 0 ? 'Speaker 1' : 'Speaker 2',
      start: segWords[0].start,
      end: segWords[segWords.length - 1].end,
      text: segWords.map(w => w.word).join(' ')
    });
  }

  // Coalesce adjacent segments if same speaker
  const final: DiarizedSegment[] = [];
  for (const s of out) {
    const last = final.at(-1);
    if (last && last.speaker === s.speaker && s.start - last.end < 0.3) {
      last.end = s.end;
      last.text = `${last.text} ${s.text}`;
    } else {
      final.push({ ...s });
    }
  }
  return final;
}
