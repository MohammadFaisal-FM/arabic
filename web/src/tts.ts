/**
 * Device TTS for Arabic learning.
 * Dropdown:
 *  - Arabic Voices → every Arabic voice the browser exposes (incl. Arabic-script names)
 *  - Non-Arabic Voice Default → one best non-Arabic (prefer English)
 */

const VOICE_PREF_KEY = 'arabic-tts-voice-uri';
/** Arabic letters / presentation forms — catch voices named in Arabic script */
const ARABIC_SCRIPT_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

let cachedVoices: SpeechSynthesisVoice[] | null = null;
let voicesReady: Promise<SpeechSynthesisVoice[]> | null = null;
let voicesListenerAttached = false;

function refreshVoiceCache(): SpeechSynthesisVoice[] {
  if (typeof speechSynthesis === 'undefined') {
    cachedVoices = [];
    return cachedVoices;
  }
  cachedVoices = speechSynthesis.getVoices();
  return cachedVoices;
}

/** Remount any open voice pickers when the browser discovers more OS voices (e.g. Hoda). */
function remountOpenVoicePickers() {
  document.querySelectorAll('.tts-voice-bar').forEach((bar) => {
    const host = bar.parentElement;
    if (!host) return;
    bar.remove();
    void mountTtsVoicePicker(host as HTMLElement);
  });
}

function ensureVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof speechSynthesis === 'undefined') {
    return Promise.resolve([]);
  }

  // Keep listening — Chrome often loads voices late / after a pack install
  if (!voicesListenerAttached) {
    voicesListenerAttached = true;
    speechSynthesis.addEventListener('voiceschanged', () => {
      const prev = cachedVoices || [];
      const next = refreshVoiceCache();
      const prevAr = prev.filter((v) => voiceMeta(v).isArabic).length;
      const nextAr = next.filter((v) => voiceMeta(v).isArabic).length;
      if (next.length !== prev.length || nextAr !== prevAr) {
        remountOpenVoicePickers();
      }
    });
  }

  // Prefer a fresh snapshot whenever voices are already present
  const now = speechSynthesis.getVoices();
  if (now.length > 0) {
    cachedVoices = now;
    if (!voicesReady) {
      // Still wait briefly — more Arabic voices may appear on voiceschanged
      voicesReady = new Promise((resolve) => {
        window.setTimeout(() => {
          resolve(refreshVoiceCache());
        }, 400);
      });
    }
    return Promise.resolve([...refreshVoiceCache()]);
  }

  if (voicesReady) return voicesReady;

  voicesReady = new Promise((resolve) => {
    const finish = () => {
      const v = refreshVoiceCache();
      resolve(v);
    };
    speechSynthesis.addEventListener('voiceschanged', finish, { once: true });
    setTimeout(finish, 1500);
  });
  return voicesReady;
}

function voiceMeta(v: SpeechSynthesisVoice) {
  const lang = (v.lang || '').toLowerCase().replace(/_/g, '-');
  const name = (v.name || '').toLowerCase();
  const uri = (v.voiceURI || '').toLowerCase();
  const blob = `${lang} ${name} ${uri}`;

  const hasArabicScript =
    ARABIC_SCRIPT_RE.test(v.name || '') || ARABIC_SCRIPT_RE.test(v.voiceURI || '');

  const isSaudi =
    lang.startsWith('ar-sa') ||
    blob.includes('saudi') ||
    blob.includes('naayf') ||
    blob.includes('نـايف') ||
    blob.includes('نايف') ||
    blob.includes('arsa') ||
    blob.includes('ar_sa');

  const isHoda =
    blob.includes('hoda') ||
    blob.includes('هدى') ||
    blob.includes('هودا') ||
    blob.includes('areg') ||
    blob.includes('ar_eg');

  const isEgyptian =
    isHoda ||
    lang.startsWith('ar-eg') ||
    blob.includes('egypt') ||
    blob.includes('egyptian');

  const isGulf =
    isSaudi ||
    lang.startsWith('ar-ae') ||
    lang.startsWith('ar-kw') ||
    lang.startsWith('ar-qa') ||
    lang.startsWith('ar-bh') ||
    lang.startsWith('ar-om') ||
    blob.includes('gulf') ||
    blob.includes('emirati') ||
    blob.includes('khaleeji');

  const isNatural =
    blob.includes('natural') || blob.includes('online') || blob.includes('neural');

  // Never miss Arabic: lang ar*, Arabic script in name, known voice names, "arab*"
  const isArabic =
    lang.startsWith('ar') ||
    /(^|[^a-z])ar([^a-z]|$)/.test(lang) ||
    hasArabicScript ||
    blob.includes('arab') ||
    blob.includes('arabic') ||
    isHoda ||
    isSaudi ||
    isEgyptian ||
    blob.includes('msa') ||
    blob.includes('fusha') ||
    blob.includes('fuṣḥ') ||
    blob.includes('فصح');

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

type VoiceOption = {
  id: string;
  label: string;
  voice: SpeechSynthesisVoice;
  isArabic: boolean;
};

function getVoicePref(): string | null {
  try {
    const pref = localStorage.getItem(VOICE_PREF_KEY);
    // Drop old fake Hoda/Naayf lang entries (they sounded like Naayf in Chrome)
    if (pref && pref.startsWith('__lang:')) {
      localStorage.removeItem(VOICE_PREF_KEY);
      return null;
    }
    return pref;
  } catch {
    return null;
  }
}

/** Prefer English, then any other non-Arabic voice (exactly one “default”). */
function pickBestNonArabicVoice(
  voices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | null {
  const other = voices.filter((v) => !voiceMeta(v).isArabic);
  if (!other.length) return null;

  const score = (v: SpeechSynthesisVoice): number => {
    const lang = (v.lang || '').toLowerCase();
    const name = (v.name || '').toLowerCase();
    if (lang.startsWith('en-us') || name.includes('zira') || name.includes('david')) return 0;
    if (lang.startsWith('en-gb') || name.includes('hazel') || name.includes('george')) return 1;
    if (lang.startsWith('en')) return 2;
    return 50;
  };

  return [...other].sort((a, b) => {
    const d = score(a) - score(b);
    if (d !== 0) return d;
    return (a.name || '').localeCompare(b.name || '');
  })[0];
}

/**
 * Only voices the *browser* can actually use (speechSynthesis.getVoices()).
 * Includes every Arabic voice we can detect (lang, English name, or Arabic-script name).
 */
function buildArabicOptions(voices: SpeechSynthesisVoice[]): VoiceOption[] {
  // Dedupe by voiceURI+name+lang in case the browser lists duplicates
  const seen = new Set<string>();
  const arabic: SpeechSynthesisVoice[] = [];
  for (const v of voices) {
    if (!voiceMeta(v).isArabic) continue;
    const key = voiceUri(v);
    if (seen.has(key)) continue;
    seen.add(key);
    arabic.push(v);
  }
  return arabic
    .sort((a, b) => voiceRank(a) - voiceRank(b))
    .map((v) => ({
      id: voiceUri(v),
      label: v.name || v.lang || 'Arabic',
      voice: v,
      isArabic: true,
    }));
}

function buildSelectableOptions(voices: SpeechSynthesisVoice[]): VoiceOption[] {
  const arabic = buildArabicOptions(voices);
  const nonAr = pickBestNonArabicVoice(voices);
  if (!nonAr) return arabic;
  return [
    ...arabic,
    {
      id: voiceUri(nonAr),
      label: nonAr.name || nonAr.lang || 'English',
      voice: nonAr,
      isArabic: false,
    },
  ];
}

function defaultOption(options: VoiceOption[]): VoiceOption | null {
  const arabic = options.filter((o) => o.isArabic);
  if (arabic.length) return arabic[0];
  return options[0] ?? null;
}

function resolveOption(
  voices: SpeechSynthesisVoice[],
  options?: VoiceOption[]
): VoiceOption | null {
  const list = options ?? buildSelectableOptions(voices);
  const pref = getVoicePref();
  if (pref) {
    const found = list.find((o) => o.id === pref);
    if (found) return found;
  }
  return defaultOption(list);
}

/** @deprecated kept for callers — best native Arabic voice if listed */
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

/**
 * Play with the selected/default system voice.
 * Arabic voices speak Arabic script; non-Arabic voices use romanization.
 * Only voices returned by the browser can play — Windows-installed but Chrome-hidden voices cannot.
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
    const options = buildSelectableOptions(all);
    if (!options.length) {
      showToast('No voice available');
      return;
    }

    const chosen = resolveOption(all, options);
    if (!chosen) {
      showToast('No voice available');
      return;
    }

    if (chosen.isArabic) {
      const ok = await speakLocal(clean, chosen.voice, chosen.voice.lang || 'ar');
      if (gen !== speakGen) return;
      if (!ok) showToast('No voice available');
      return;
    }

    const latin = romanizeArabic(clean);
    const ok = await speakLocal(latin, chosen.voice, chosen.voice.lang || 'en-US');
    if (gen !== speakGen) return;
    if (!ok) showToast('No voice available');
  } finally {
    finish();
  }
}

/** Dropdown: only voices the browser can actually use. */
export async function mountTtsVoicePicker(host: HTMLElement) {
  if (!ttsSupported()) return;

  host.querySelector('.tts-voice-bar')?.remove();

  const all = await listAllVoices();
  const options = buildSelectableOptions(all);
  const arabicOpts = options.filter((o) => o.isArabic);
  const nonArOpts = options.filter((o) => !o.isArabic);

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

  if (!options.length) {
    select.disabled = true;
    addOpt('', 'No voice available');
  } else {
    if (arabicOpts.length) {
      const g = document.createElement('optgroup');
      g.label = 'Arabic Voices';
      for (const o of arabicOpts) addOpt(o.id, o.label, g);
      select.appendChild(g);
    }

    if (nonArOpts.length) {
      const g = document.createElement('optgroup');
      g.label = 'Non-Arabic Voice Default';
      for (const o of nonArOpts) addOpt(o.id, o.label, g);
      select.appendChild(g);
    }

    const resolved = resolveOption(all, options);
    const pref = getVoicePref();
    if (pref && options.some((o) => o.id === pref)) {
      select.value = pref;
    } else if (resolved) {
      select.value = resolved.id;
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
