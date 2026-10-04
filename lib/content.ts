import { Language, ServiceKey } from "./types";
export const services:{key:ServiceKey;ur:string;icon:string;examplesEn:string;examplesUr:string}[] = [
  {key:"Plumber",ur:"پلمبر",icon:"🚰",examplesEn:"Leaks, taps, pipes",examplesUr:"لیکج، نلکے، پائپ"},
  {key:"Electrician",ur:"الیکٹریشن",icon:"⚡",examplesEn:"Wiring, switches, fans",examplesUr:"وائرنگ، سوئچ، پنکھے"},
  {key:"AC Technician",ur:"اے سی ٹیکنیشن",icon:"❄️",examplesEn:"AC service & repair",examplesUr:"اے سی سروس اور مرمت"},
  {key:"Carpenter",ur:"بڑھئی",icon:"🪚",examplesEn:"Furniture & woodwork",examplesUr:"فرنیچر اور لکڑی کا کام"},
  {key:"Painter",ur:"پینٹر",icon:"🎨",examplesEn:"Rooms, walls, touch-ups",examplesUr:"کمرے، دیواریں، پینٹ"},
  {key:"Cleaner",ur:"کلینر",icon:"🧹",examplesEn:"Home & office cleaning",examplesUr:"گھر اور دفتر کی صفائی"},
  {key:"Mechanic",ur:"مکینک",icon:"🔧",examplesEn:"Bike & car help",examplesUr:"موٹر سائیکل اور گاڑی"},
  {key:"Other",ur:"دیگر",icon:"🛠️",examplesEn:"Other local work",examplesUr:"دیگر مقامی کام"}
];
export const copy = {
  en: {
    home:"Home", requests:"Jobs", work:"Earn", account:"Account", voice:"Speak", language:"اردو",
    headline:"Reliable help, close to home.", sub:"Find nearby skilled workers, compare real reputation, and choose on your terms.",
    location:"Current area", search:"What do you need done?", services:"Services", nearby:"Available near you", viewAll:"See all",
    requestNow:"Post a job", startRequest:"What service do you need?", issue:"Describe the job", issueHint:"Keep it short. Workers can ask questions before you choose.", where:"Where is the job?", when:"When do you need help?", now:"Right now", today:"Today", schedule:"Schedule", budget:"Set a starting budget", budgetHint:"Workers can accept it or send a counter-offer.", post:"Post job", offers:"Choose from nearby offers", choose:"Choose worker",
    from:"From", verified:"Verified", jobs:"jobs", yrs:"years", away:"away", trust:"Trust score", onTime:"on time", repeats:"repeat customers",
    voiceTitle:"Tell KaamYab what you need", voiceSub:"Speak in Urdu, Roman Urdu or English. We turn it into a job request.", holdSpeak:"Tap to speak", listening:"Recording… tap to stop", processing:"Understanding…", voiceExamples:"Try saying", example1:"Mujhe Bahria mein plumber chahiye", example2:"I need an electrician today", example3:"مجھے اے سی ٹیکنیشن چاہیے", voiceNoKey:"Voice transcription is not configured on this deployment. You can still type your request.", typeInstead:"Or type what you need", send:"Send",
    earnTitle:"Your skills should be easy to hire.", earnSub:"Go online, see nearby work, set your price and build a reputation you can carry anywhere.", goOnline:"Go online", online:"Online now", jobFeed:"Nearby work", customerOffer:"Customer budget", accept:"Accept", offerPrice:"Counter", profile:"Worker profile",
    trust1:"Identity & phone checks", trust2:"Reviews only after jobs", trust3:"Live availability nearby"
  },
  ur: {
    home:"ہوم", requests:"کام", work:"کمائیں", account:"اکاؤنٹ", voice:"بولیں", language:"English",
    headline:"قابلِ اعتماد مدد، آپ کے قریب۔", sub:"قریب کے ہنرمند کاریگر تلاش کریں، ان کی اصل ساکھ دیکھیں اور اپنی پسند سے انتخاب کریں۔",
    location:"موجودہ علاقہ", search:"آپ کو کیا کام کروانا ہے؟", services:"سروسز", nearby:"آپ کے قریب دستیاب", viewAll:"سب دیکھیں",
    requestNow:"کام پوسٹ کریں", startRequest:"آپ کو کس سروس کی ضرورت ہے؟", issue:"کام کی تفصیل بتائیں", issueHint:"مختصر لکھیں۔ انتخاب سے پہلے کاریگر سوال کر سکتا ہے۔", where:"کام کہاں ہے؟", when:"مدد کب چاہیے؟", now:"ابھی", today:"آج", schedule:"وقت مقرر کریں", budget:"ابتدائی بجٹ بتائیں", budgetHint:"کاریگر قیمت قبول یا اپنی آفر دے سکتا ہے۔", post:"کام پوسٹ کریں", offers:"قریب کی آفرز میں سے منتخب کریں", choose:"کاریگر منتخب کریں",
    from:"شروع", verified:"تصدیق شدہ", jobs:"کام", yrs:"سال", away:"دور", trust:"ٹرسٹ اسکور", onTime:"وقت پر", repeats:"دوبارہ آنے والے صارفین",
    voiceTitle:"کام یاب کو بتائیں کیا کام چاہیے", voiceSub:"اردو، رومن اردو یا انگلش میں بولیں۔ ہم اسے کام کی درخواست میں بدل دیں گے۔", holdSpeak:"بولنے کے لیے ٹیپ کریں", listening:"ریکارڈنگ… روکنے کے لیے ٹیپ کریں", processing:"سمجھا جا رہا ہے…", voiceExamples:"مثال", example1:"Mujhe Bahria mein plumber chahiye", example2:"آج الیکٹریشن چاہیے", example3:"I need an AC technician", voiceNoKey:"اس ڈپلائمنٹ میں وائس ٹرانسکرپشن سیٹ نہیں ہے۔ آپ درخواست لکھ سکتے ہیں۔", typeInstead:"یا لکھ کر بتائیں", send:"بھیجیں",
    earnTitle:"آپ کا ہنر آسانی سے ملنا چاہیے۔", earnSub:"آن لائن ہوں، قریب کا کام دیکھیں، اپنی قیمت دیں اور ایسی ساکھ بنائیں جو ہر جگہ کام آئے۔", goOnline:"آن لائن ہوں", online:"ابھی آن لائن", jobFeed:"قریب کا کام", customerOffer:"صارف کا بجٹ", accept:"قبول کریں", offerPrice:"اپنی قیمت", profile:"کاریگر پروفائل",
    trust1:"شناخت اور فون کی تصدیق", trust2:"کام کے بعد ہی ریویو", trust3:"قریب کی لائیو دستیابی"
  }
} satisfies Record<Language,Record<string,string>>;
