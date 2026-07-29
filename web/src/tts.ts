/**
 * Free in-browser Arabic TTS via Speech Synthesis.
 * Prefers Saudi (ar-SA) when the OS/browser provides it; else any Arabic voice.
 * No API keys, no cost.
 */

let cachedVoice: SpeechSynthesisVoice | null | undefined;
let voicesReady: Promise<void> | null = null;

function ensureVoices(): Promise<void> {
  if (voicesReady) return voicesReady;
  voicesReady = new Promise((resolve) => {
    if (typeof speechSynthesis === 'undefined') {
      resolve();
      return;
    }
    const done = () => resolve();
    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
      done();
      return;
    }
    speechSynthesis.addEventListener('voiceschanged', done, { once: true });
    // Some browsers never fire voiceschanged
    setTimeout(done, 750);
  });
  return voicesReady;
}

function voiceRank(v: SpeechSynthesisVoice): number {
  const lang = (v.lang || '').toLowerCase();
  const name = (v.name || '').toLowerCase();
  if (lang === 'ar-sa' || lang.startsWith('ar-sa')) return 0;
  if (name.includes('saudi') || name.includes('naayf') || name.includes('hoda')) return 1;
  if (lang === 'ar-ae' || lang.startsWith('ar-ae') || lang.startsWith('ar-kw') || lang.startsWith('ar-qa'))
    return 2;
  if (lang.startsWith('ar')) return 3;
  return 99;
}

export async function pickArabicVoice(): Promise<SpeechSynthesisVoice | null> {
  if (typeof speechSynthesis === 'undefined') return null;
  await ensureVoices();
  if (cachedVoice !== undefined) return cachedVoice;
  const voices = speechSynthesis.getVoices();
  const arabic = voices.filter((v) => voiceRank(v) < 99).sort((a, b) => voiceRank(a) - voiceRank(b));
  cachedVoice = arabic[0] ?? null;
  return cachedVoice;
}

export function ttsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

let currentBtn: HTMLButtonElement | null = null;

function setPlaying(btn: HTMLButtonElement | null, playing: boolean) {
  if (currentBtn && currentBtn !== btn) {
    currentBtn.classList.remove('is-playing');
    currentBtn.setAttribute('aria-pressed', 'false');
    currentBtn.title = 'Play Arabic (free browser voice)';
  }
  currentBtn = playing ? btn : null;
  if (btn) {
    btn.classList.toggle('is-playing', playing);
    btn.setAttribute('aria-pressed', playing ? 'true' : 'false');
    btn.title = playing ? 'Stop' : 'Play Arabic (free browser voice)';
  }
}

export function stopArabicSpeech() {
  if (typeof speechSynthesis === 'undefined') return;
  speechSynthesis.cancel();
  setPlaying(currentBtn, false);
}

export async function speakArabic(text: string, btn?: HTMLButtonElement | null): Promise<void> {
  if (!ttsSupported()) return;
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return;

  // Toggle off if same button is playing
  if (btn?.classList.contains('is-playing')) {
    stopArabicSpeech();
    return;
  }

  stopArabicSpeech();
  await ensureVoices();
  const voice = await pickArabicVoice();
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = voice?.lang || 'ar-SA';
  if (voice) u.voice = voice;
  u.rate = 0.92;
  u.pitch = 1;
  u.onend = () => setPlaying(btn ?? null, false);
  u.onerror = () => setPlaying(btn ?? null, false);
  if (btn) setPlaying(btn, true);
  speechSynthesis.speak(u);
}

/** Add ▶ buttons next to Arabic example spans / lyric lines. */
export function wireArabicAudio(container: HTMLElement) {
  if (!ttsSupported()) return;

  const targets = container.querySelectorAll<HTMLElement>(
    '.example-ar, .lyrics-ar, td .example-ar'
  );

  targets.forEach((node) => {
    if (node.dataset.audioWired === '1') return;
    const text = (node.textContent || '').trim();
    if (!text || text === '—') return;
    node.dataset.audioWired = '1';

    const wrap = document.createElement('span');
    wrap.className = 'example-ar-wrap';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tts-btn';
    btn.setAttribute('aria-label', 'Play Arabic audio');
    btn.setAttribute('aria-pressed', 'false');
    btn.title = 'Play Arabic (free browser voice — prefers Saudi if installed)';
    btn.textContent = '▶';

    btn.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      void speakArabic(text, btn);
    });

    // Keep Arabic block, add button beside/above it
    const parent = node.parentNode;
    if (!parent) return;
    parent.insertBefore(wrap, node);
    wrap.appendChild(btn);
    wrap.appendChild(node);
  });
}
