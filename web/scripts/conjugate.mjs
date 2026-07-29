/**
 * Everyday Saudi / Najdi conjugation helper for Fiʿl pages.
 * Best-effort from Form past/present dictionary forms (sound patterns).
 *
 * Conjugation Examples are multi-clause sentences (not bare verb stubs).
 * Each sentence introduces fresh everyday vocab; content words are tracked
 * so the same noun/scene is not reused across Fiʿl pages in one generate run.
 */

import { escapeHtml, escapeTableCell } from './example-format.mjs';

const PRONOUNS = [
  { ar: 'أنا', en: 'I' },
  { ar: 'إحنا', en: 'we' },
  { ar: 'أنت', en: 'you (m.)' },
  { ar: 'أنتِ', en: 'you (f.)' },
  { ar: 'أنتم', en: 'you (pl.)' },
  { ar: 'هو', en: 'he' },
  { ar: 'هي', en: 'she' },
  { ar: 'هم', en: 'they' },
];

/** Unique nouns / noun phrases — each used at most once as the main object. */
const OBJECTS = [
  { ar: 'المظلة', en: 'the umbrella', t: 'مظلة' },
  { ar: 'التذكرة', en: 'the ticket', t: 'تذكرة' },
  { ar: 'الشنطة', en: 'the bag', t: 'شنطة' },
  { ar: 'الدواء', en: 'the medicine', t: 'دواء' },
  { ar: 'القائمة', en: 'the menu', t: 'قائمة' },
  { ar: 'الموعد', en: 'the appointment', t: 'موعد' },
  { ar: 'الصور', en: 'the photos', t: 'صور' },
  { ar: 'القهوة', en: 'the coffee', t: 'قهوة' },
  { ar: 'الهدايا', en: 'the gifts', t: 'هدايا' },
  { ar: 'الملاحظات', en: 'the notes', t: 'ملاحظات' },
  { ar: 'الملابس', en: 'the clothes', t: 'ملابس' },
  { ar: 'تذكرة القطار', en: 'the train ticket', t: 'قطار' },
  { ar: 'الماء البارد', en: 'the cold water', t: 'ماء بارد' },
  { ar: 'الخبز الطازج', en: 'the fresh bread', t: 'خبز' },
  { ar: 'الرسالة', en: 'the message', t: 'رسالة' },
  { ar: 'الخريطة', en: 'the map', t: 'خريطة' },
  { ar: 'الشمسية', en: 'the sunshade', t: 'شمسية' },
  { ar: 'كتب الأطفال', en: 'the children’s books', t: 'كتب أطفال' },
  { ar: 'الزيتون واللبنة', en: 'the olives and labneh', t: 'زيتون' },
  { ar: 'الشاي الأخضر', en: 'the green tea', t: 'شاي أخضر' },
  { ar: 'الحذاء الرياضي', en: 'the running shoes', t: 'حذاء' },
  { ar: 'فاتورة الكهرباء', en: 'the electricity bill', t: 'فاتورة' },
  { ar: 'بطاقة الدخول', en: 'the entry card', t: 'بطاقة دخول' },
  { ar: 'وصفة الكيك', en: 'the cake recipe', t: 'وصفة' },
  { ar: 'السماعات', en: 'the headphones', t: 'سماعات' },
  { ar: 'المنديل الورقي', en: 'the paper tissue', t: 'منديل' },
  { ar: 'القلم الأزرق', en: 'the blue pen', t: 'قلم' },
  { ar: 'شاحن الجوال', en: 'the phone charger', t: 'شاحن' },
  { ar: 'المفاتيح', en: 'the keys', t: 'مفاتيح' },
  { ar: 'الجريدة', en: 'the newspaper', t: 'جريدة' },
  { ar: 'المظلة الشمسية', en: 'the parasol', t: 'مظلة شمسية' },
  { ar: 'الوسادة', en: 'the pillow', t: 'وسادة' },
  { ar: 'البطانية', en: 'the blanket', t: 'بطانية' },
  { ar: 'الصحن', en: 'the plate', t: 'صحن' },
  { ar: 'الكوب', en: 'the cup', t: 'كوب' },
  { ar: 'الملعقة', en: 'the spoon', t: 'ملعقة' },
  { ar: 'السكينة', en: 'the knife', t: 'سكينة' },
  { ar: 'المنشفة', en: 'the towel', t: 'منشفة' },
  { ar: 'الصابون', en: 'the soap', t: 'صابون' },
  { ar: 'المعجون', en: 'the toothpaste', t: 'معجون' },
  { ar: 'الفرشاة', en: 'the brush', t: 'فرشاة' },
  { ar: 'المرآة', en: 'the mirror', t: 'مرآة' },
  { ar: 'المنبه', en: 'the alarm clock', t: 'منبه' },
  { ar: 'التقويم', en: 'the calendar', t: 'تقويم' },
  { ar: 'الدبوس', en: 'the pin', t: 'دبوس' },
  { ar: 'الملف', en: 'the file', t: 'ملف' },
  { ar: 'الظرف', en: 'the envelope', t: 'ظرف' },
  { ar: 'الطابع', en: 'the stamp', t: 'طابع' },
  { ar: 'الجواز', en: 'the passport', t: 'جواز' },
  { ar: 'التأشيرة', en: 'the visa', t: 'تأشيرة' },
  { ar: 'البطاقة البنكية', en: 'the bank card', t: 'بطاقة بنكية' },
  { ar: 'المحفظة', en: 'the wallet', t: 'محفظة' },
  { ar: 'النظارات', en: 'the glasses', t: 'نظارات' },
  { ar: 'العدسات', en: 'the contact lenses', t: 'عدسات' },
  { ar: 'القفازات', en: 'the gloves', t: 'قفازات' },
  { ar: 'الوشاح', en: 'the scarf', t: 'وشاح' },
  { ar: 'القبعة', en: 'the hat', t: 'قبعة' },
  { ar: 'الحزام', en: 'the belt', t: 'حزام' },
  { ar: 'الجوارب', en: 'the socks', t: 'جوارب' },
  { ar: 'الفانيلا', en: 'the undershirt', t: 'فانيلا' },
  { ar: 'البلوزة', en: 'the blouse', t: 'بلوزة' },
  { ar: 'البنطلون', en: 'the pants', t: 'بنطلون' },
  { ar: 'الفستان', en: 'the dress', t: 'فستان' },
  { ar: 'المعطف', en: 'the coat', t: 'معطف' },
  { ar: 'المظلة المطريّة', en: 'the rain umbrella', t: 'مظلة مطر' },
  { ar: 'الدراجة', en: 'the bicycle', t: 'دراجة' },
  { ar: 'الخوذة', en: 'the helmet', t: 'خوذة' },
  { ar: 'الكرة', en: 'the ball', t: 'كرة' },
  { ar: 'المضرب', en: 'the racket', t: 'مضرب' },
  { ar: 'الحبل', en: 'the rope', t: 'حبل' },
  { ar: 'المصباح', en: 'the lamp', t: 'مصباح' },
  { ar: 'الشاحنة الصغيرة', en: 'the small truck', t: 'شاحنة' },
  { ar: 'السلم', en: 'the ladder', t: 'سلم' },
  { ar: 'المطرقة', en: 'the hammer', t: 'مطرقة' },
  { ar: 'المسمار', en: 'the nail', t: 'مسمار' },
  { ar: 'المفك', en: 'the screwdriver', t: 'مفك' },
  { ar: 'الشريط اللاصق', en: 'the tape', t: 'شريط' },
  { ar: 'الغراء', en: 'the glue', t: 'غراء' },
  { ar: 'المقص', en: 'the scissors', t: 'مقص' },
  { ar: 'الحبر', en: 'the ink', t: 'حبر' },
  { ar: 'الدفتر الأحمر', en: 'the red notebook', t: 'دفتر أحمر' },
  { ar: 'الممحاة', en: 'the eraser', t: 'ممحاة' },
  { ar: 'المسطرة', en: 'the ruler', t: 'مسطرة' },
  { ar: 'البوصلة', en: 'the compass', t: 'بوصلة' },
  { ar: 'العدسة المكبرة', en: 'the magnifying glass', t: 'عدسة مكبرة' },
  { ar: 'المنظار', en: 'the binoculars', t: 'منظار' },
  { ar: 'الكاميرا', en: 'the camera', t: 'كاميرا' },
  { ar: 'البطارية الاحتياطية', en: 'the spare battery', t: 'بطارية احتياطية' },
  { ar: 'الكابل', en: 'the cable', t: 'كابل' },
  { ar: 'الماوس', en: 'the mouse', t: 'ماوس' },
  { ar: 'لوحة المفاتيح', en: 'the keyboard', t: 'لوحة مفاتيح' },
  { ar: 'السماعة الخارجية', en: 'the external speaker', t: 'سماعة خارجية' },
  { ar: 'المايك', en: 'the mic', t: 'مايك' },
  { ar: 'الحامل', en: 'the stand', t: 'حامل' },
  { ar: 'الحقيبة المدرسية', en: 'the school bag', t: 'حقيبة مدرسية' },
  { ar: 'الزمزمية', en: 'the water bottle', t: 'زمزمية' },
  { ar: 'السندويتش', en: 'the sandwich', t: 'سندويتش' },
  { ar: 'التفاحة', en: 'the apple', t: 'تفاحة' },
  { ar: 'الموز', en: 'the bananas', t: 'موز' },
  { ar: 'الجزر', en: 'the carrots', t: 'جزر' },
  { ar: 'الخيار', en: 'the cucumber', t: 'خيار' },
  { ar: 'الطماط', en: 'the tomatoes', t: 'طماط' },
  { ar: 'الخس', en: 'the lettuce', t: 'خس' },
  { ar: 'الأرز البسمتي', en: 'the basmati rice', t: 'أرز بسمتي' },
  { ar: 'العدس', en: 'the lentils', t: 'عدس' },
  { ar: 'الحمص', en: 'the chickpeas', t: 'حمص' },
  { ar: 'التمر', en: 'the dates', t: 'تمر' },
  { ar: 'العسل', en: 'the honey', t: 'عسل' },
  { ar: 'اللبن', en: 'the yogurt drink', t: 'لبن' },
  { ar: 'الحليب', en: 'the milk', t: 'حليب' },
  { ar: 'الجبنة', en: 'the cheese', t: 'جبنة' },
  { ar: 'البيض', en: 'the eggs', t: 'بيض' },
  { ar: 'الزيت', en: 'the oil', t: 'زيت' },
  { ar: 'الملح', en: 'the salt', t: 'ملح' },
  { ar: 'الفلفل', en: 'the pepper', t: 'فلفل' },
  { ar: 'الكمون', en: 'the cumin', t: 'كمون' },
  { ar: 'الزعفران', en: 'the saffron', t: 'زعفران' },
  { ar: 'القرفة', en: 'the cinnamon', t: 'قرفة' },
  { ar: 'الهيل', en: 'the cardamom', t: 'هيل' },
  { ar: 'النعناع', en: 'the mint', t: 'نعناع' },
  { ar: 'الريحان', en: 'the basil', t: 'ريحان' },
  { ar: 'الكزبرة', en: 'the cilantro', t: 'كزبرة' },
  { ar: 'البقدونس', en: 'the parsley', t: 'بقدونس' },
  { ar: 'الثوم', en: 'the garlic', t: 'ثوم' },
  { ar: 'البصل', en: 'the onion', t: 'بصل' },
  { ar: 'البطاطس', en: 'the potatoes', t: 'بطاطس' },
  { ar: 'الباذنجان', en: 'the eggplant', t: 'باذنجان' },
  { ar: 'الكوسا', en: 'the zucchini', t: 'كوسا' },
  { ar: 'القرع', en: 'the pumpkin', t: 'قرع' },
  { ar: 'الفطر', en: 'the mushrooms', t: 'فطر' },
  { ar: 'الذرة', en: 'the corn', t: 'ذرة' },
  { ar: 'الفول', en: 'the fava beans', t: 'فول' },
  { ar: 'الكيكة', en: 'the cake', t: 'كيكة' },
  { ar: 'البسكويت', en: 'the biscuits', t: 'بسكويت' },
  { ar: 'الشوكولاتة', en: 'the chocolate', t: 'شوكولاتة' },
  { ar: 'الآيسكريم', en: 'the ice cream', t: 'آيسكريم' },
  { ar: 'العصير الطبيعي', en: 'the fresh juice', t: 'عصير طبيعي' },
  { ar: 'السمoothie', en: 'the smoothie', t: 'سموثي' },
  { ar: 'الماء الغازي', en: 'the sparkling water', t: 'ماء غازي' },
  { ar: 'المشروب الغازي', en: 'the soft drink', t: 'مشروب غازي' },
  { ar: 'الثلج', en: 'the ice', t: 'ثلج' },
  { ar: 'المناديل المبللة', en: 'the wet wipes', t: 'مناديل مبللة' },
  { ar: 'المعقم', en: 'the sanitizer', t: 'معقم' },
  { ar: 'الكمامة', en: 'the mask', t: 'كمامة' },
  { ar: 'القفاز الطبي', en: 'the medical glove', t: 'قفاز طبي' },
  { ar: 'المطهر', en: 'the disinfectant', t: 'مطهر' },
  { ar: 'الضمادة', en: 'the bandage', t: 'ضمادة' },
  { ar: 'المرهم', en: 'the ointment', t: 'مرهم' },
  { ar: 'الحرارة', en: 'the thermometer', t: 'ميزان حرارة' },
  { ar: 'الفلاش', en: 'the flashlight', t: 'فلاش' },
  { ar: 'الولّاعة', en: 'the lighter', t: 'ولاعة' },
  { ar: 'الشمع', en: 'the candle', t: 'شمع' },
  { ar: 'الكبريت', en: 'the matches', t: 'كبريت' },
  { ar: 'البطارية الصغيرة', en: 'the small battery', t: 'بطارية صغيرة' },
  { ar: 'السلك', en: 'the wire', t: 'سلك' },
  { ar: 'المحول', en: 'the adapter', t: 'محول' },
  { ar: 'الراوتر', en: 'the router', t: 'راوتر' },
  { ar: 'كلمة السر', en: 'the password', t: 'كلمة سر' },
  { ar: 'الرمز', en: 'the code', t: 'رمز' },
  { ar: 'الإيصال', en: 'the receipt', t: 'إيصال' },
  { ar: 'الفاتورة الورقية', en: 'the paper invoice', t: 'فاتورة ورقية' },
  { ar: 'العقد', en: 'the contract', t: 'عقد' },
  { ar: 'الاستمارة', en: 'the form', t: 'استمارة' },
  { ar: 'الطابع الزمني', en: 'the timestamp', t: 'طابع زمني' },
];

const PLACES = [
  { ar: 'من السيارة', en: 'from the car', t: 'سيارة' },
  { ar: 'من الرف', en: 'from the shelf', t: 'رف' },
  { ar: 'من التطبيق', en: 'from the app', t: 'تطبيق' },
  { ar: 'من الدرج', en: 'from the drawer', t: 'درج' },
  { ar: 'من الثلاجة', en: 'from the fridge', t: 'ثلاجة' },
  { ar: 'من الفرن', en: 'from the oven', t: 'فرن' },
  { ar: 'من الاستقبال', en: 'from reception', t: 'استقبال' },
  { ar: 'من البقالة', en: 'from the grocery', t: 'بقالة' },
  { ar: 'من الخزانة', en: 'from the closet', t: 'خزانة' },
  { ar: 'من الإيميل', en: 'from email', t: 'إيميل' },
  { ar: 'من الأمن', en: 'from security', t: 'أمن' },
  { ar: 'من الحقيبة', en: 'from the bag', t: 'حقيبة' },
  { ar: 'من المحطة', en: 'from the station', t: 'محطة' },
  { ar: 'من الصيدلية', en: 'from the pharmacy', t: 'صيدلية' },
  { ar: 'من المكتبة', en: 'from the library', t: 'مكتبة' },
  { ar: 'من المكتب', en: 'from the office', t: 'مكتب' },
  { ar: 'من الحديقة', en: 'from the park', t: 'حديقة' },
  { ar: 'من المسبح', en: 'from the pool', t: 'مسبح' },
  { ar: 'من الصالون', en: 'from the living room', t: 'صالون' },
  { ar: 'من المطبخ', en: 'from the kitchen', t: 'مطبخ' },
  { ar: 'من الحمام', en: 'from the bathroom', t: 'حمام' },
  { ar: 'من الغرفة', en: 'from the room', t: 'غرفة' },
  { ar: 'من الشرفة', en: 'from the balcony', t: 'شرفة' },
  { ar: 'من السطح', en: 'from the rooftop', t: 'سطح' },
  { ar: 'من الصندوق', en: 'from the box', t: 'صندوق' },
  { ar: 'من الدرج الثاني', en: 'from the second drawer', t: 'درج ثاني' },
  { ar: 'من الرف العلوي', en: 'from the top shelf', t: 'رف علوي' },
  { ar: 'من الجيب', en: 'from the pocket', t: 'جيب' },
  { ar: 'من الطاولة', en: 'from the table', t: 'طاولة' },
  { ar: 'من الكرسي', en: 'from the chair', t: 'كرسي' },
];

const REASONS = [
  { ar: 'لأن المطر قرب يجي', en: 'because rain is about to come', t: 'مطر' },
  { ar: 'عشان ما نتأخر على الموعد', en: 'so we are not late for the appointment', t: 'تأخر موعد' },
  { ar: 'لأن البطارية ضعيفة', en: 'because the battery is low', t: 'بطارية ضعيفة' },
  { ar: 'قبل ما يبرد الجو أكثر', en: 'before the weather gets colder', t: 'جو بارد' },
  { ar: 'عشان المراجعة بكرة', en: 'for revision tomorrow', t: 'مراجعة بكرة' },
  { ar: 'لأن الضيوف يوصلون بعد شوي', en: 'because the guests arrive soon', t: 'ضيوف' },
  { ar: 'قبل نهاية الدوام', en: 'before the end of the workday', t: 'دوام' },
  { ar: 'عشان الهضم يكون أخف', en: 'so digestion is lighter', t: 'هضم' },
  { ar: 'لأن الباص متأخر اليوم', en: 'because the bus is late today', t: 'باص' },
  { ar: 'قبل ما تطفى الأنوار', en: 'before the lights go out', t: 'أنوار' },
  { ar: 'عشان الاختبار يوم الأحد', en: 'because the exam is on Sunday', t: 'اختبار أحد' },
  { ar: 'لأن الشمس قوية برا', en: 'because the sun is strong outside', t: 'شمس' },
  { ar: 'قبل ما يقفل الباب', en: 'before the door closes', t: 'باب' },
  { ar: 'عشان ما يضيع شيء', en: 'so nothing gets lost', t: 'يضيع' },
  { ar: 'لأن الوقت ضيق شوي', en: 'because time is a bit tight', t: 'وقت ضيق' },
  { ar: 'قبل ما يبدأ الاجتماع', en: 'before the meeting starts', t: 'اجتماع' },
  { ar: 'عشان نلحق الصلاة', en: 'so we make prayer on time', t: 'صلاة' },
  { ar: 'لأن الطريق مزدحم', en: 'because the road is crowded', t: 'طريق مزدحم' },
  { ar: 'قبل ما يخلص العرض', en: 'before the offer ends', t: 'عرض' },
  { ar: 'عشان الصورة تطلع أوضح', en: 'so the picture comes out clearer', t: 'صورة أوضح' },
];

const FOLLOWUPS = [
  { ar: 'وبعدها رجعت الغرفة بهدوء', en: 'then I went back to the room quietly', t: 'رجعت غرفة' },
  { ar: 'وبعدين كتبنا الجملة في الدفتر', en: 'then we wrote the sentence in the notebook', t: 'دفتر جملة' },
  { ar: 'وبعد كده رنّ الجرس', en: 'and then the doorbell rang', t: 'جرس' },
  { ar: 'وبعدها شربت شوية ميّ', en: 'then I drank a bit of water', t: 'مي' },
  { ar: 'وبعدين قفلنا الشباك', en: 'then we closed the window', t: 'شباك' },
  { ar: 'وبعدها مسحنا الطاولة', en: 'then we wiped the table', t: 'مسح طاولة' },
  { ar: 'وبعد كده طفينا النور', en: 'and then we turned off the light', t: 'نور' },
  { ar: 'وبعدين رتبنا الكراتين', en: 'then we arranged the boxes', t: 'كراتين' },
  { ar: 'وبعدها ردّينا على الرسالة', en: 'then we replied to the message', t: 'رد رسالة' },
  { ar: 'وبعدين غنّينا شوي بصوت واطي', en: 'then we sang a bit quietly', t: 'غنينا' },
  { ar: 'وبعدها ضحكنا من الموقف', en: 'then we laughed at the situation', t: 'ضحكنا' },
  { ar: 'وبعد كده نام الولد', en: 'and then the boy fell asleep', t: 'نام ولد' },
  { ar: 'وبعدين صلّينا المغرب', en: 'then we prayed Maghrib', t: 'مغرب' },
  { ar: 'وبعدها فتحت المروحة', en: 'then I turned on the fan', t: 'مروحة' },
  { ar: 'وبعدين شحنت الجهاز', en: 'then I charged the device', t: 'شحن جهاز' },
];

const usedTokens = new Set();
let objectCursor = 0;
let placeCursor = 0;
let reasonCursor = 0;
let followCursor = 0;

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

export function seedUsedExampleTokens(texts) {
  for (const text of texts) {
    markTokensFromText(String(text || ''));
  }
  for (const h of HARD_BANS) usedTokens.add(h.toLowerCase());
}

function markTokensFromText(text) {
  const lower = text.toLowerCase();
  const pools = [...OBJECTS, ...PLACES, ...REASONS, ...FOLLOWUPS];
  for (const item of pools) {
    if (text.includes(item.t) || lower.includes(item.en.toLowerCase()) || text.includes(item.ar)) {
      usedTokens.add(item.t.toLowerCase());
    }
  }
  for (const h of HARD_BANS) {
    if (lower.includes(h) || text.includes(h)) usedTokens.add(h);
  }
}

function claim(token) {
  usedTokens.add(String(token).toLowerCase());
}

function pickFree(list, cursorName) {
  const cursors = { objectCursor, placeCursor, reasonCursor, followCursor };
  let cursor = cursors[cursorName];
  for (let i = 0; i < list.length; i++) {
    const idx = (cursor + i) % list.length;
    const item = list[idx];
    if (!usedTokens.has(item.t.toLowerCase())) {
      claim(item.t);
      const next = (idx + 1) % list.length;
      if (cursorName === 'objectCursor') objectCursor = next;
      if (cursorName === 'placeCursor') placeCursor = next;
      if (cursorName === 'reasonCursor') reasonCursor = next;
      if (cursorName === 'followCursor') followCursor = next;
      return item;
    }
  }
  const item = list[cursor % list.length];
  const next = (cursor + 1) % list.length;
  if (cursorName === 'objectCursor') objectCursor = next;
  if (cursorName === 'placeCursor') placeCursor = next;
  if (cursorName === 'reasonCursor') reasonCursor = next;
  if (cursorName === 'followCursor') followCursor = next;
  return item;
}

function nextCombo() {
  return {
    object: pickFree(OBJECTS, 'objectCursor'),
    place: pickFree(PLACES, 'placeCursor'),
    reason: pickFree(REASONS, 'reasonCursor'),
    follow: pickFree(FOLLOWUPS, 'followCursor'),
  };
}

function extractPresentStem(present) {
  const p = (present || '').trim();
  if (!p) return '';
  if (/^[يتأنا]/.test(p) && p.length > 2) return p.slice(1);
  return p;
}

function pastForms(pastBase) {
  const base = pastBase.trim();
  return {
    أنا: `${base}ت`,
    إحنا: `${base}نا`,
    أنت: `${base}ت`,
    أنتِ: `${base}تي`,
    أنتم: `${base}توا`,
    هو: base,
    هي: `${base}ت`,
    هم: `${base}وا`,
  };
}

function presentForms(stem) {
  const s = stem.trim();
  return {
    أنا: `أ${s}`,
    إحنا: `ن${s}`,
    أنت: `ت${s}`,
    أنتِ: `ت${s}ين`,
    أنتم: `ت${s}ون`,
    هو: `ي${s}`,
    هي: `ت${s}`,
    هم: `ي${s}ون`,
  };
}

function futureForms(stem) {
  const s = stem.trim();
  return {
    أنا: `ب${s}`,
    إحنا: `بن${s}`,
    أنت: `بت${s}`,
    أنتِ: `بت${s}ين`,
    أنتم: `بت${s}ون`,
    هو: `بي${s}`,
    هي: `بت${s}`,
    هم: `بي${s}ون`,
  };
}

function glossFromMeaning(meaning) {
  return (meaning || 'this')
    .split('·')[0]
    .trim()
    .replace(/\s+/g, ' ');
}

function tenseLeadEn(tense, pronounEn, gloss) {
  if (tense === 'past') return `${pronounEn} did it (${gloss})`;
  if (tense === 'present') return `${pronounEn} do it (${gloss})`;
  return `${pronounEn} will do it (${gloss})`;
}

/**
 * Ambient multi-clause frames: conjugated verb is the main action;
 * surrounding clauses introduce fresh nouns/phrases without forcing
 * every verb to take a random direct object (avoids “ate headphones”).
 */
function buildExampleSentence(pronoun, form, tense, gloss, curated) {
  if (curated?.ar) {
    markTokensFromText(`${curated.ar} ${curated.en || ''}`);
    return { ar: curated.ar.trim(), en: (curated.en || '').trim() };
  }

  const { object, place, reason, follow } = nextCombo();
  const followAr = follow.ar.replace(/^و/, '');
  const followEn = follow.en.replace(/^and\s+/i, '');

  let ar;
  let en;
  if (tense === 'past') {
    ar = `${form}، وبعدين شفت ${object.ar} ${place.ar}، ${reason.ar}، و${followAr}`;
    en = `${tenseLeadEn(tense, pronoun.en, gloss)}, then I saw ${object.en} ${place.en}, ${reason.en}, and ${followEn}`;
  } else if (tense === 'present') {
    ar = `${form} الحين، وبعدين أحط ${object.ar} ${place.ar}، ${reason.ar}`;
    en = `${tenseLeadEn(tense, pronoun.en, gloss)} now, then I put ${object.en} ${place.en}, ${reason.en}`;
  } else {
    ar = `${form} بكرة، وآخذ ${object.ar} ${place.ar} إذا احتجته، ${reason.ar}، و${followAr}`;
    en = `${tenseLeadEn(tense, pronoun.en, gloss)} tomorrow, and I’ll get ${object.en} ${place.en} if I need it, ${reason.en}, and ${followEn}`;
  }
  return { ar, en };
}

/**
 * @param {string} past
 * @param {string} present
 * @param {string} meaning
 * @param {{ ar: string, en: string }[] | null | undefined} curatedExamples
 */
export function conjugationSection(past, present, meaning, curatedExamples) {
  const pastBase = (past || '').trim();
  const stem = extractPresentStem(present) || pastBase;
  const pastMap = pastForms(pastBase);
  const presentMap = presentForms(stem);
  const futureMap = futureForms(stem);
  const gloss = glossFromMeaning(meaning);

  const conjRows = PRONOUNS.map(
    (p) =>
      `| ${p.ar} | ${pastMap[p.ar]} | ${presentMap[p.ar]} | ${futureMap[p.ar]} |`
  ).join('\n');

  const tenseCycle = ['past', 'present', 'future'];
  const exampleRows = PRONOUNS.map((p, i) => {
    const tense = tenseCycle[i % 3];
    const form =
      tense === 'past'
        ? pastMap[p.ar]
        : tense === 'present'
          ? presentMap[p.ar]
          : futureMap[p.ar];
    const curated = Array.isArray(curatedExamples) ? curatedExamples[i] : null;
    const { ar, en } = buildExampleSentence(p, form, tense, gloss, curated);
    const arCell = escapeTableCell(
      `<span class="example-ar" dir="rtl" lang="ar">${escapeHtml(ar)}</span>`
    );
    const enCell = escapeTableCell(
      `<span class="example-en" dir="ltr" lang="en">${escapeHtml(en)}</span>`
    );
    return `| ${p.ar} | ${arCell} | ${enCell} |`;
  }).join('\n');

  return `## Conjugation

Everyday Saudi / Najdi. Future uses **بـ**.

| Pronoun | Past | Present | Future |
|---------|------|---------|--------|
${conjRows}

### Examples

Multi-clause sentences with new everyday words. Arabic and English stay in separate columns.

| Pronoun | Arabic | English |
|---------|--------|---------|
${exampleRows}
`;
}
