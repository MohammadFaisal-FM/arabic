/**
 * Multi-clause everyday Saudi/Najdi example enrichment.
 * Used for Ism / Ḥarf (and short root examples) so learners keep meeting new vocab.
 * Arabic + English are returned separately for the two-column table.
 */

const PLACES = [
  { ar: 'في المطبخ', en: 'in the kitchen', t: 'مطبخ' },
  { ar: 'عند الباب', en: 'at the door', t: 'باب' },
  { ar: 'جنب النافذة', en: 'beside the window', t: 'نافذة' },
  { ar: 'في السيارة', en: 'in the car', t: 'سيارة-مكان' },
  { ar: 'على المكتب', en: 'on the desk', t: 'مكتب-مكان' },
  { ar: 'في الحقيبة', en: 'in the bag', t: 'حقيبة-مكان' },
  { ar: 'قدام التلفاز', en: 'in front of the TV', t: 'تلفاز' },
  { ar: 'في الثلاجة', en: 'in the fridge', t: 'ثلاجة-مكان' },
  { ar: 'تحت السرير', en: 'under the bed', t: 'سرير' },
  { ar: 'في الدرج', en: 'in the drawer', t: 'درج-مكان' },
  { ar: 'عند الاستقبال', en: 'at reception', t: 'استقبال-مكان' },
  { ar: 'في الصالون', en: 'in the living room', t: 'صالون-مكان' },
  { ar: 'جنب المسجد', en: 'next to the mosque', t: 'مسجد' },
  { ar: 'في البقالة', en: 'at the grocery', t: 'بقالة-مكان' },
  { ar: 'عند الصيدلية', en: 'at the pharmacy', t: 'صيدلية-مكان' },
  { ar: 'في المكتبة', en: 'in the library', t: 'مكتبة-مكان' },
  { ar: 'قدام المصعد', en: 'in front of the elevator', t: 'مصعد' },
  { ar: 'في الحديقة', en: 'in the park', t: 'حديقة-مكان' },
  { ar: 'على الشرفة', en: 'on the balcony', t: 'شرفة-مكان' },
  { ar: 'في الغرفة', en: 'in the room', t: 'غرفة-مكان' },
  { ar: 'جنب البنك', en: 'next to the bank', t: 'بنك-مكان' },
  { ar: 'في المحطة', en: 'at the station', t: 'محطة-مكان' },
  { ar: 'عند العيادة', en: 'at the clinic', t: 'عيادة' },
  { ar: 'في المدرسة', en: 'at school', t: 'مدرسة' },
  { ar: 'قدام الملعب', en: 'in front of the pitch', t: 'ملعب' },
];

const REASONS = [
  { ar: 'لأن الوقت ضيق', en: 'because time is tight', t: 'وقت-ضيق' },
  { ar: 'عشان ما نتأخر', en: 'so we are not late', t: 'نتأخر' },
  { ar: 'لأن الجو حار شوي', en: 'because the weather is a bit hot', t: 'جو-حار' },
  { ar: 'قبل ما يقفل المكان', en: 'before the place closes', t: 'يقفل' },
  { ar: 'عشان الضيوف يوصلون', en: 'because guests are arriving', t: 'ضيوف-ي' },
  { ar: 'لأن البطارية ضعيفة', en: 'because the battery is low', t: 'بطارية-ض' },
  { ar: 'قبل صلاة المغرب', en: 'before Maghrib prayer', t: 'مغرب-ص' },
  { ar: 'عشان الدراسة بكرة', en: 'for studying tomorrow', t: 'دراسة-ب' },
  { ar: 'لأن الزحمة قوية', en: 'because traffic is heavy', t: 'زحمة' },
  { ar: 'بس خلّه قريب منك', en: 'but keep it near you', t: 'قريب' },
  { ar: 'عشان الصورة تطلع أوضح', en: 'so the photo comes out clearer', t: 'صورة-أ' },
  { ar: 'لأن الولد نعسان', en: 'because the boy is sleepy', t: 'نعسان' },
  { ar: 'قبل ما يبرد الأكل', en: 'before the food gets cold', t: 'أكل-بارد' },
  { ar: 'عشان المراجعة أسهل', en: 'so revision is easier', t: 'مراجعة-س' },
  { ar: 'لأن الشغل خلص بدري', en: 'because work finished early', t: 'شغل-بدري' },
  { ar: 'إذا احتجته بعدين', en: 'if you need it later', t: 'احتجته' },
  { ar: 'عشان ما يضيع', en: 'so it doesn’t get lost', t: 'يضيع-س' },
  { ar: 'لأن الإضاءة أحسن هناك', en: 'because the light is better there', t: 'إضاءة' },
  { ar: 'قبل ما يجي السائق', en: 'before the driver arrives', t: 'سائق' },
  { ar: 'عشان نلحق الموعد', en: 'so we make the appointment', t: 'نلحق' },
];

const FOLLOWUPS = [
  { ar: 'وبعدين رتّبت الطاولة', en: 'then I tidied the table', t: 'رتبت' },
  { ar: 'وبعدها سكّرت الشباك', en: 'then I closed the window', t: 'سكرت' },
  { ar: 'وبعد كده رنّ الجوال', en: 'and then the phone rang', t: 'رن-جوال' },
  { ar: 'وبعدين شربت ميّ', en: 'then I drank some water', t: 'شربت-مي' },
  { ar: 'وبعدها طفّيت النور', en: 'then I turned off the light', t: 'طفيت' },
  { ar: 'وبعدين كتبت ملاحظة', en: 'then I wrote a note', t: 'كتبت-م' },
  { ar: 'وبعدها مسحت الأرض', en: 'then I wiped the floor', t: 'مسحت' },
  { ar: 'وبعدين فتحت المروحة', en: 'then I turned on the fan', t: 'مروحة-ف' },
  { ar: 'وبعد كده صلّينا', en: 'and then we prayed', t: 'صلينا' },
  { ar: 'وبعدين ردّيت على الرسالة', en: 'then I replied to the message', t: 'رديت' },
  { ar: 'وبعدها غسّلت يديني', en: 'then I washed my hands', t: 'غسلت' },
  { ar: 'وبعدين شحنت الجهاز', en: 'then I charged the device', t: 'شحنت' },
  { ar: 'وبعدها نام الولد', en: 'then the boy slept', t: 'نام-و' },
  { ar: 'وبعدين قفلنا الباب', en: 'then we locked the door', t: 'قفلنا' },
  { ar: 'وبعد كده ضحكنا شوي', en: 'and then we laughed a bit', t: 'ضحكنا-ش' },
];

const COMPANIONS = [
  { ar: 'الدفتر الأزرق', en: 'the blue notebook', t: 'دفتر-أزرق' },
  { ar: 'الكوب الزجاج', en: 'the glass cup', t: 'كوب-زجاج' },
  { ar: 'المنديل النظيف', en: 'the clean tissue', t: 'منديل-ن' },
  { ar: 'القلم الرصاص', en: 'the pencil', t: 'قلم-ر' },
  { ar: 'الشاحن الطويل', en: 'the long charger', t: 'شاحن-ط' },
  { ar: 'الغطاء الشفاف', en: 'the clear cover', t: 'غطاء' },
  { ar: 'الملعقة الصغيرة', en: 'the small spoon', t: 'ملعقة-ص' },
  { ar: 'الكرتون الفاضي', en: 'the empty carton', t: 'كرتون' },
  { ar: 'المنبه القديميم', en: 'the old alarm', t: 'منبه-ق' },
  { ar: 'البطاقة الصفراء', en: 'the yellow card', t: 'بطاقة-ص' },
  { ar: 'المفتاح الاحتياطي', en: 'the spare key', t: 'مفتاح-ا' },
  { ar: 'الزجاجة الفارغة', en: 'the empty bottle', t: 'زجاجة' },
  { ar: 'الكابل القصير', en: 'the short cable', t: 'كابل-ق' },
  { ar: 'الدباسة', en: 'the stapler', t: 'دباسة' },
  { ar: 'المقص الحاد', en: 'the sharp scissors', t: 'مقص-ح' },
  { ar: 'اللاصق الشفاف', en: 'the clear tape', t: 'لاصق' },
  { ar: 'الملف الورقي', en: 'the paper file', t: 'ملف-و' },
  { ar: 'المحفظة البنية', en: 'the brown wallet', t: 'محفظة-ب' },
  { ar: 'النظارة الشمسية', en: 'the sunglasses', t: 'نظارة-ش' },
  { ar: 'الوسادة الناعمة', en: 'the soft pillow', t: 'وسادة-ن' },
  { ar: 'البطانية الخفيفة', en: 'the light blanket', t: 'بطانية-خ' },
  { ar: 'الحذاء النظيف', en: 'the clean shoes', t: 'حذاء-ن' },
  { ar: 'الجورب الأبيض', en: 'the white sock', t: 'جورب' },
  { ar: 'القبعة الصيفية', en: 'the summer hat', t: 'قبعة-ص' },
  { ar: 'الوشاح الرمادي', en: 'the grey scarf', t: 'وشاح-ر' },
];

const used = new Set();
let placeI = 0;
let reasonI = 0;
let followI = 0;
let companionI = 0;

const HARD_BANS = [
  'لازانيا',
  'lasagna',
  'مطعم',
  'restaurant',
  'إيطالي',
  'italian',
  'الطائف',
  'taif',
  'جدة',
  'jeddah',
  'ويكند',
  'weekend',
];

export function seedEnrichmentBans(texts) {
  for (const h of HARD_BANS) used.add(h.toLowerCase());
  for (const text of texts) {
    const t = String(text || '');
    const lower = t.toLowerCase();
    for (const pool of [PLACES, REASONS, FOLLOWUPS, COMPANIONS]) {
      for (const item of pool) {
        if (t.includes(item.t) || t.includes(item.ar) || lower.includes(item.en.toLowerCase())) {
          used.add(item.t.toLowerCase());
        }
      }
    }
    for (const h of HARD_BANS) {
      if (lower.includes(h) || t.includes(h)) used.add(h);
    }
  }
}

function claim(token) {
  used.add(String(token).toLowerCase());
}

function pick(list, cursorName) {
  const cursors = { placeI, reasonI, followI, companionI };
  let cursor = cursors[cursorName];
  for (let i = 0; i < list.length; i++) {
    const idx = (cursor + i) % list.length;
    const item = list[idx];
    if (!used.has(item.t.toLowerCase())) {
      claim(item.t);
      const next = (idx + 1) % list.length;
      if (cursorName === 'placeI') placeI = next;
      if (cursorName === 'reasonI') reasonI = next;
      if (cursorName === 'followI') followI = next;
      if (cursorName === 'companionI') companionI = next;
      return item;
    }
  }
  const item = list[cursor % list.length];
  const next = (cursor + 1) % list.length;
  if (cursorName === 'placeI') placeI = next;
  if (cursorName === 'reasonI') reasonI = next;
  if (cursorName === 'followI') followI = next;
  if (cursorName === 'companionI') companionI = next;
  return item;
}

export function isRichExample(text) {
  const t = (text || '').trim();
  if (!t) return false;
  if (t.length >= 48) return true;
  if (t.includes('،') || t.includes(',')) return true;
  if (/عشان|لأن|وبعدين|وبعدها|بس |إذا /.test(t)) return true;
  return false;
}

function articleGloss(gloss) {
  const g = (gloss || 'it').trim();
  if (!g) return 'it';
  if (/^(a|an|the)\s/i.test(g)) return g;
  if (/^[aeiou]/i.test(g)) return `an ${g}`;
  return `a ${g}`;
}

function looksAnimate(meaning) {
  const m = (meaning || '').toLowerCase();
  return /father|mother|dad|mom|boy|girl|man|woman|person|people|friend|child|baby|teacher|doctor|driver|guest|brother|sister|son|daughter|family|أب|أم|ولد|بنت|رجل|امرأة|صديق|طفل|معلم|دكتور|سائق|ضيف|أخ|أخت|ابن|عائلة/.test(
    m
  );
}

function followClause(follow) {
  const ar = follow.ar.replace(/^و/, '');
  const en = follow.en.replace(/^and\s+/i, '');
  return { ar, en };
}

/**
 * One multi-clause sentence featuring an ism (noun).
 * @returns {{ ar: string, en: string }}
 */
export function enrichIsmExample(arabic, meaning) {
  const word = (arabic || '').trim();
  const gloss = articleGloss((meaning || 'thing').split(/[,/·]/)[0].trim().toLowerCase());
  const place = pick(PLACES, 'placeI');
  const reason = pick(REASONS, 'reasonI');
  const follow = followClause(pick(FOLLOWUPS, 'followI'));
  const companion = pick(COMPANIONS, 'companionI');
  const animate = looksAnimate(meaning);

  const pattern = (placeI + reasonI + followI) % 3;
  if (animate) {
    if (pattern === 0) {
      return {
        ar: `شفت ${word} ${place.ar}، ${reason.ar}، و${follow.ar}`,
        en: `I saw ${gloss} ${place.en}, ${reason.en}, and ${follow.en}`,
      };
    }
    if (pattern === 1) {
      return {
        ar: `تكلّمنا عن ${word} شوي، ${reason.ar}، و${follow.ar}`,
        en: `We talked about ${gloss} a bit, ${reason.en}, and ${follow.en}`,
      };
    }
    return {
      ar: `${word} كان/كانت ${place.ar}، ${reason.ar}، و${follow.ar}`,
      en: `${gloss} was ${place.en}, ${reason.en}, and ${follow.en}`,
    };
  }

  if (pattern === 0) {
    return {
      ar: `لقيت ${word} ${place.ar} مع ${companion.ar}، ${reason.ar}، و${follow.ar}`,
      en: `I found ${gloss} ${place.en} with ${companion.en}, ${reason.en}, and ${follow.en}`,
    };
  }
  if (pattern === 1) {
    return {
      ar: `حطّيت ${word} ${place.ar}، ${reason.ar}، و${follow.ar}`,
      en: `I put ${gloss} ${place.en}, ${reason.en}, and ${follow.en}`,
    };
  }
  return {
    ar: `أحتاج ${word} الحين ${place.ar}، ${reason.ar}، وخذيت كمان ${companion.ar}`,
    en: `I need ${gloss} now ${place.en}, ${reason.en}, and I also took ${companion.en}`,
  };
}

/**
 * One multi-clause sentence featuring a ḥarf (particle).
 * @returns {{ ar: string, en: string }}
 */
export function enrichHarfExample(arabic, meaning, existingAr = '') {
  const particle = (arabic || '').trim();
  const gloss = (meaning || 'particle').split(/[,/·]/)[0].trim().toLowerCase();
  const place = pick(PLACES, 'placeI');
  const reason = pick(REASONS, 'reasonI');
  const follow = followClause(pick(FOLLOWUPS, 'followI'));
  const companion = pick(COMPANIONS, 'companionI');

  // Keep a short core if it already uses the particle naturally
  const core = (existingAr || '').split('—')[0].trim();
  if (core && core.includes(particle) && core.length >= 6 && core.length <= 40) {
    return {
      ar: `${core}، ${reason.ar}، و${follow.ar}`,
      en: `${core} (${gloss}), ${reason.en}, and ${follow.en}`,
    };
  }

  return {
    ar: `خلّينا نحط ${companion.ar} ${place.ar}، ${reason.ar}، و${follow.ar}`,
    en: `Let’s put ${companion.en} ${place.en} (${gloss}: ${particle}), ${reason.en}, and ${follow.en}`,
  };
}

/** Cleaner ḥarf templates by common particles. */
export function enrichHarfExampleSmart(item) {
  const id = item.id || '';
  const ar = item.arabic || '';
  const meaning = item.meaning || '';
  const place = pick(PLACES, 'placeI');
  const reason = pick(REASONS, 'reasonI');
  const follow = followClause(pick(FOLLOWUPS, 'followI'));
  const companion = pick(COMPANIONS, 'companionI');

  // Prefer a clear particle + companion sentence over awkward generics.
  const templates = {
    fi: {
      ar: `خلي ${companion.ar} في مكان ثابت ${place.ar}، ${reason.ar}، و${follow.ar}`,
      en: `Leave ${companion.en} in a fixed spot ${place.en}, ${reason.en}, and ${follow.en}`,
    },
    ala: {
      ar: `حط ${companion.ar} على سطح نظيف، ${reason.ar}، و${follow.ar}`,
      en: `Put ${companion.en} on a clean surface, ${reason.en}, and ${follow.en}`,
    },
    min: {
      ar: `خذيت ${companion.ar} من الرف، ${reason.ar}، و${follow.ar}`,
      en: `I took ${companion.en} from the shelf, ${reason.en}, and ${follow.en}`,
    },
    ila: {
      ar: `وديّت ${companion.ar} إلى المكتب، ${reason.ar}، و${follow.ar}`,
      en: `I took ${companion.en} to the office, ${reason.en}, and ${follow.en}`,
    },
    an: {
      ar: `تكلّمنا عن الموضوع بهدوء، وحطينا ${companion.ar} ${place.ar}، ${reason.ar}`,
      en: `We talked about the topic calmly, and put ${companion.en} ${place.en}, ${reason.en}`,
    },
    dun: {
      ar: `سويت القهوة بدون سكر، وخليت ${companion.ar} ${place.ar}، ${reason.ar}`,
      en: `I made coffee without sugar, and left ${companion.en} ${place.en}, ${reason.en}`,
    },
    maa: {
      ar: `رحت السوق مع أخوي، وخذا ${companion.ar}، ${reason.ar}`,
      en: `I went to the market with my brother, and he took ${companion.en}, ${reason.en}`,
    },
    inda: {
      ar: `عندي ${companion.ar} الحين، ${reason.ar}، و${follow.ar}`,
      en: `I have ${companion.en} now, ${reason.en}, and ${follow.en}`,
    },
    bi: {
      ar: `وصلت بالسيارة، وحطيت ${companion.ar} ${place.ar}، ${reason.ar}`,
      en: `I arrived by car, and put ${companion.en} ${place.en}, ${reason.en}`,
    },
    wa: {
      ar: `أخذت ${companion.ar} والدفتر، ${reason.ar}، و${follow.ar}`,
      en: `I took ${companion.en} and the notebook, ${reason.en}, and ${follow.en}`,
    },
    aw: {
      ar: `تبغى شاي أو قهوة؟ خلّ ${companion.ar} ${place.ar} لين تقرر`,
      en: `Do you want tea or coffee? Leave ${companion.en} ${place.en} until you decide`,
    },
    lakin: {
      ar: `أبي أطلع، لكن الجو مو زين، فخلّيت ${companion.ar} ${place.ar}`,
      en: `I want to go out, but the weather isn’t good, so I left ${companion.en} ${place.en}`,
    },
    ashan: {
      ar: `رتّبت الغرفة عشان الضيوف، وحطيت ${companion.ar} ${place.ar}`,
      en: `I tidied the room for the guests, and put ${companion.en} ${place.en}`,
    },
    ween: {
      ar: `وين ${companion.ar}؟ دوّرت ${place.ar}، ${reason.ar}`,
      en: `Where is ${companion.en}? I looked ${place.en}, ${reason.en}`,
    },
    lesh: {
      ar: `ليش ${companion.ar} هنا؟ ${reason.ar}، و${follow.ar}`,
      en: `Why is ${companion.en} here? ${reason.en}, and ${follow.en}`,
    },
    kayf: {
      ar: `كيف أوصّل ${companion.ar} ${place.ar} بدون ما يتضرر؟ ${reason.ar}`,
      en: `How do I get ${companion.en} ${place.en} without it getting damaged? ${reason.en}`,
    },
    mata: {
      ar: `متى آخذ ${companion.ar}؟ ${reason.ar}، و${follow.ar}`,
      en: `When should I take ${companion.en}? ${reason.en}, and ${follow.en}`,
    },
    bass: {
      ar: `بس خلّ ${companion.ar} قريب، ${reason.ar}، و${follow.ar}`,
      en: `Just keep ${companion.en} nearby, ${reason.en}, and ${follow.en}`,
    },
    baadyn: {
      ar: `خلّنا نكمّل بعدين، حط ${companion.ar} ${place.ar} الحين`,
      en: `Let’s continue later; put ${companion.en} ${place.en} for now`,
    },
    la: {
      ar: `لا تخلّي ${companion.ar} على الأرض، حطّه ${place.ar}، ${reason.ar}`,
      en: `Don’t leave ${companion.en} on the floor; put it ${place.en}, ${reason.en}`,
    },
    ma: {
      ar: `ما لقيت ${companion.ar} أول، بعدين لقيته ${place.ar}، ${reason.ar}`,
      en: `I didn’t find ${companion.en} at first, then I found it ${place.en}, ${reason.en}`,
    },
    mo: {
      ar: `هذا مو مكان ${companion.ar}، خلّه ${place.ar}، ${reason.ar}`,
      en: `This isn’t the place for ${companion.en}; leave it ${place.en}, ${reason.en}`,
    },
  };

  if (templates[id]) return templates[id];

  const { ar: existingAr, en: existingEn } = splitMaybe(item.example);
  if (isRichExample(existingAr)) {
    return { ar: existingAr, en: existingEn || meaning };
  }

  return {
    ar: `استخدمنا «${ar}» في الجملة، وحطينا ${companion.ar} ${place.ar}، ${reason.ar}، و${follow.ar}`,
    en: `We used “${ar}” (${meaning}) in the sentence, and put ${companion.en} ${place.en}, ${reason.en}, and ${follow.en}`,
  };
}

function splitMaybe(line) {
  const t = (line || '').trim();
  const idx = t.indexOf(' — ');
  if (idx >= 0) return { ar: t.slice(0, idx).trim(), en: t.slice(idx + 3).trim() };
  return { ar: t, en: '' };
}

export function enrichRootExample(exampleLine, rootMeaning) {
  const { ar, en } = splitMaybe(exampleLine);
  if (isRichExample(ar)) return { ar, en };
  const place = pick(PLACES, 'placeI');
  const reason = pick(REASONS, 'reasonI');
  const follow = followClause(pick(FOLLOWUPS, 'followI'));
  const companion = pick(COMPANIONS, 'companionI');
  const gloss = (rootMeaning || 'this').split(/[,/·]/)[0].trim();
  const baseAr = ar || `سويت شيء (${gloss})`;
  const baseEn = en || `I did something (${gloss})`;
  return {
    ar: `${baseAr}، ولقيت ${companion.ar} ${place.ar}، ${reason.ar}، و${follow.ar}`,
    en: `${baseEn}, and I found ${companion.en} ${place.en}, ${reason.en}, and ${follow.en}`,
  };
}
