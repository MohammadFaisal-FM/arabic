/**
 * Device TTS for Arabic learning.
 * Dropdown lists every voice on this device (Arabic / Non-Arabic).
 * Default = best available system voice (prefer Arabic).
 * If the device has no voices at all → "No voice available".
 */

const VOICE_PREF_KEY = 'arabic-tts-voice-uri';

let cachedVoices: SpeechSynthesisVoice[] | null = null;
let voicesReady: Promise<SpeechSynthesisVoice[]> | null = null;

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
    name.includes('نايف');
  const isHoda = name.includes('hoda');
  const isEgyptian =
    isHoda || lang.startsWith('ar-eg') || name.includes('egypt');
  const isGulf =
    isSaudi ||
    lang.startsWith('ar-ae') ||
    lang.startsWith('ar-kw') ||
    lang.startsWith('ar-qa') ||
    lang.startsWith('ar-bh') ||
    lang.startsWith('ar-om') ||
    name.includes('gulf') ||
    name.includes('emirati');
  const isNatural =
    name.includes('natural') || name.includes('online') || name.includes('neural');
  const isArabic =
    lang.startsWith('ar') || name.includes('arab') || isHoda || isSaudi;
  return { lang, name, isSaudi, isHoda, isGulf, isEgyptian, isNatural, isArabic };
}

/** Lower = better default for Arabic learning. Non-Arabic sorted after. */
function voiceRank(v: SpeechSynthesisVoice): number {
  const m = voiceMeta(v);
  if (m.isSaudi && m.isNatural) return 0;
  if (m.isSaudi) return 1;
  if (m.isHoda) return 2;
  if (m.isEgyptian) return 3;
  if (m.isGulf) return 4;
  if (m.isArabic) return 10;
  // Other languages after Arabic, keep stable-ish by name
  return 100 + (v.name || '').toLowerCase().charCodeAt(0) / 1000;
}

export function ttsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export async function listAllVoices(): Promise<SpeechSynthesisVoice[]> {
  const voices = await ensureVoices();
  return [...voices].sort((a, b) => voiceRank(a) - voiceRank(b));
}

export async function listArabicVoices(): Promise<SpeechSynthesisVoice[]> {
  const all = await listAllVoices();
  return all.filter((v) => voiceMeta(v).isArabic);
}

function voiceUri(v: SpeechSynthesisVoice): string {
  return `${v.voiceURI}||${v.name}||${v.lang}`;
}

function getVoicePref(): string | null {
  try {
    return localStorage.getItem(VOICE_PREF_KEY);
  } catch {
    return null;
  }
}

function findVoiceByUri(
  voices: SpeechSynthesisVoice[],
  uri: string
): SpeechSynthesisVoice | null {
  return voices.find((v) => voiceUri(v) === uri) ?? null;
}

/** Default: best system voice (Arabic preferred via voiceRank). */
function defaultVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  return voices[0] ?? null;
}

function resolveVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const pref = getVoicePref();
  if (pref) {
    const found = findVoiceByUri(voices, pref);
    if (found) return found;
  }
  return defaultVoice(voices);
}

export async function pickArabicVoice(): Promise<SpeechSynthesisVoice | null> {
  const arabic = await listArabicVoices();
  return arabic[0] ?? null;
}

export async function hasSaudiVoice(): Promise<boolean> {
  const arabic = await listArabicVoices();
  return arabic.some((v) => voiceMeta(v).isSaudi);
}

function showToast(msg: string, ms = 5000) {
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

let currentBtn: HTMLButtonElement | null = null;
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

/** Cancel any in-flight utterance. */
export function stopArabicSpeech() {
  speakGen += 1;
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

/** Rough Latin so non-Arabic voices can still be heard. */
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
    '\u064B': 'an',
    '\u064C': 'un',
    '\u064D': 'in',
    '\u064E': 'a',
    '\u064F': 'u',
    '\u0650': 'i',
    '\u0651': '',
    '\u0652': '',
    ـ: '',
    لا: 'la',
    ال: 'al-',
    '،': ',',
    '؟': '?',
    '؛': ';',
  };
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

function voiceLabel(v: SpeechSynthesisVoice): string {
  return v.name || v.lang || 'Voice';
}

/**
 * Play with the selected/default system voice.
 * Arabic voices speak Arabic script; non-Arabic voices use romanization (English voices can't speak Arabic script).
 * If the device has no voices → "No voice available".
 */
export async function speakArabic(text: string, btn?: HTMLButtonElement | null): Promise<void> {
  const clean = najdiSpeakHints(text);
  if (!clean) return;

  if (btn?.classList.contains('is-playing')) {
    stopArabicSpeech();
    return;
  }

  if (!ttsSupported()) {
    showToast('No voice available');
    return;
  }

  const gen = ++speakGen;
  if (btn) setPlaying(btn, true);

  const finish = () => {
    if (gen === speakGen) setPlaying(btn ?? null, false);
  };

  try {
    const all = await listAllVoices();
    if (!all.length) {
      showToast('No voice available');
      return;
    }

    const voice = resolveVoice(all);
    if (!voice) {
      showToast('No voice available');
      return;
    }

    const m = voiceMeta(voice);
    if (m.isArabic) {
      const ok = await speakLocal(clean, voice, voice.lang || 'ar');
      if (gen !== speakGen) return;
      if (!ok) showToast('No voice available');
      return;
    }

    // Non-Arabic system voice: speak romanized text so something is audible
    const latin = romanizeArabic(clean);
    const ok = await speakLocal(latin, voice, voice.lang || 'en-US');
    if (gen !== speakGen) return;
    if (!ok) showToast('No voice available');
  } finally {
    finish();
  }
}

/** Dropdown: Arabic Voices / Non-Arabic Voices only. Default = best available. */
export async function mountTtsVoicePicker(host: HTMLElement) {
  if (!ttsSupported()) return;

  host.querySelector('.tts-voice-bar')?.remove();

  const all = await listAllVoices();
  const arabic = all.filter((v) => voiceMeta(v).isArabic);
  const other = all.filter((v) => !voiceMeta(v).isArabic);

  const bar = document.createElement('div');
  bar.className = 'tts-voice-bar';

  const label = document.createElement('label');
  label.className = 'tts-voice-label';
  label.textContent = 'Voice';

  const select = document.createElement('select');
  select.className = 'tts-voice-select';
  select.setAttribute('aria-label', 'Voice');

  const addOpt = (value: string, text: string, group?: HTMLOptGroupElement) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = text;
    (group ?? select).appendChild(opt);
  };

  if (!all.length) {
    select.disabled = true;
    addOpt('', 'No voice available');
  } else {
    if (arabic.length) {
      const g = document.createElement('optgroup');
      g.label = 'Arabic Voices';
      for (const v of arabic) addOpt(voiceUri(v), voiceLabel(v), g);
      select.appendChild(g);
    }

    if (other.length) {
      const g = document.createElement('optgroup');
      g.label = 'Non-Arabic Voices';
      for (const v of other) addOpt(voiceUri(v), voiceLabel(v), g);
      select.appendChild(g);
    }

    const resolved = resolveVoice(all);
    // Drop stale Auto/Romanized prefs
    const pref = getVoicePref();
    if (pref && findVoiceByUri(all, pref)) {
      select.value = pref;
    } else if (resolved) {
      select.value = voiceUri(resolved);
      try {
        localStorage.setItem(VOICE_PREF_KEY, select.value);
      } catch {
        /* ignore */
      }
    }

    select.addEventListener('change', () => {
      try {
        localStorage.setItem(VOICE_PREF_KEY, select.value);
      } catch {
        /* ignore */
      }
      showToast('Voice saved — tap ▶', 2500);
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
      'Play using this device’s voices (pick one in the Voice menu)';
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
