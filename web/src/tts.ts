/**
 * Device TTS for Arabic learning:
 *  1) User-selected voice from dropdown (all system voices listed)
 *  2) Auto: Naayf/Saudi → Hoda/other Arabic → romanized (always audible)
 *
 * Voices come from the OS/browser on the current device (Windows / Android / iPhone).
 * The website does not host voices.
 */

const VOICE_PREF_KEY = 'arabic-tts-voice-uri';
const HINT_KEY = 'arabic-tts-quality-hint';
const AUTO_VALUE = '__auto__';
const ROMANIZED_VALUE = '__romanized__';

let cachedVoices: SpeechSynthesisVoice[] | null = null;
let voicesReady: Promise<SpeechSynthesisVoice[]> | null = null;

type PlayTier = 'saudi' | 'arabic' | 'romanized' | 'picked';

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

function getVoicePref(): string {
  try {
    return localStorage.getItem(VOICE_PREF_KEY) || AUTO_VALUE;
  } catch {
    return AUTO_VALUE;
  }
}

function findVoiceByUri(
  voices: SpeechSynthesisVoice[],
  uri: string
): SpeechSynthesisVoice | null {
  return voices.find((v) => voiceUri(v) === uri) ?? null;
}

export async function pickArabicVoice(): Promise<SpeechSynthesisVoice | null> {
  const arabic = await listArabicVoices();
  return arabic[0] ?? null;
}

export async function hasSaudiVoice(): Promise<boolean> {
  const arabic = await listArabicVoices();
  return arabic.some((v) => voiceMeta(v).isSaudi);
}

const INSTALL_HINT =
  'Tip: on Windows add Arabic voices in Settings → Speech → Add voices (Naayf / Hoda).';

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

    if (tier === 'picked') {
      if (!tipSeen) {
        showToast(`Playing with selected voice${voiceName ? `: ${voiceName}` : ''}.`, 3500);
      }
      return;
    }
    if (tier === 'saudi') {
      if (!tipSeen) {
        showToast(`Playing Saudi voice${voiceName ? ` (${voiceName})` : ''}.`, 3200);
      }
      return;
    }
    if (tier === 'arabic') {
      showToast(
        tipSeen
          ? `Playing Arabic voice${voiceName ? ` (${voiceName})` : ''}.`
          : `Playing Arabic voice${voiceName ? ` (${voiceName})` : ''}. ${INSTALL_HINT}`,
        tipSeen ? 4000 : 8000
      );
      return;
    }
    showToast(
      tipSeen
        ? 'Playing romanized Arabic (no usable Arabic voice).'
        : `Playing romanized Arabic so you still hear something. ${INSTALL_HINT}`,
      tipSeen ? 4500 : 9000
    );
  } catch {
    showToast('Playing audio…');
  }
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
  const m = voiceMeta(v);
  let tag = v.lang || 'voice';
  if (m.isSaudi) tag = 'Saudi';
  else if (m.isHoda) tag = 'Hoda / Arabic';
  else if (m.isEgyptian) tag = 'Egyptian';
  else if (m.isGulf) tag = 'Gulf';
  else if (m.isArabic) tag = 'Arabic';
  return `${v.name} · ${tag}`;
}

/**
 * Auto cascade + optional manual voice from dropdown.
 * Manual non-Arabic voices speak romanized text so audio is audible.
 */
export async function speakArabic(text: string, btn?: HTMLButtonElement | null): Promise<void> {
  const clean = najdiSpeakHints(text);
  if (!clean) return;

  if (btn?.classList.contains('is-playing')) {
    stopArabicSpeech();
    return;
  }

  if (!ttsSupported()) {
    showToast('Speech not supported in this browser — try Edge or Chrome.');
    return;
  }

  const gen = ++speakGen;
  if (btn) setPlaying(btn, true);

  const finish = () => {
    if (gen === speakGen) setPlaying(btn ?? null, false);
  };

  const stillActive = () => gen === speakGen;

  try {
    const all = await listAllVoices();
    const arabic = all.filter((v) => voiceMeta(v).isArabic);
    const saudi = arabic.filter((v) => voiceMeta(v).isSaudi);
    const hodaOrOther = arabic.filter((v) => !voiceMeta(v).isSaudi);
    const pref = getVoicePref();

    // Force romanized mode from dropdown
    if (pref === ROMANIZED_VALUE) {
      const fallbackVoice =
        all.find((v) => !voiceMeta(v).isArabic) ?? all[0] ?? null;
      const latin = romanizeArabic(clean);
      announcePlaying('romanized', fallbackVoice?.name);
      await speakLocal(latin, fallbackVoice, fallbackVoice?.lang || 'en-US');
      return;
    }

    // Manual voice from dropdown
    if (pref !== AUTO_VALUE) {
      const picked = findVoiceByUri(all, pref);
      if (picked && stillActive()) {
        const m = voiceMeta(picked);
        if (m.isArabic) {
          announcePlaying('picked', picked.name);
          const ok = await speakLocal(clean, picked, picked.lang || 'ar');
          if (!stillActive()) return;
          if (ok) return;
          // Arabic voice failed → romanize with same voice / any voice
          const latin = romanizeArabic(clean);
          announcePlaying('romanized', picked.name);
          await speakLocal(latin, picked, picked.lang || 'en-US');
          return;
        }
        // Non-Arabic voice: romanize so the user actually hears something
        const latin = romanizeArabic(clean);
        announcePlaying('romanized', picked.name);
        await speakLocal(latin, picked, picked.lang || 'en-US');
        return;
      }
    }

    // Auto: Naayf/Saudi → Hoda/other Arabic → romanized
    if (saudi[0] && stillActive()) {
      announcePlaying('saudi', saudi[0].name);
      const ok = await speakLocal(clean, saudi[0], saudi[0].lang || 'ar-SA');
      if (!stillActive()) return;
      if (ok) return;
    }

    if (hodaOrOther[0] && stillActive()) {
      announcePlaying('arabic', hodaOrOther[0].name);
      const ok = await speakLocal(
        clean,
        hodaOrOther[0],
        hodaOrOther[0].lang || 'ar'
      );
      if (!stillActive()) return;
      if (ok) return;
    }

    if (stillActive()) {
      const fallbackVoice =
        all.find((v) => !voiceMeta(v).isArabic) ?? all[0] ?? null;
      const latin = romanizeArabic(clean);
      announcePlaying('romanized', fallbackVoice?.name);
      const ok = await speakLocal(
        latin,
        fallbackVoice,
        fallbackVoice?.lang || 'en-US'
      );
      if (!stillActive()) return;
      if (ok) return;
    }

    if (stillActive()) {
      showToast(
        `No audible voice on this device. ${INSTALL_HINT} Or try your phone.`,
        10000
      );
    }
  } finally {
    finish();
  }
}

/** Dropdown lists every voice on this device + Auto / Romanized. */
export async function mountTtsVoicePicker(host: HTMLElement) {
  if (!ttsSupported()) return;

  // Remount so voice list refreshes when OS voices change
  host.querySelector('.tts-voice-bar')?.remove();

  const all = await listAllVoices();
  const arabic = all.filter((v) => voiceMeta(v).isArabic);
  const saudi = arabic.some((v) => voiceMeta(v).isSaudi);
  const hoda = arabic.some((v) => voiceMeta(v).isHoda);

  const bar = document.createElement('div');
  bar.className = 'tts-voice-bar';

  const label = document.createElement('label');
  label.className = 'tts-voice-label';
  if (saudi && hoda) {
    label.innerHTML =
      'Voice <span class="tts-voice-ok">Naayf + Hoda on this device</span>';
  } else if (saudi) {
    label.innerHTML =
      'Voice <span class="tts-voice-ok">Saudi (Naayf) available</span>';
  } else if (arabic.length) {
    label.innerHTML =
      'Voice <span class="tts-voice-ok">Arabic voice available</span>';
  } else {
    label.innerHTML =
      'Voice <span class="tts-voice-warn">no Arabic — Auto will romanize</span>';
  }

  const select = document.createElement('select');
  select.className = 'tts-voice-select';
  select.setAttribute('aria-label', 'TTS voice on this device');

  const addOpt = (value: string, text: string, group?: HTMLOptGroupElement) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = text;
    (group ?? select).appendChild(opt);
  };

  addOpt(AUTO_VALUE, 'Auto (Naayf → Hoda/Arabic → romanized)');
  addOpt(ROMANIZED_VALUE, 'Romanized Arabic (always audible)');

  if (arabic.length) {
    const g = document.createElement('optgroup');
    g.label = `Arabic on this device (${arabic.length})`;
    for (const v of arabic) addOpt(voiceUri(v), voiceLabel(v), g);
    select.appendChild(g);
  }

  const other = all.filter((v) => !voiceMeta(v).isArabic);
  if (other.length) {
    const g = document.createElement('optgroup');
    g.label = `Other system voices (${other.length})`;
    for (const v of other) addOpt(voiceUri(v), `${v.name} · ${v.lang || 'other'}`, g);
    select.appendChild(g);
  }

  if (!all.length) {
    select.disabled = true;
    addOpt(AUTO_VALUE, 'No voices found on this device');
  }

  const pref = getVoicePref();
  if ([...select.options].some((o) => o.value === pref)) {
    select.value = pref;
  } else {
    select.value = AUTO_VALUE;
  }

  select.addEventListener('change', () => {
    try {
      localStorage.setItem(VOICE_PREF_KEY, select.value);
    } catch {
      /* ignore */
    }
    if (select.value === AUTO_VALUE) {
      showToast('Auto voice saved — tap ▶', 3000);
    } else if (select.value === ROMANIZED_VALUE) {
      showToast('Romanized mode saved — tap ▶', 3000);
    } else {
      showToast('Voice saved — tap ▶ to hear it', 3000);
    }
  });

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
