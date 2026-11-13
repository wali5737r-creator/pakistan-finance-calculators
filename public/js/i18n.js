// Urdu language toggle (Phase 1: homepage + navigation only).
//
// English strings stay in the HTML as the default. When Urdu is active,
// this script swaps the textContent of [data-i18n] elements from the
// dictionary below and sets <html lang="ur">. The choice is remembered
// in localStorage ('pfc-lang'); there is no account and nothing is sent
// to a server. Tool pages keep their English calculator content in
// Phase 1 — only the shared nav and footer switch.
//
// Served as an external script (public/js/i18n.js) so the CSP can keep
// script-src without 'unsafe-inline': no inline <script>, no
// define:vars, no inline event handlers anywhere in this feature.
// The Urdu font is self-hosted (public/fonts/noto-nastaliq-urdu-arabic.woff2,
// Arabic-subset woff2 from Google Fonts, OFL) — font-src 'self' allows it
// and no Google Fonts <link> is needed. The @font-face only applies
// under html[lang="ur"], so the font downloads only when Urdu is chosen.
(function () {
  var STORAGE_KEY = 'pfc-lang';

  // Keys match the data-i18n attributes in Layout.astro and index.astro.
  // Tool labels (tool.*) are shared by the top nav and the footer.
  // Card names/descriptions (card.*) are homepage-only.
  var UR = {
    'nav.home': 'ہوم',
    'nav.about': 'ہمارے بارے میں',
    'nav.contact': 'رابطہ',
    'tool.salary-tax': 'تنخواہ ٹیکس',
    'tool.emi': 'EMI کیلکولیٹر',
    'tool.zakat': 'زکوٰۃ',
    'tool.currency': 'کرنسی کنورٹر',
    'tool.gold': 'سونا',
    'tool.percentage': 'فیصد',
    'tool.age': 'عمر',
    'tool.marla': 'مرلہ',
    'tool.fuel': 'ایندھن',
    'tool.compound': 'مرکب سود',
    'tool.loan-eligibility': 'قرض اہلیت',
    'tool.inflation': 'مہنگائی',
    'tool.budget': 'بجٹ',
    'tool.debt': 'قرض ادائیگی',
    'tool.fixed-deposit': 'فکسڈ ڈپازٹ',
    'tool.loan-comparison': 'قرض موازنہ',
    'tool.goal': 'ہدف بچت',
    'tool.electricity': 'بجلی بل',
    'tool.gas': 'گیس بل',
    'tool.freelancer': 'فری لانسر ٹیکس',
    'tool.solar': 'سولر',
    'tool.pension': 'پنشن / EOBI',
    'tool.national-savings': 'قومی بچت',
    'tool.gst': 'GST',
    'tool.car-loan': 'کار قرض',
    'tool.home-loan': 'ہوم قرض',
    'footer.brand-text': 'پاکستان کے لیے مفت کیلکولیٹر۔ نتائج صرف معلومات کے لیے اندازے ہیں — ٹیکس، مالی یا مذہبی مشورہ نہیں۔ حساب آپ کے براؤزر میں ہوتا ہے؛ آپ جو کچھ درج کرتے ہیں وہ نہ محفوظ ہوتا ہے نہ سرور کو بھیجا جاتا ہے۔',
    'footer.heading-calculators': 'کیلکولیٹر',
    'footer.heading-site': 'سائٹ',
    'footer.about': 'ہمارے بارے میں',
    'footer.contact': 'رابطہ',
    'footer.privacy': 'پرائیویسی پالیسی',
    'footer.terms': 'شرائط و ڈسکلیمر',
    'footer.bottom-right': 'مفت · بغیر سائن اپ · نجی',
    'home.badge': 'مفت · بغیر سائن اپ · نجی',
    'home.hero-accent': 'ہر روپیہ، حساب کے ساتھ۔',
    'home.lede': 'پاکستان کے لیے بنائے گئے چھبیس کیلکولیٹر — تنخواہ ٹیکس، EMI، زکوٰۃ، کرنسی، سونا، فیصد، عمر اور زمین کا رقبہ، نیز ایندھن کی لاگت، بچت میں اضافہ، قرضے، مہنگائی، بجٹ، قرض کی ادائیگی، فکسڈ ڈپازٹ، ہدف بچت، بجلی کے بل، گیس کے بل، فری لانسر ٹیکس، سولر واپسی، EOBI پنشن، قومی بچت، GST، کار قرض اور ہوم قرض۔ ہر حساب آپ کے براؤزر میں ہوتا ہے، ہر نتیجے کی بنیاد دکھائی جاتی ہے، اور آپ جو کچھ درج کرتے ہیں وہ محفوظ نہیں ہوتا۔',
    'home.cta-tax': 'تنخواہ کا ٹیکس حساب کریں →',
    'home.cta-browse': 'تمام 26 ٹولز دیکھیں',
    'home.trust-1': 'ہمیشہ مفت — کوئی فیس نہیں، کوئی سائن اپ نہیں',
    'home.trust-2': 'نجی — حساب آپ کے براؤزر سے باہر نہیں جاتا',
    'home.trust-3': 'ذرائع دکھائے جاتے ہیں — ہر نتیجے پر سلیب، ریٹ اور تاریخ',
    'home.trust-4': 'پاکستان کے لیے بنایا گیا — FBR سلیب، تولہ، مرلہ اور PKR',
    'home.eyebrow': 'تمام کیلکولیٹر',
    'home.section-title': 'چھبیس ٹولز، ہر مالی سوال کا ایک جواب',
    'home.section-sub': 'ٹول منتخب کریں اور سیکنڈوں میں جواب پائیں — فارمولا، حل شدہ مثال اور ہر عدد کے پیچھے ذریعہ کے ساتھ۔',
    'home.use-calculator': 'کیلکولیٹر استعمال کریں',
    'home.tools-note': 'کیلکولیٹر فی الحال انگریزی میں ہیں — اردو ترجمہ مرحلہ وار آ رہا ہے',
    'home.how-title': 'یہ سائٹ کیسے کام کرتی ہے',
    'home.how-text': 'ہر ٹول ایک الگ صفحہ ہے جس کی اپنی حل شدہ مثال، فارمولا، ذریعہ اور ڈسکلیمر ہے۔ ٹیکس سلیب، نصاب کے وزن اور تبادلوں کے عوامل ہر ایک کی اپنی فائل میں ہیں، اس لیے اگلے سال کی اپڈیٹ ایک ترمیم ہے — دوبارہ لکھنا نہیں۔ کرنسی اور سونے کے ریٹ نامزد ذرائع سے آتے ہیں اور آخری اپڈیٹ کا وقت دکھایا جاتا ہے؛ پرانا ریٹ ہمیشہ پرانا لکھا جاتا ہے، اور کوئی ریٹ کبھی اندازے سے نہیں لگایا جاتا۔',
    'home.estimates-title': 'نتائج اندازے ہیں',
    'home.estimates-text': 'ٹیکس کے نتائج صرف تنخواہ دار سلیب استعمال کرتے ہیں، کسی سرچارج، رعایت یا ودہولڈنگ ایڈجسٹمنٹ سے پہلے۔ فری لانسر ٹیکس کیلکولیٹر اس کے بجائے غیر تنخواہ دار سلیب اور سیکشن 154A ایکسپورٹ ٹیکس استعمال کرتا ہے۔ زکوٰۃ کے نتائج صرف حسابی اندازے ہیں، فتویٰ نہیں — براہ کرم کسی مستند عالم سے تصدیق کریں۔ کرنسی اور سونے کے اعداد اشارے ہیں، بینک یا صراف کے ریٹ نہیں۔',
    'home.estimates-link': 'مکمل ڈسکلیمر پڑھیں',
    'card.salary-tax.name': 'تنخواہ / آمدنی ٹیکس کیلکولیٹر',
    'card.salary-tax.desc': '2026-27 کے لیے آپ کی تنخواہ پر ماہانہ اور سالانہ ٹیکس، FBR تنخواہ دار سلیب کے مطابق، گھر لے جانے والی تنخواہ سمیت۔',
    'card.emi.name': 'EMI / قرض کیلکولیٹر',
    'card.emi.desc': 'کم ہوتے بیلنس والے قرض کے لیے ماہانہ قسط، کل سود اور مکمل ادائیگی کا شیڈول۔',
    'card.zakat.name': 'زکوٰۃ کیلکولیٹر',
    'card.zakat.desc': 'نقدی، سونا، چاندی اور تجارتی سامان پر 2.5% زکوٰۃ، سونے اور چاندی کے نصاب سمیت۔',
    'card.currency.name': 'کرنسی کنورٹر PKR',
    'card.currency.desc': 'PKR کو USD، GBP، EUR، SAR، AED، AUD اور CAD میں بدلیں، ریٹ کے ذریعہ اور آخری اپڈیٹ کے وقت سمیت۔',
    'card.gold.name': 'سونے کی قیمت کیلکولیٹر',
    'card.gold.desc': '24K، 22K، 21K اور 18K سونے کی فی تولہ اور فی گرام قیمت، لائیو یا اپنی قیمت کے ساتھ۔',
    'card.percentage.name': 'فیصد کیلکولیٹر',
    'card.percentage.desc': 'کسی عدد کا X% کتنا ہے، فیصد اضافہ اور کمی، اور ایک عدد دوسرے کا کتنا فیصد ہے۔',
    'card.age.name': 'عمر کیلکولیٹر',
    'card.age.desc': 'سال، مہینے اور دنوں میں آپ کی درست عمر، گزارے گئے کل دن اور اگلی سالگرہ تک باقی دن۔',
    'card.marla.name': 'یونٹ / مرلہ کنورٹر',
    'card.marla.desc': 'مرلہ، کنال، ایکڑ، مربع فٹ، مربع گز، مربع میٹر اور ہیکٹر میں تبدیل کریں۔',
    'card.fuel.name': 'ایندھن کی لاگت کیلکولیٹر',
    'card.fuel.desc': 'کسی بھی سفر کے لیے استعمال شدہ لیٹر، کل لاگت اور فی کلومیٹر لاگت، آپ کے درج کردہ فاصلے، مائلیج اور ایندھن کی قیمت سے۔',
    'card.compound.name': 'مرکب سود کیلکولیٹر',
    'card.compound.desc': 'مرکب سود سے بچت کیسے بڑھتی ہے: حتمی رقم، حاصل شدہ سود اور سال بہ سال جدول۔',
    'card.loan-eligibility.name': 'قرض کی اہلیت کیلکولیٹر',
    'card.loan-eligibility.desc': 'آپ کی آمدنی کے مطابق سب سے بڑا قرض، موجودہ ذمہ داریوں کے بعد برداشت کے قابل قسط سے۔',
    'card.inflation.name': 'مہنگائی کیلکولیٹر',
    'card.inflation.desc': 'کسی رقم کی مستقبل کی لاگت اور اس کی قوت خرید، آپ کی فرض کردہ مہنگائی کی شرح اور سالوں کے مطابق۔',
    'card.budget.name': 'بجٹ منصوبہ ساز کیلکولیٹر',
    'card.budget.desc': 'ماہانہ گھر لے جانے والی تنخواہ کو ضروریات، خواہشات اور بچت میں 50/30/20 اصول اور اپنی فیصد کے مطابق تقسیم کریں۔',
    'card.debt.name': 'قرض ادائیگی کیلکولیٹر',
    'card.debt.desc': 'اضافی ماہانہ ادائیگی کے ساتھ اور بغیر بیلنس کتنی جلدی ختم ہوتا ہے، اور اضافی ادائیگی سے کتنا سود بچتا ہے۔',
    'card.fixed-deposit.name': 'فکسڈ ڈپازٹ کیلکولیٹر',
    'card.fixed-deposit.desc': 'فکسڈ ڈپازٹ پر میچورٹی رقم اور منافع، آپ کے درج کردہ منافع کی شرح اور ٹیکس کے ساتھ۔',
    'card.loan-comparison.name': 'قرض موازنہ کیلکولیٹر',
    'card.loan-comparison.desc': 'دو قرضوں کا ساتھ ساتھ موازنہ کریں: ہر ایک کی قسط، کل سود اور کل ادائیگی، اور کون سا سستا ہے۔',
    'card.goal.name': 'ہدف بچت کیلکولیٹر',
    'card.goal.desc': 'ہدف کے لیے ہر ماہ کتنا بچائیں، یا ماہانہ بچت سے ہدف تک پہنچنے میں کتنا وقت لگے گا۔',
    'card.electricity.name': 'بجلی بل کیلکولیٹر',
    'card.electricity.desc': 'NEPRA کے 2026 گھریلو ٹیرف سے اپنے ماہانہ بجلی کے بل کا اندازہ لگائیں: سلیب، فکسڈ چارج، FPA اور 18% GST۔',
    'card.gas.name': 'گیس بل کیلکولیٹر',
    'card.gas.desc': 'OGRA کی 2025 گھریلو قیمت سے اپنے ماہانہ گیس کے بل کا اندازہ لگائیں: پروٹیکٹڈ اور نان پروٹیکٹڈ سلیب، فکسڈ چارج، میٹر کرایہ اور 18% GST۔',
    'card.freelancer.name': 'فری لانسر ٹیکس کیلکولیٹر',
    'card.freelancer.desc': 'فری لانس آمدنی پر ٹیکس: PSEB 0.25% ایکسپورٹ ٹیکس یا اس کے بغیر 1%، مقامی منافع پر غیر تنخواہ دار سلیب، اور 10 ملین روپے سے زائد پر 10% سرچارج۔',
    'card.solar.name': 'سولر سائز اور واپسی کیلکولیٹر',
    'card.solar.desc': 'آپ کے گھر کے لیے درست سولر سائز اور NEPRA نیٹ بلنگ 2026 کے تحت واپسی کتنی جلدی ہوگی — سسٹم لاگت، ماہانہ بچت اور واپسی کی مدت۔',
    'card.pension.name': 'پنشن / EOBI کیلکولیٹر',
    'card.pension.desc': 'آپ کی EOBI بڑھاپا پنشن، آپ کی کنٹریبیوشن اجرت اور سروس کے سالوں سے: ماہانہ پنشن، کنٹریبیوشن، کم شدہ اور پسماندگان پنشن، اور بڑھاپا گرانٹ۔',
    'card.national-savings.name': 'قومی بچت کیلکولیٹر',
    'card.national-savings.desc': 'RIC، بہبود، پنشنرز اور شہدا اکاؤنٹس پر ماہانہ منافع، CDNS جدول سے DSC میچورٹی اور SSC نیم سالانہ منافع، 21 اکتوبر 2026 کے CDNS ریٹس کے مطابق۔',
    'card.gst.name': 'GST کیلکولیٹر',
    'card.gst.desc': 'پاکستان میں کسی بھی قیمت میں 18% GST شامل یا خارج کریں، تصدیق شدہ کم شرحوں، زیرو ریٹڈ اور مستثنیٰ اشیا، اور غیر رجسٹرڈ خریداروں کے لیے 4% مزید ٹیکس سمیت۔',
    'card.car-loan.name': 'کار قرض کیلکولیٹر',
    'card.car-loan.desc': 'پاکستان میں کار قرض پر ماہانہ قسط: ڈاؤن پیمنٹ، SBP مدت کی حد اور 30 لاکھ روپے فنانس کی حد، آپ کے درج کردہ KIBOR سے منسلک مارک اپ پر۔',
    'card.home-loan.name': 'ہوم قرض کیلکولیٹر',
    'card.home-loan.desc': 'پاکستان میں ہوم قرض پر ماہانہ قسط: کمرشل KIBOR سے منسلک شرحیں، یا 10 سال کے لیے اپنا گھر 5% سبسڈی، دونوں مراحل کے ساتھ۔',
  };

  var current = 'en';

  function storedLanguage() {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function saveLanguage(lang) {
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      // Private mode / storage blocked: the toggle still works for this visit.
    }
  }

  function applyLanguage(lang) {
    current = lang === 'ur' ? 'ur' : 'en';
    document.documentElement.lang = current;
    // dir stays "ltr" deliberately: the layout (header, nav strip,
    // cards, footer grid) was built LTR, and Urdu text renders correctly
    // inside it via bidi. A full RTL flip is a separate visual decision.
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (current === 'ur' && UR[key]) {
        if (!el.dataset.en) el.dataset.en = el.textContent;
        el.textContent = UR[key];
      } else if (el.dataset.en) {
        el.textContent = el.dataset.en;
      }
    });
    // The "tools are still in English" note is Urdu-only: hidden in English.
    var note = document.getElementById('lang-note');
    if (note) note.hidden = current !== 'ur';
    var toggle = document.getElementById('lang-toggle');
    if (toggle) {
      toggle.textContent = current === 'ur' ? 'EN' : 'اردو';
      toggle.setAttribute('aria-label', current === 'ur' ? 'Switch to English' : 'اردو میں دیکھیں');
      toggle.setAttribute('aria-pressed', current === 'ur' ? 'true' : 'false');
    }
    saveLanguage(current);
  }

  var toggle = document.getElementById('lang-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      applyLanguage(current === 'ur' ? 'en' : 'ur');
    });
  }
  // Defer scripts run after parsing, so the DOM above already exists.
  // A saved Urdu choice applies here; the flash of English on a first
  // Urdu visit is brief and accepted (an inline script would violate CSP).
  applyLanguage(storedLanguage() || 'en');
})();
