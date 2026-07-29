/**
 * Arabic TTS with a never-silent cascade (best → fallback):
 *  1) Saudi / Najdi local voice (Naayf)
 *  2) Any other Arabic local voice
 *  3) Free online Arabic (rejected if empty/silent response)
 *  4) Romanized Arabic spoken by any English/system voice (always audible)
 *
 * Note: English voices reading Arabic script are usually silent — we never
 * treat that as success. Laptop with only Hazel/Zira needs (3) or (4).
 */

const VOICE_PREF_KEY = 'arabic-tts-voice-uri';
const HINT_KEY = 'arabic-tts-quality-hint';

let cachedVoices: SpeechSynthesisVoice[] | null = null;
let voicesReady: Promise<SpeechSynthesisVoice[]> | null = null;

type PlayTier = 'saudi' | 'arabic' | 'online' | 'romanized';

function ensureVoices(): Promise<SpeechSynthesisVoice[]> {
  if (voicesReady) return voicesReady;
  voicesReady = new Promise((resolve) => {
    if (typeof speechSynthesis === 'undefined') {
      resolve([]);
      return;
    }
    const finish = () => {
      cachedVoices = speechSynthesis.getVoices();
      resolve(cachedVoices);
    };
    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
      finish();
      return;
    }
    speechSynthesis.addEventListener('voiceschanged', finish, { once: true });
    setTimeout(finish, 900);
  });
  return voicesReady;
}

function voiceMeta(v: SpeechSynthesisVoice) {
  const lang = (v.lang || '').toLowerCase();
  const name = (v.name || '').toLowerCase();
  const isSaudi =
    lang.startsWith('ar-sa') ||
    name.includes('saudi') ||
    name.includes('naayf') ||
    name.includes('نـايف') ||
    name.includes('نايف');
  const isGulf =
    isSaudi ||
    lang.startsWith('ar-ae') ||
    lang.startsWith('ar-kw') ||
    lang.startsWith('ar-qa') ||
    lang.startsWith('ar-bh') ||
    lang.startsWith('ar-om') ||
    name.includes('gulf') ||
    name.includes('emirati');
  const isEgyptian =
    lang.startsWith('ar-eg') || name.includes('hoda') || name.includes('egypt');
  const isNatural =
    name.includes('natural') || name.includes('online') || name.includes('neural');
  const isArabic = lang.startsWith('ar') || name.includes('arab');
  return { lang, name, isSaudi, isGulf, isEgyptian, isNatural, isArabic };
}

/** Lower = better for Saudi/Najdi learning. */
function voiceRank(v: SpeechSynthesisVoice): number {
  const m = voiceMeta(v);
  if (!m.isArabic) return 999;
  if (m.isSaudi && m.isNatural) return 0;
  if (m.isSaudi) return 1;
  if (m.isGulf && m.isNatural) return 2;
  if (m.isGulf) return 3;
  if (m.isEgyptian) return 80;
  return 40;
}

export function ttsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export async function listArabicVoices(): Promise<SpeechSynthesisVoice[]> {
  const voices = await ensureVoices();
  return voices.filter((v) => voiceRank(v) < 900).sort((a, b) => voiceRank(a) - voiceRank(b));
}

async function listAllVoices(): Promise<SpeechSynthesisVoice[]> {
  return ensureVoices();
}

function voiceUri(v: SpeechSynthesisVoice): string {
  return `${v.voiceURI}||${v.name}||${v.lang}`;
}

export async function pickArabicVoice(): Promise<SpeechSynthesisVoice | null> {
  const arabic = await listArabicVoices();
  if (arabic.length === 0) return null;

  try {
    const pref = localStorage.getItem(VOICE_PREF_KEY);
    if (pref) {
      const found = arabic.find((v) => voiceUri(v) === pref);
      if (found) return found;
    }
  } catch {
    /* ignore */
  }

  return arabic[0] ?? null;
}

export async function hasSaudiVoice(): Promise<boolean> {
  const arabic = await listArabicVoices();
  return arabic.some((v) => voiceMeta(v).isSaudi);
}

const INSTALL_SAUDI_STEPS =
  'Want Najdi/Saudi? 1) Windows Settings → Time & language → Language & region → Add Arabic (Saudi Arabia). 2) Speech → Add voices → Microsoft Naayf. 3) Open this app in Edge and refresh.';

function showToast(msg: string, ms = 7000) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.remove('hidden');
  toast.classList.add('toast-long');
  window.setTimeout(() => {
    toast.classList.add('hidden');
    toast.classList.remove('toast-long');
  }, ms);
}

function announcePlaying(tier: PlayTier, voiceName?: string) {
  try {
    const key = `${HINT_KEY}:${tier}`;
    const tipSeen = sessionStorage.getItem(key) === '1';
    sessionStorage.setItem(key, '1');

    if (tier === 'saudi') {
      // Best path — quiet after first confirmation this session
      if (!tipSeen) {
        showToast(`Playing Saudi voice${voiceName ? ` (${voiceName})` : ''}.`, 3200);
      }
      return;
    }
    if (tier === 'arabic') {
      showToast(
        tipSeen
          ? `Playing Arabic voice${voiceName ? ` (${voiceName})` : ''} (not Najdi).`
          : `Playing Arabic voice${voiceName ? ` (${voiceName})` : ''} — not Najdi yet. ${INSTALL_SAUDI_STEPS}`,
        tipSeen ? 4000 : 10000
      );
      return;
    }
    if (tier === 'online') {
      showToast(
        tipSeen
          ? 'Playing free online Arabic.'
          : `Playing free online Arabic (needs internet). ${INSTALL_SAUDI_STEPS}`,
        tipSeen ? 4000 : 10000
      );
      return;
    }
    showToast(
      tipSeen
        ? 'Playing romanized Arabic (no Arabic voice on this PC).'
        : `Playing romanized Arabic so you still hear something — this PC has no Arabic voice pack. ${INSTALL_SAUDI_STEPS}`,
      tipSeen ? 5000 : 11000
    );
  } catch {
    showToast('Playing audio…');
  }
}

let currentBtn: HTMLButtonElement | null = null;
let onlineAudio: HTMLAudioElement | null = null;
let onlineAbort = false;
let speakGen = 0;

function setPlaying(btn: HTMLButtonElement | null, playing: boolean) {
  if (currentBtn && currentBtn !== btn) {
    currentBtn.classList.remove('is-playing');
    currentBtn.setAttribute('aria-pressed', 'false');
    currentBtn.textContent = '▶';
    currentBtn.title = 'Play Arabic audio';
  }
  currentBtn = playing ? btn : null;
  if (btn) {
    btn.classList.toggle('is-playing', playing);
    btn.setAttribute('aria-pressed', playing ? 'true' : 'false');
    btn.textContent = playing ? '■' : '▶';
    btn.title = playing ? 'Stop' : 'Play Arabic audio';
  }
}

function stopOnlineAudio() {
  onlineAbort = true;
  if (onlineAudio) {
    try {
      onlineAudio.pause();
      onlineAudio.removeAttribute('src');
      onlineAudio.load();
    } catch {
      /* ignore */
    }
    onlineAudio = null;
  }
}

/** Cancel any in-flight utterance / online clip. */
export function stopArabicSpeech() {
  speakGen += 1;
  stopOnlineAudio();
  try {
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
  setPlaying(currentBtn, false);
  document.querySelectorAll('.tts-btn.is-playing').forEach((b) => {
    b.classList.remove('is-playing');
    b.setAttribute('aria-pressed', 'false');
    b.textContent = '▶';
  });
}

/**
 * Light spoken-Najdi nudges for TTS (still free). Does not create a true accent,
 * but avoids some Fuṣḥā-leaning forms when the voice is generic.
 */
function najdiSpeakHints(text: string): string {
  let t = text;
  t = t.replace(/\bهذه\b/g, 'هذي');
  t = t.replace(/\bالذي\b/g, 'اللي');
  t = t.replace(/\bالتي\b/g, 'اللي');
  t = t.replace(/\bليس\b/g, 'مو');
  t = t.replace(/\bماذا\b/g, 'وش');
  t = t.replace(/\bأين\b/g, 'وين');
  t = t.replace(/\bلماذا\b/g, 'ليش');
  t = t.replace(/\bالآن\b/g, 'الحين');
  t = t.replace(/\bأيضاً\b/g, 'كمان');
  t = t.replace(/\bأيضا\b/g, 'كمان');
  t = t.replace(/\bفقط\b/g, 'بس');
  t = t.replace(/\bأريد\b/g, 'أبي');
  t = t.replace(/\bأذهب\b/g, 'أروح');
  t = t.replace(/\bذهب\b/g, 'راح');
  t = t.replace(/\bشاهد\b/g, 'شاف');
  t = t.replace(/\bانظر\b/g, 'شوف');
  return t.replace(/\s+/g, ' ').trim();
}

/** Split long lines so free online TTS (short URL limit) can play them. */
function chunkForOnlineTts(text: string, max = 160): string[] {
  const parts = text
    .split(/(?<=[.!?؟،,؛\n])\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const out: string[] = [];
  let buf = '';
  for (const p of parts.length ? parts : [text]) {
    if (!buf) {
      buf = p;
    } else if ((buf + ' ' + p).length <= max) {
      buf = `${buf} ${p}`;
    } else {
      out.push(buf);
      buf = p;
    }
    while (buf.length > max) {
      out.push(buf.slice(0, max));
      buf = buf.slice(max);
    }
  }
  if (buf) out.push(buf);
  return out;
}

/** Rough Latin for English TTS when no Arabic voice exists (always audible). */
function romanizeArabic(text: string): string {
  const map: Record<string, string> = {
    ا: 'a',
    أ: 'a',
    إ: 'i',
    آ: 'aa',
    ء: '',
    ؤ: 'u',
    ئ: 'i',
    ب: 'b',
    ت: 't',
    ث: 'th',
    ج: 'j',
    ح: 'h',
    خ: 'kh',
    د: 'd',
    ذ: 'dh',
    ر: 'r',
    ز: 'z',
    س: 's',
    ش: 'sh',
    ص: 's',
    ض: 'd',
    ط: 't',
    ظ: 'dh',
    ع: 'a',
    غ: 'gh',
    ف: 'f',
    ق: 'q',
    ك: 'k',
    ل: 'l',
    م: 'm',
    ن: 'n',
    ه: 'h',
    ة: 'a',
    و: 'w',
    ي: 'y',
    ى: 'a',
    ً: 'an',
    ٌ: 'un',
    ٍ: 'in',
    َ: 'a',
    ُ: 'u',
    ِ: 'i',
    ّ: '',
    ْ: '',
    ـ: '',
    لا: 'la',
    ال: 'al-',
    ،: ',',
    ؟: '?',
    '؛': ';',
  };
  // Prefer multi-char keys first
  let out = '';
  let i = 0;
  while (i < text.length) {
    const two = text.slice(i, i + 2);
    if (two === 'لا' || two === 'ال') {
      out += map[two];
      i += 2;
      continue;
    }
    const ch = text[i];
    if (ch === ' ' || ch === '\n') {
      out += ' ';
      i += 1;
      continue;
    }
    if (/[0-9A-Za-z.,!?'-]/.test(ch)) {
      out += ch;
      i += 1;
      continue;
    }
    out += map[ch] ?? '';
    i += 1;
  }
  return out.replace(/\s+/g, ' ').trim() || 'arabic';
}

function onlineTtsUrls(chunk: string): string[] {
  const q = encodeURIComponent(chunk);
  return [
    `https://translate.googleapis.com/translate_tts?ie=UTF-8&client=gtx&tl=ar&q=${q}`,
    `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=ar&q=${q}`,
  ];
}

function playOnlineChunk(chunk: string): Promise<void> {
  const urls = onlineTtsUrls(chunk);
  let lastErr: Error | null = null;

  const tryOne = (url: string): Promise<void> =>
    new Promise((resolve, reject) => {
      const audio = new Audio();
      onlineAudio = audio;
      let settled = false;
      const fail = (msg: string) => {
        if (settled) return;
        settled = true;
        try {
          audio.pause();
        } catch {
          /* ignore */
        }
        if (onlineAudio === audio) onlineAudio = null;
        reject(new Error(msg));
      };
      const ok = () => {
        if (settled) return;
        settled = true;
        if (onlineAudio === audio) onlineAudio = null;
        resolve();
      };

      const isEmpty = () => {
        const d = audio.duration;
        return Number.isFinite(d) && d < 0.08;
      };

      audio.preload = 'auto';
      audio.onended = () => {
        if (isEmpty()) fail('online-tts-empty');
        else ok();
      };
      audio.onerror = () => fail('online-tts-error');
      audio.onloadedmetadata = () => {
        if (isEmpty()) fail('online-tts-empty');
      };

      audio.src = url;
      void audio.play().catch(() => fail('online-tts-play-blocked'));
    });

  return (async () => {
    for (const url of urls) {
      try {
        await tryOne(url);
        return;
      } catch (e) {
        lastErr = e instanceof Error ? e : new Error('online-tts-failed');
      }
    }
    throw lastErr ?? new Error('online-tts-failed');
  })();
}

/** Speak with speechSynthesis; resolves true if audio actually started. */
function speakLocal(
  text: string,
  voice: SpeechSynthesisVoice | null,
  lang: string
): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof speechSynthesis === 'undefined') {
      resolve(false);
      return;
    }
    try {
      speechSynthesis.cancel();
      speechSynthesis.resume();
    } catch {
      /* ignore */
    }

    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    if (voice) u.voice = voice;
    u.rate = 0.9;
    u.pitch = 1;
    u.volume = 1;

    let settled = false;
    let started = false;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };

    u.onstart = () => {
      started = true;
    };
    u.onend = () => done(started);
    u.onerror = () => done(false);

    window.setTimeout(() => {
      try {
        speechSynthesis.resume();
        speechSynthesis.speak(u);
      } catch {
        done(false);
        return;
      }
      // If nothing starts, treat as failure so cascade continues
      window.setTimeout(() => {
        if (!started) {
          try {
            speechSynthesis.cancel();
          } catch {
            /* ignore */
          }
          done(false);
        }
      }, 1400);
    }, 40);
  });
}

async function speakViaOnline(text: string, gen: number): Promise<boolean> {
  onlineAbort = false;
  try {
    for (const chunk of chunkForOnlineTts(text)) {
      if (onlineAbort || gen !== speakGen) return false;
      await playOnlineChunk(chunk);
    }
    return !onlineAbort && gen === speakGen;
  } catch {
    return false;
  }
}

/**
 * Never-silent cascade. Always tries until something plays.
 */
export async function speakArabic(text: string, btn?: HTMLButtonElement | null): Promise<void> {
  const clean = najdiSpeakHints(text);
  if (!clean) return;

  if (btn?.classList.contains('is-playing')) {
    stopArabicSpeech();
    return;
  }

  const gen = ++speakGen;
  if (btn) setPlaying(btn, true);

  const finish = () => {
    if (gen === speakGen) setPlaying(btn ?? null, false);
  };

  try {
    const arabic = ttsSupported() ? await listArabicVoices() : [];
    const saudi = arabic.filter((v) => voiceMeta(v).isSaudi);
    const otherAr = arabic.filter((v) => !voiceMeta(v).isSaudi);

    // Prefer user-picked Arabic voice when present
    let preferred: SpeechSynthesisVoice | null = null;
    try {
      const pref = localStorage.getItem(VOICE_PREF_KEY);
      if (pref) preferred = arabic.find((v) => voiceUri(v) === pref) ?? null;
    } catch {
      /* ignore */
    }

    const stillActive = () => gen === speakGen;

    // 1) Saudi / Najdi
    const saudiVoice = preferred && voiceMeta(preferred).isSaudi ? preferred : saudi[0] ?? null;
    if (saudiVoice && stillActive()) {
      announcePlaying('saudi', saudiVoice.name);
      const ok = await speakLocal(clean, saudiVoice, saudiVoice.lang || 'ar-SA');
      if (!stillActive()) return;
      if (ok) return;
    }

    // 2) Generic Arabic (Egyptian / MSA / Gulf other)
    const arabicVoice =
      preferred && !voiceMeta(preferred).isSaudi
        ? preferred
        : otherAr[0] ?? null;
    if (arabicVoice && stillActive()) {
      announcePlaying('arabic', arabicVoice.name);
      const ok = await speakLocal(clean, arabicVoice, arabicVoice.lang || 'ar');
      if (!stillActive()) return;
      if (ok) return;
    }

    // 3) Free online Arabic
    if (stillActive()) {
      announcePlaying('online');
      const ok = await speakViaOnline(clean, gen);
      if (!stillActive()) return;
      if (ok) return;
    }

    // 4) Romanized Arabic via English/system voice — ALWAYS audible on this PC
    //    (English voices reading Arabic script are usually silent — do not use that.)
    if (ttsSupported() && stillActive()) {
      const all = await listAllVoices();
      const anyVoice = all[0] ?? null;
      const latin = romanizeArabic(clean);
      announcePlaying('romanized', anyVoice?.name);
      const ok = await speakLocal(latin, anyVoice, anyVoice?.lang || 'en-US');
      if (!stillActive()) return;
      if (ok) return;
    }

    if (stillActive()) {
      showToast(
        `No audible voice on this device. ${INSTALL_SAUDI_STEPS} Or open the app on your phone (Arabic TTS usually works there).`,
        12000
      );
    }
  } finally {
    finish();
  }
}

function voiceLabel(v: SpeechSynthesisVoice): string {
  const m = voiceMeta(v);
  const tag = m.isSaudi ? 'Saudi' : m.isGulf ? 'Gulf' : m.isEgyptian ? 'Egyptian' : 'Arabic';
  return `${v.name} · ${tag}`;
}

/** Optional voice picker (lists Arabic voices; prefer Saudi/Naayf). */
export async function mountTtsVoicePicker(host: HTMLElement) {
  if (!ttsSupported()) return;
  if (host.querySelector('.tts-voice-bar')) return;

  const voices = await listArabicVoices();
  const bar = document.createElement('div');
  bar.className = 'tts-voice-bar';

  const saudi = voices.some((v) => voiceMeta(v).isSaudi);
  const label = document.createElement('label');
  label.className = 'tts-voice-label';
  label.innerHTML = saudi
    ? 'Voice <span class="tts-voice-ok">Saudi available</span>'
    : 'Voice <span class="tts-voice-warn">▶ always plays — add Naayf for Najdi</span>';

  const select = document.createElement('select');
  select.className = 'tts-voice-select';
  select.setAttribute('aria-label', 'Arabic TTS voice');

  if (voices.length === 0) {
    const opt = document.createElement('option');
    opt.textContent = 'Auto: online Arabic → romanized (audible)';
    select.appendChild(opt);
    select.disabled = true;
  } else {
    for (const v of voices) {
      const opt = document.createElement('option');
      opt.value = voiceUri(v);
      opt.textContent = voiceLabel(v);
      select.appendChild(opt);
    }
    const current = await pickArabicVoice();
    if (current) select.value = voiceUri(current);
    select.addEventListener('change', () => {
      try {
        localStorage.setItem(VOICE_PREF_KEY, select.value);
      } catch {
        /* ignore */
      }
      showToast('Voice saved — tap ▶ to hear it', 3500);
    });
  }

  bar.appendChild(label);
  bar.appendChild(select);
  host.prepend(bar);
}

/** Add ▶ buttons next to Arabic example spans / lyric lines. */
export function wireArabicAudio(container: HTMLElement) {
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
    btn.title =
      'Play Arabic — uses Saudi if installed, else Arabic, else free online, else any voice';
    btn.textContent = '▶';

    btn.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      void speakArabic(text, btn);
    });

    const parent = node.parentNode;
    if (!parent) return;
    parent.insertBefore(wrap, node);
    wrap.appendChild(btn);
    wrap.appendChild(node);
  });
}
