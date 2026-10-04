"use client";

import { useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Bell, BriefcaseBusiness, Camera, Check, ChevronRight, CircleUserRound,
  Clock3, Home, Languages, LocateFixed, MapPin, MessageCircle, Mic, Phone,
  Search, Send, ShieldCheck, Star, Wrench, X, WalletCards
} from "lucide-react";
import { workers } from "@/data/workers";
import { distanceKm } from "@/lib/geo";
import { cleanTranscript, detectService } from "@/lib/voiceIntent";
import type { Language, ServiceKey, Worker, WorkerOffer } from "@/lib/types";

const SERVICE_META: Record<ServiceKey, {en:string; ur:string; note:string; glyph:string}> = {
  Plumber:{en:"Plumbing",ur:"پلمبنگ",note:"Leaks, taps, pipes",glyph:"P"},
  Electrician:{en:"Electrical",ur:"الیکٹریشن",note:"Wiring, lights, fans",glyph:"E"},
  "AC Technician":{en:"AC Repair",ur:"اے سی مرمت",note:"Service & cooling",glyph:"AC"},
  Carpenter:{en:"Carpentry",ur:"بڑھئی",note:"Doors & furniture",glyph:"C"},
  Painter:{en:"Painting",ur:"پینٹنگ",note:"Walls & touch-ups",glyph:"PA"},
  Cleaner:{en:"Cleaning",ur:"صفائی",note:"Home & office",glyph:"CL"},
  Mechanic:{en:"Mechanic",ur:"مکینک",note:"Bike & car help",glyph:"M"},
  Other:{en:"Other",ur:"دیگر",note:"Other local work",glyph:"+"},
};

type Screen = "home"|"services"|"request"|"location"|"schedule"|"review"|"posted"|"offers"|"workerProfile"|"active"|"chat"|"complete"|"rating"|"history"|"account"|"settings"|"support"|"workerHome"|"workerJob"|"workerOffer"|"workerActive"|"earnings"|"workerReviews"|"workerSetup";

type Draft = {service:ServiceKey|""; issue:string; area:string; when:"today"|"tomorrow"|"week"|"schedule"; budget:number; urgency:"asap"|"flexible"};

const EN = {
  home:"Home", requests:"Requests", ask:"Ask", activity:"Activity", account:"Account",
  title:"What do you need help with today?", subtitle:"Tell us what’s wrong in your own words and we’ll help you find the right person nearby.",
  problem:"Describe the problem", photo:"Add a photo", browse:"Browse services", popular:"Popular services", nearby:"Top-rated nearby",
};
const UR = {
  home:"ہوم", requests:"درخواستیں", ask:"پوچھیں", activity:"سرگرمی", account:"اکاؤنٹ",
  title:"آج آپ کو کس کام میں مدد چاہیے؟", subtitle:"اپنا مسئلہ اپنی زبان میں بتائیں، ہم آپ کے قریب مناسب کاریگر تلاش کرنے میں مدد کریں گے۔",
  problem:"اپنا مسئلہ بتائیں", photo:"تصویر شامل کریں", browse:"خدمات دیکھیں", popular:"مشہور خدمات", nearby:"قریب بہترین کاریگر",
};

export default function Page(){
  const [lang,setLang]=useState<Language>("en");
  const ur=lang==="ur", t=ur?UR:EN;
  const [screen,setScreen]=useState<Screen>("home");
  const [voiceOpen,setVoiceOpen]=useState(false);
  const [recording,setRecording]=useState(false);
  const [voiceBusy,setVoiceBusy]=useState(false);
  const [voiceText,setVoiceText]=useState("");
  const [voiceMessage,setVoiceMessage]=useState("");
  const mediaRef=useRef<MediaRecorder|null>(null);
  const chunksRef=useRef<Blob[]>([]);
  const [location,setLocation]=useState<[number,number]>([33.5651,73.0169]);
  const [locationLabel,setLocationLabel]=useState("Bahria Town, Rawalpindi");
  const [draft,setDraft]=useState<Draft>({service:"",issue:"",area:"Bahria Town Phase 4, Rawalpindi",when:"today",budget:2400,urgency:"asap"});
  const [selected,setSelected]=useState<Worker>(workers[1]);
  const [workerOnline,setWorkerOnline]=useState(true);
  const [rating,setRating]=useState(5);
  const [review,setReview]=useState("");

  const nearby=useMemo(()=>workers.map(w=>({...w,distance:distanceKm(location[0],location[1],w.lat,w.lng)})).sort((a,b)=>Number(b.available)-Number(a.available)||a.distance-b.distance),[location]);
  const offers:WorkerOffer[]=nearby.slice(0,3).map((w,i)=>({worker:w,price:[2400,2000,2700][i],etaMin:[35,60,50][i],note:i===0?"Can inspect and repair today.":undefined}));

  function back(){
    const map:Partial<Record<Screen,Screen>>={services:"home",request:"home",location:"request",schedule:"location",review:"schedule",posted:"review",offers:"posted",workerProfile:"offers",active:"offers",chat:"active",complete:"active",rating:"complete",history:"home",account:"home",settings:"account",support:"account",workerHome:"account",workerJob:"workerHome",workerOffer:"workerJob",workerActive:"workerHome",earnings:"workerHome",workerReviews:"workerHome",workerSetup:"account"};
    setScreen(map[screen]||"home");
  }
  function chooseService(s:ServiceKey){setDraft(d=>({...d,service:s}));setScreen("request")}
  function locate(){navigator.geolocation?.getCurrentPosition(p=>{setLocation([p.coords.latitude,p.coords.longitude]);setLocationLabel(ur?"موجودہ مقام":"Current location")},()=>{})}
  async function startVoice(){
    setVoiceMessage("");
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      const rec=new MediaRecorder(stream,{mimeType:MediaRecorder.isTypeSupported("audio/webm;codecs=opus")?"audio/webm;codecs=opus":"audio/webm"});
      chunksRef.current=[]; rec.ondataavailable=e=>{if(e.data.size)chunksRef.current.push(e.data)};
      rec.onstop=async()=>{stream.getTracks().forEach(x=>x.stop());const blob=new Blob(chunksRef.current,{type:rec.mimeType});if(blob.size<1000){setVoiceMessage(ur?"ریکارڈنگ بہت مختصر تھی۔ دوبارہ کوشش کریں۔":"That recording was too short. Try again.");return;}setVoiceBusy(true);try{const fd=new FormData();fd.append("audio",blob,"voice.webm");fd.append("language",lang);const r=await fetch("/api/transcribe",{method:"POST",body:fd});const data=await r.json();if(!r.ok)throw new Error(data?.error||"failed");const text=cleanTranscript(data.text||"");setVoiceText(text);const service=detectService(text);if(service){setDraft(d=>({...d,service,issue:text}));setVoiceMessage(ur?"مسئلہ سمجھ گیا۔ تفصیل کی تصدیق کریں۔":"Got it. Review the details before posting.");}else setVoiceMessage(ur?"سروس واضح نہیں ہوئی۔ ایک لفظ اور شامل کریں، جیسے پلمبر یا الیکٹریشن۔":"I couldn't identify the service. Add a word like plumber or electrician.");}catch(e){setVoiceMessage(ur?"وائس ابھی دستیاب نہیں۔ آپ لکھ کر بھی درخواست بنا سکتے ہیں۔":"Voice is unavailable right now. You can still type your request.");}finally{setVoiceBusy(false)}};
      mediaRef.current=rec; rec.start(); setRecording(true);
    }catch{setVoiceMessage(ur?"مائیکروفون کی اجازت درکار ہے۔":"Microphone permission is required.")}
  }
  function stopVoice(){mediaRef.current?.stop();setRecording(false)}
  function useVoice(){const service=detectService(voiceText);if(service){setDraft(d=>({...d,service,issue:voiceText}));setVoiceOpen(false);setScreen("request")}}
  function submitTypedVoice(){const text=cleanTranscript(voiceText);const service=detectService(text);if(service){setDraft(d=>({...d,service,issue:text}));setVoiceOpen(false);setScreen("request")}else setVoiceMessage(ur?"پلمبر، الیکٹریشن یا اے سی جیسی سروس بھی لکھیں۔":"Include the service too, such as plumber, electrician or AC.")}
  function navTo(k:"home"|"requests"|"ask"|"activity"|"account"){if(k==="home")setScreen("home");if(k==="requests")setScreen("history");if(k==="ask")setVoiceOpen(true);if(k==="activity")setScreen("active");if(k==="account")setScreen("account")}
  const showBottom=!(["location","chat"].includes(screen));

  return <main className={ur?"app rtl":"app"} dir={ur?"rtl":"ltr"}>
    <div className="app-shell">
      {screen==="home"?<HomeScreen/>:<ScreenHeader/>}
      {screen==="services"&&<Services/>}
      {screen==="request"&&<RequestDetails/>}
      {screen==="location"&&<LocationScreen/>}
      {screen==="schedule"&&<Schedule/>}
      {screen==="review"&&<ReviewRequest/>}
      {screen==="posted"&&<Posted/>}
      {screen==="offers"&&<Offers/>}
      {screen==="workerProfile"&&<WorkerProfile/>}
      {screen==="active"&&<ActiveJob/>}
      {screen==="chat"&&<Chat/>}
      {screen==="complete"&&<Complete/>}
      {screen==="rating"&&<Rating/>}
      {screen==="history"&&<History/>}
      {screen==="account"&&<Account/>}
      {screen==="settings"&&<Settings/>}
      {screen==="support"&&<Support/>}
      {screen==="workerSetup"&&<WorkerSetup/>}
      {screen==="workerHome"&&<WorkerHome/>}
      {screen==="workerJob"&&<WorkerJob/>}
      {screen==="workerOffer"&&<WorkerOfferScreen/>}
      {screen==="workerActive"&&<WorkerActive/>}
      {screen==="earnings"&&<Earnings/>}
      {screen==="workerReviews"&&<WorkerReviews/>}
      {showBottom&&<BottomNav/>}
      {voiceOpen&&<VoiceSheet/>}
    </div>
  </main>

  function HomeScreen(){return <div className="screen home-screen">
    <div className="home-top"><button className="brand-button" onClick={()=>setScreen("home")}><span className="brand-mark">K</span><span>KaamYab</span></button><button className="lang-button" onClick={()=>setLang(ur?"en":"ur")}><Languages size={15}/>{ur?"English":"اردو"}</button></div>
    <section className="home-hero">
      <button className="location-row" onClick={locate}><span className="location-icon"><MapPin size={17}/></span><span><small>{ur?"آپ کا مقام":"Your location"}</small><strong>{locationLabel}</strong></span><ChevronRight size={17}/></button>
      <h1>{t.title}</h1><p>{t.subtitle}</p>
    </section>
    <div className="problem-bar"><Search size={19}/><button className="problem-text" onClick={()=>setScreen("services")}>{t.problem}</button><button className="mic-button" onClick={()=>setVoiceOpen(true)}><Mic size={21}/></button></div>
    <div className="quick-actions"><button onClick={()=>setScreen("request")}><Camera size={16}/>{t.photo}</button><button onClick={()=>setScreen("services")}><Wrench size={16}/>{t.browse}</button></div>
    <SectionTitle title={t.popular} action={ur?"سب دیکھیں":"See all"} onClick={()=>setScreen("services")}/>
    <div className="service-grid">{(["Plumber","Electrician","AC Technician","Cleaner"] as ServiceKey[]).map((s,i)=><button key={s} className={`service-tile s${i+1}`} onClick={()=>chooseService(s)}><span className="service-glyph">{SERVICE_META[s].glyph}</span><span>{ur?SERVICE_META[s].ur:SERVICE_META[s].en}</span></button>)}</div>
    <button className="promo-card" onClick={()=>setScreen("request")}><div><small>{ur?"فوری درخواست":"QUICK REQUEST"}</small><strong>{ur?"ایک درخواست دیں، قریب کی آفرز دیکھیں۔":"Post once. Compare nearby offers."}</strong><span>{ur?"قیمت، ریٹنگ اور پہنچنے کا وقت پہلے دیکھیں۔":"See price, rating and arrival time before you choose."}</span></div><span className="promo-dot orange"></span><span className="promo-dot blue"></span></button>
    <SectionTitle title={t.nearby} action={ur?"سب دیکھیں":"View all"} onClick={()=>setScreen("offers")}/>
    <button className="worker-mini" onClick={()=>{setSelected(nearby[0]);setScreen("workerProfile")}}><WorkerAvatar worker={nearby[0]}/><div><strong>{nearby[0].name}</strong><span>{ur?nearby[0].skillUr:SERVICE_META[nearby[0].skill].en} · ★ {nearby[0].rating} · {nearby[0].jobs} {ur?"کام":"jobs"}</span></div><span className="availability">{ur?"دستیاب":"Available"}</span></button>
  </div>}

  function ScreenHeader(){const titleMap:Partial<Record<Screen,string>>={services:ur?"تمام خدمات":"All services",request:ur?"نئی درخواست":"New request",schedule:ur?"وقت اور بجٹ":"Time & budget",review:ur?"درخواست دیکھیں":"Review request",posted:ur?"درخواست پوسٹ ہوگئی":"Request posted",offers:ur?"آفرز":"Offers",workerProfile:ur?"کاریگر پروفائل":"Worker profile",active:ur?"موجودہ کام":"Current job",chat:selected.name,complete:ur?"کام مکمل":"Job complete",rating:ur?"ریٹنگ":"Rate experience",history:ur?"درخواستوں کی تاریخ":"Request history",account:ur?"اکاؤنٹ":"Account",settings:ur?"ایپ سیٹنگز":"App settings",support:ur?"مدد اور حفاظت":"Safety & support",workerHome:"KaamYab Pro",workerJob:ur?"کام کی تفصیل":"Job details",workerOffer:ur?"اپنی آفر دیں":"Send an offer",workerActive:ur?"موجودہ کام":"Current job",earnings:ur?"آمدنی":"Earnings",workerReviews:ur?"ریویوز":"Reviews",workerSetup:ur?"پروفائل بنائیں":"Create profile"};return <div className="screen-header"><button className="icon-button" onClick={back}><ArrowLeft size={19}/></button><strong>{titleMap[screen]}</strong>{screen==="account"?<button className="lang-button compact" onClick={()=>setLang(ur?"en":"ur")}>{ur?"English":"اردو"}</button>:<span className="header-spacer"/>}</div>}

  function Services(){return <div className="screen"><h1 className="page-title">{ur?"آپ کو کس کام میں مدد چاہیے؟":"What can we help with?"}</h1><p className="page-sub">{ur?"سروس منتخب کریں یا اپنا کام تلاش کریں۔":"Choose a category or search for the task you need."}</p><div className="problem-bar compact-bar"><Search size={18}/><input placeholder={ur?"سروس تلاش کریں":"Search services"}/></div><div className="service-list">{(Object.keys(SERVICE_META) as ServiceKey[]).map(s=><button key={s} onClick={()=>chooseService(s)}><span className="list-glyph">{SERVICE_META[s].glyph}</span><span><strong>{ur?SERVICE_META[s].ur:SERVICE_META[s].en}</strong><small>{SERVICE_META[s].note}</small></span><ChevronRight size={18}/></button>)}</div></div>}

  function RequestDetails(){return <div className="screen"><Progress n={2}/><h1 className="page-title">{ur?"تفصیل کی تصدیق کریں":"Confirm the details"}</h1><p className="page-sub">{ur?"جو چیز غلط ہو اسے تبدیل کریں۔":"Change anything that looks wrong."}</p><Field label={ur?"سروس":"Service"}><select value={draft.service} onChange={e=>setDraft(d=>({...d,service:e.target.value as ServiceKey}))}>{<option value="">{ur?"سروس منتخب کریں":"Choose a service"}</option>}{(Object.keys(SERVICE_META) as ServiceKey[]).map(s=><option key={s} value={s}>{ur?SERVICE_META[s].ur:SERVICE_META[s].en}</option>)}</select></Field><Field label={ur?"مسئلہ":"Problem"}><textarea rows={4} value={draft.issue} onChange={e=>setDraft(d=>({...d,issue:e.target.value}))} placeholder={ur?"مثلاً: اے سی چل رہا ہے مگر ٹھنڈا نہیں کر رہا":"Example: AC is running but not cooling"}/></Field><Field label={ur?"مقام":"Location"}><button className="field-button" onClick={()=>setScreen("location")}>{draft.area}<ChevronRight size={17}/></button></Field><button className="primary-button" disabled={!draft.service||!draft.issue.trim()} onClick={()=>setScreen("location")}>{ur?"جاری رکھیں":"Continue"}</button></div>}

  function LocationScreen(){return <div className="location-screen"><div className="fake-map"><button className="map-back" onClick={back}><ArrowLeft size={19}/></button><div className="map-label"><small>{ur?"کام کی جگہ":"Job location"}</small><strong>Bahria Town</strong></div><div className="map-pin"><MapPin size={22}/></div></div><div className="location-sheet"><span className="drag-handle"></span><h1 className="page-title">{ur?"مقام کی تصدیق کریں":"Confirm location"}</h1><p className="page-sub">{ur?"ضرورت ہو تو پتہ تبدیل کریں۔":"Adjust the address if needed."}</p><input className="field-control" value={draft.area} onChange={e=>setDraft(d=>({...d,area:e.target.value}))}/><button className="primary-button" onClick={()=>setScreen("schedule")}>{ur?"یہ مقام استعمال کریں":"Use this location"}</button></div></div>}

  function Schedule(){return <div className="screen"><Progress n={3}/><h1 className="page-title">{ur?"کب اور کتنا بجٹ؟":"When and for how much?"}</h1><Field label={ur?"مدد کب چاہیے؟":"When do you need help?"}><div className="choice-grid">{[["today",ur?"آج":"Today"],["tomorrow",ur?"کل":"Tomorrow"],["week",ur?"اس ہفتے":"This week"],["schedule",ur?"وقت منتخب کریں":"Choose time"]].map(([v,l])=><button key={v} className={draft.when===v?"choice active":"choice"} onClick={()=>setDraft(d=>({...d,when:v as Draft["when"]}))}>{l}</button>)}</div></Field><Field label={ur?"آپ کا بجٹ":"Your budget"}><div className="budget-input"><span>Rs.</span><input type="number" value={draft.budget} onChange={e=>setDraft(d=>({...d,budget:Number(e.target.value)}))}/></div></Field><Field label={ur?"کتنی جلدی؟":"Urgency"}><div className="choice-grid two">{[["asap",ur?"جلد از جلد":"As soon as possible"],["flexible",ur?"وقت لچکدار ہے":"Flexible"]].map(([v,l])=><button key={v} className={draft.urgency===v?"choice active":"choice"} onClick={()=>setDraft(d=>({...d,urgency:v as Draft["urgency"]}))}>{l}</button>)}</div></Field><button className="primary-button" onClick={()=>setScreen("review")}>{ur?"جاری رکھیں":"Continue"}</button></div>}

  function ReviewRequest(){return <div className="screen"><h1 className="page-title">{ur?"پوسٹ کرنے کے لیے تیار؟":"Ready to post?"}</h1><div className="summary-card"><div><strong>{draft.service?ur?SERVICE_META[draft.service].ur:SERVICE_META[draft.service].en:"Service"}</strong><span>{draft.issue}</span></div><span className="pill">{draft.when==="today"?(ur?"آج":"Today"):draft.when}</span><hr/><InfoRow k={ur?"مقام":"Location"} v={draft.area}/><InfoRow k={ur?"بجٹ":"Budget"} v={`Rs. ${draft.budget.toLocaleString()}`}/></div><button className="primary-button" onClick={()=>setScreen("posted")}>{ur?"درخواست پوسٹ کریں":"Post request"}</button><button className="secondary-button" onClick={()=>setScreen("request")}>{ur?"تفصیل تبدیل کریں":"Edit details"}</button></div>}

  function Posted(){return <div className="screen success-screen"><div className="success-icon"><Check size={36}/></div><h1 className="page-title">{ur?"آپ کی درخواست لائیو ہے":"Your request is live"}</h1><p className="page-sub">{ur?"قریب کے کاریگر اب آپ کو آفر بھیج سکتے ہیں۔":"Nearby professionals can now send you offers. We’ll notify you as they arrive."}</p><div className="summary-card left"><InfoRow k={draft.service?ur?SERVICE_META[draft.service].ur:SERVICE_META[draft.service].en:"Service"} v={draft.area}/></div><button className="primary-button" onClick={()=>setScreen("offers")}>{ur?"آفرز دیکھیں":"View offers"}</button><button className="secondary-button" onClick={()=>setScreen("home")}>{ur?"ہوم پر واپس":"Back to home"}</button></div>}

  function Offers(){return <div className="screen"><div className="summary-card compact"><InfoRow k={draft.service?ur?SERVICE_META[draft.service].ur:SERVICE_META[draft.service].en:"AC repair"} v={`${draft.area.split(",")[0]} · ${ur?"آج":"Today"}`}/><span className="pill success">3 {ur?"آفرز":"offers"}</span></div><SectionTitle title={ur?"آفرز کا موازنہ کریں":"Compare offers"} action={ur?"ترتیب":"Sort"}/><div className="offer-list">{offers.map((o,i)=><div className="offer-card" key={o.worker.id}><div className="worker-row"><WorkerAvatar worker={o.worker}/><div><strong>{o.worker.name}</strong><span>★ {o.worker.rating} · {o.worker.jobs} {ur?"کام":"jobs"} · {o.worker.distance.toFixed(1)} km</span></div>{i===0&&<span className="pill success">{ur?"اعلیٰ ریٹنگ":"Top rated"}</span>}</div><div className="offer-meta"><div><small>{ur?"آفر":"Offer"}</small><strong>Rs. {o.price.toLocaleString()}</strong></div><div><small>{ur?"پہنچنے کا وقت":"Can arrive"}</small><strong>{o.etaMin} min</strong></div></div><div className="offer-actions"><button onClick={()=>{setSelected(o.worker);setScreen("workerProfile")}}>{ur?"پروفائل":"Profile"}</button><button className="accept" onClick={()=>{setSelected(o.worker);setScreen("active")}}>{ur?"قبول کریں":"Accept"}</button></div></div>)}</div></div>}

  function WorkerProfile(){return <div className="screen"><div className="profile-head"><WorkerAvatar worker={selected} large/><h1>{selected.name}</h1><p>{ur?selected.skillUr:SERVICE_META[selected.skill].en} · {selected.city}</p><div><span className="pill success">{ur?"شناخت تصدیق شدہ":"Identity verified"}</span> {selected.available&&<span className="pill success">{ur?"ابھی دستیاب":"Available now"}</span>}</div></div><div className="stats-grid"><Stat n={selected.rating} l={ur?"ریٹنگ":"Rating"}/><Stat n={selected.jobs} l={ur?"کام":"Jobs"}/><Stat n={`${selected.experienceYears} yrs`} l={ur?"تجربہ":"Experience"}/></div><SectionTitle title={ur?"حالیہ کام":"Recent work"} action={ur?"سب دیکھیں":"See all"}/><div className="gallery"><span></span><span></span><span></span></div><SectionTitle title={ur?"ریویوز":"Reviews"} action={`${selected.jobs} ${ur?"ریویوز":"reviews"}`}/><div className="review-card"><strong>★★★★★</strong><p>{ur?"وقت پر آئے اور کام صحیح کیا۔":"Reached on time and fixed the problem properly."}</p></div><button className="primary-button" onClick={()=>setScreen("active")}>{ur?`${selected.name} کو منتخب کریں`:`Request ${selected.name.split(" ")[0]}`}</button></div>}

  function ActiveJob(){return <div className="screen"><div className="summary-card"><span className="pill success">{ur?"تصدیق شدہ":"Confirmed"}</span><h2>{draft.service?ur?SERVICE_META[draft.service].ur:SERVICE_META[draft.service].en:"AC repair"}</h2><p>{selected.name} · Rs. {draft.budget.toLocaleString()}</p></div><SectionTitle title={ur?"حالت":"Status"}/><Timeline current={2}/><button className="primary-button" onClick={()=>setScreen("chat")}><Phone size={17}/>{ur?"کاریگر سے رابطہ":"Contact worker"}</button><button className="secondary-button" onClick={()=>setScreen("complete")}>{ur?"ڈیمو: کام مکمل کریں":"Demo: mark complete"}</button></div>}

  function Chat(){return <div className="chat-screen"><div className="chat-body"><div className="bubble theirs">Assalam o Alaikum. I can reach in around 35 minutes.</div><div className="bubble mine">Perfect, please call when you arrive.</div><div className="bubble theirs">Sure. I’ll bring the required tools as well.</div></div><div className="chat-input"><input placeholder={ur?"پیغام لکھیں":"Write a message…"}/><button><Send size={18}/></button></div></div>}

  function Complete(){return <div className="screen success-screen"><div className="success-icon green"><Check size={36}/></div><h1 className="page-title">{ur?"کام مکمل ہوگیا":"Job completed"}</h1><p className="page-sub">{selected.name} {ur?"نے کام مکمل نشان زد کیا۔":"marked the job as complete."}</p><div className="summary-card left"><InfoRow k={ur?"آخری رقم":"Final amount"} v={`Rs. ${draft.budget.toLocaleString()}`}/><InfoRow k={ur?"مکمل ہوا":"Completed"} v={ur?"آج، 2:18 PM":"Today, 2:18 PM"}/></div><button className="primary-button" onClick={()=>setScreen("rating")}>{ur?"تجربہ ریٹ کریں":"Rate your experience"}</button></div>}

  function Rating(){return <div className="screen rating-screen"><WorkerAvatar worker={selected} large/><h1 className="page-title">{ur?`${selected.name} کیسے تھے؟`:`How was ${selected.name.split(" ")[0]}?`}</h1><div className="stars">{[1,2,3,4,5].map(n=><button key={n} onClick={()=>setRating(n)} className={n<=rating?"on":""}>★</button>)}</div><p className="page-sub">{ur?"آپ کا ریویو دوسروں کو بہتر انتخاب میں مدد دیتا ہے۔":"Your review helps other customers choose confidently."}</p><textarea className="field-control tall" value={review} onChange={e=>setReview(e.target.value)} placeholder={ur?"مختصر ریویو لکھیں":"Write a short review…"}/><button className="primary-button" onClick={()=>setScreen("home")}>{ur?"ریویو جمع کریں":"Submit review"}</button></div>}

  function History(){return <div className="screen"><div className="filter-row"><button className="active">{ur?"سب":"All"}</button><button>{ur?"مکمل":"Completed"}</button><button>{ur?"منسوخ":"Cancelled"}</button></div><SectionTitle title="12 Sep"/><HistoryRow title="AC repair" meta="Bahria Town · 4:01 PM" price="Rs. 2,400"/><HistoryRow title="Plumbing" meta="PWD · 8:06 AM" price="Rs. 1,800"/><SectionTitle title="10 Aug"/><HistoryRow title={ur?"منسوخ":"Cancelled"} meta="Electrical · Bahria Town" price="Rs. 0" danger/></div>}

  function Account(){return <div className="screen"><div className="account-user"><span className="user-avatar">MF</span><div><strong>Mehreen</strong><span>0300 1234567</span></div><ChevronRight size={18}/></div><SectionTitle title={ur?"آپ کا کامیاب":"Your KaamYab"}/><MenuList items={[["Notifications","Bell"],["Saved workers","Star"],["Addresses","Map"]]}/><SectionTitle title={ur?"کامیاب کے ساتھ کام کریں":"Work with KaamYab"}/><button className="menu-card" onClick={()=>setScreen("workerSetup")}><BriefcaseBusiness size={18}/><span><strong>{ur?"اپنی سروس دیں":"Offer your services"}</strong><small>{ur?"کاریگر پروفائل بنائیں":"Create a worker profile"}</small></span><ChevronRight size={18}/></button><SectionTitle title={ur?"مدد":"Support"}/><button className="menu-card" onClick={()=>setScreen("support")}><ShieldCheck size={18}/><span><strong>{ur?"مدد اور حفاظت":"Help & safety"}</strong></span><ChevronRight size={18}/></button><button className="menu-card" onClick={()=>setScreen("settings")}><Languages size={18}/><span><strong>{ur?"ایپ سیٹنگز":"App settings"}</strong></span><ChevronRight size={18}/></button></div>}

  function Settings(){return <div className="screen"><div className="menu-list"><MenuRow icon={<Languages size={18}/>} title={ur?"زبان":"Language"} sub={ur?"اردو":"English"}/><MenuRow icon={<MapPin size={18}/>} title={ur?"لوکیشن شیئرنگ":"Location sharing"} sub={ur?"فعال کام کے دوران":"While a job is active"}/><MenuRow icon={<ShieldCheck size={18}/>} title={ur?"قانونی دستاویزات":"Legal documents"}/><MenuRow icon={<CircleUserRound size={18}/>} title={ur?"اکاؤنٹ حذف کریں":"Delete account"}/></div></div>}
  function Support(){return <div className="screen"><div className="support-icon">!</div><h1 className="page-title center">{ur?"مدد چاہیے؟":"Need help?"}</h1><div className="menu-list"><MenuRow icon={<Phone size={18}/>} title={ur?"سپورٹ سے رابطہ":"Contact support"} sub={ur?"درخواست یا اکاؤنٹ مسئلہ":"Request or account issue"}/><MenuRow icon={<ShieldCheck size={18}/>} title={ur?"رپورٹ کریں":"Report a worker or customer"} sub={ur?"حفاظت یا فراڈ":"Safety, conduct or fraud"}/><MenuRow icon={<Check size={18}/>} title={ur?"حفاظتی مشورے":"Safety tips"}/></div></div>}

  function WorkerSetup(){return <div className="screen"><Progress n={2}/><h1 className="page-title">{ur?"صارفین کو بتائیں آپ کیا کرتے ہیں":"Tell customers what you do"}</h1><p className="page-sub">{ur?"سادہ معلومات کافی ہیں۔ لمبی سی وی کی ضرورت نہیں۔":"Simple details are enough. No long CV or AI guessing."}</p><Field label={ur?"پورا نام":"Full name"}><input defaultValue="Ahmed Raza"/></Field><Field label={ur?"بنیادی ہنر":"Primary skill"}><select defaultValue="Electrician">{(Object.keys(SERVICE_META) as ServiceKey[]).map(s=><option key={s}>{s}</option>)}</select></Field><Field label={ur?"شہر / علاقہ":"City / area"}><input defaultValue="Rawalpindi · Bahria Town"/></Field><Field label={ur?"تجربہ":"Experience"}><input defaultValue="6 years"/></Field><Field label={ur?"ابتدائی ریٹ":"Starting rate"}><input defaultValue="Rs. 1,500"/></Field><button className="primary-button" onClick={()=>setScreen("workerHome")}>{ur?"پروفائل مکمل کریں":"Complete profile"}</button></div>}

  function WorkerHome(){return <div className="screen"><div className="worker-mode-top"><div><small>{ur?"کام کی حالت":"Work status"}</small><strong>{workerOnline?(ur?"آپ آن لائن ہیں":"You’re online"):(ur?"آپ آف لائن ہیں":"You’re offline")}</strong></div><button className={workerOnline?"toggle on":"toggle"} onClick={()=>setWorkerOnline(v=>!v)}><span/></button></div><div className="stats-grid"><Stat n="Rs. 8.4k" l={ur?"اس ہفتے":"This week"}/><Stat n="12" l={ur?"کام":"Jobs"}/><Stat n="4.8" l={ur?"ریٹنگ":"Rating"}/></div><SectionTitle title={ur?"قریب موجود کام":"Jobs near you"} action={ur?"فلٹر":"Filter"}/><button className="job-card" onClick={()=>setScreen("workerJob")}><div className="job-top"><span className="pill blue">Plumbing</span><span>1.6 km</span></div><strong>{ur?"کچن سنک لیک کر رہا ہے":"Kitchen sink leaking"}</strong><small>Bahria Town Phase 4 · {ur?"آج":"Today"}</small><div className="job-bottom"><div><small>{ur?"بجٹ":"Budget"}</small><strong>Rs. 1,500–2,000</strong></div><ChevronRight size={18}/></div></button><button className="job-card"><div className="job-top"><span className="pill success">Electrical</span><span>2.2 km</span></div><strong>{ur?"سیلنگ فین کام نہیں کر رہا":"Ceiling fan not working"}</strong><small>PWD · {ur?"آج":"Today"}</small></button><div className="worker-shortcuts"><button onClick={()=>setScreen("earnings")}><WalletCards size={18}/>{ur?"آمدنی":"Earnings"}</button><button onClick={()=>setScreen("workerReviews")}><Star size={18}/>{ur?"ریویوز":"Reviews"}</button></div></div>}

  function WorkerJob(){return <div className="screen"><div className="summary-card"><div className="job-top"><span className="pill blue">Plumbing</span><span>1.6 km</span></div><h2>{ur?"کچن سنک لیک کر رہا ہے":"Kitchen sink leaking"}</h2><p>Bahria Town Phase 4 · {ur?"آج چاہیے":"Needed today"}</p></div><SectionTitle title={ur?"صارف کی درخواست":"Customer request"}/><div className="review-card"><small>{ur?"تفصیل":"Description"}</small><p>{ur?"کچن کے سنک کے نیچے سے پانی لیک ہو رہا ہے۔":"Water is leaking from under the kitchen sink."}</p></div><div className="offer-meta standalone"><div><small>{ur?"بجٹ":"Budget"}</small><strong>Rs. 1,500–2,000</strong></div><div><small>{ur?"فاصلہ":"Distance"}</small><strong>1.6 km</strong></div></div><button className="primary-button" onClick={()=>setScreen("workerActive")}>{ur?"بجٹ قبول کریں":"Accept budget"}</button><button className="secondary-button" onClick={()=>setScreen("workerOffer")}>{ur?"اپنی قیمت دیں":"Send another offer"}</button></div>}

  function WorkerOfferScreen(){return <div className="screen"><h1 className="page-title">{ur?"اپنی آفر دیں":"Your offer"}</h1><Field label={ur?"قیمت":"Price"}><input defaultValue="Rs. 1,800"/></Field><Field label={ur?"کب پہنچ سکتے ہیں؟":"When can you arrive?"}><div className="choice-grid"><button className="choice active">30–45 min</button><button className="choice">1 hour</button><button className="choice">2 hours</button><button className="choice">Choose time</button></div></Field><Field label={ur?"اختیاری نوٹ":"Optional note"}><textarea rows={3} defaultValue="I can inspect and repair the leak today."/></Field><button className="primary-button" onClick={()=>setScreen("workerActive")}>{ur?"آفر بھیجیں":"Send offer"}</button></div>}

  function WorkerActive(){return <div className="screen"><div className="summary-card"><span className="pill success">{ur?"تصدیق شدہ":"Confirmed"}</span><h2>{ur?"کچن سنک لیک کر رہا ہے":"Kitchen sink leaking"}</h2><p>Bahria Town · Rs. 1,800</p></div><SectionTitle title={ur?"حالت":"Status"}/><Timeline current={2}/><button className="primary-button">{ur?"میں پہنچ گیا ہوں":"I’ve arrived"}</button><button className="secondary-button"><Phone size={17}/>{ur?"صارف کو کال کریں":"Call customer"}</button></div>}

  function Earnings(){return <div className="screen"><small className="kicker">{ur?"کل آمدنی":"TOTAL EARNINGS"}</small><div className="earn-number">Rs. 8,400</div><div className="chart-line"></div><div className="stats-grid"><Stat n="12" l={ur?"کام":"Jobs"}/><Stat n="Rs. 700" l={ur?"اوسط":"Avg. job"}/><Stat n="4.8" l={ur?"ریٹنگ":"Rating"}/></div><SectionTitle title={ur?"حالیہ آمدنی":"Recent earnings"}/><HistoryRow title="Kitchen sink repair" meta="Today" price="Rs. 1,800"/><HistoryRow title="Fan installation" meta="Yesterday" price="Rs. 1,200"/></div>}
  function WorkerReviews(){return <div className="screen center"><div className="earn-number">4.8</div><div className="stars static">★★★★★</div><p className="page-sub">126 {ur?"ریویوز":"reviews"}</p><SectionTitle title={ur?"تازہ ریویوز":"Latest reviews"}/><div className="review-card left"><strong>★★★★★</strong><p>{ur?"بہت پروفیشنل اور وقت پر۔":"Very professional and on time."}</p><small>Hammad · 2 days ago</small></div><div className="review-card left"><strong>★★★★★</strong><p>{ur?"مسئلہ جلد حل کیا۔":"Solved the issue quickly."}</p><small>Sara · 1 week ago</small></div></div>}

  function BottomNav(){const workerMode=["workerHome","workerJob","workerOffer","workerActive","earnings","workerReviews"].includes(screen);if(workerMode)return <nav className="bottom-nav"><NavItem active={screen==="workerHome"} icon={<Home/>} label={ur?"ہوم":"Home"} onClick={()=>setScreen("workerHome")}/><NavItem active={screen==="workerJob"} icon={<BriefcaseBusiness/>} label={ur?"کام":"Jobs"} onClick={()=>setScreen("workerJob")}/><button className="center-nav worker-center" onClick={()=>setWorkerOnline(v=>!v)}><span className={workerOnline?"online-dot on":"online-dot"}/><small>{workerOnline?(ur?"آن لائن":"Online"):(ur?"آف لائن":"Offline")}</small></button><NavItem active={screen==="earnings"} icon={<WalletCards/>} label={ur?"آمدنی":"Earnings"} onClick={()=>setScreen("earnings")}/><NavItem active={false} icon={<CircleUserRound/>} label={ur?"اکاؤنٹ":"Account"} onClick={()=>setScreen("account")}/></nav>;
    return <nav className="bottom-nav"><NavItem active={screen==="home"} icon={<Home/>} label={t.home} onClick={()=>navTo("home")}/><NavItem active={screen==="history"||screen==="offers"} icon={<BriefcaseBusiness/>} label={t.requests} onClick={()=>navTo("requests")}/><button className="center-nav" onClick={()=>navTo("ask")}><Mic/><small>{t.ask}</small></button><NavItem active={screen==="active"||screen==="chat"} icon={<Clock3/>} label={t.activity} onClick={()=>navTo("activity")}/><NavItem active={screen==="account"||screen==="settings"} icon={<CircleUserRound/>} label={t.account} onClick={()=>navTo("account")}/></nav>}

  function VoiceSheet(){return <div className="overlay" onMouseDown={e=>{if(e.currentTarget===e.target)setVoiceOpen(false)}}><section className="voice-sheet"><span className="drag-handle"></span><div className="voice-top"><div><h2>{ur?"اپنا مسئلہ بتائیں":"Tell us what’s wrong"}</h2><p>{ur?"عام انداز میں بولیں۔ ایک مختصر تفصیل کافی ہے۔":"Speak naturally. One short description is enough."}</p></div><button className="icon-button" onClick={()=>setVoiceOpen(false)}><X size={18}/></button></div><div className="voice-examples"><span>“My AC is running but it isn’t cooling.”</span><span>“Mere kitchen sink se pani leak ho raha hai.”</span></div><button className={recording?"record-button live":"record-button"} onClick={recording?stopVoice:startVoice} disabled={voiceBusy}><Mic size={31}/></button><div className="record-label"><strong>{voiceBusy?(ur?"سمجھا جا رہا ہے…":"Understanding…"):recording?(ur?"ریکارڈنگ… روکنے کے لیے ٹیپ کریں":"Recording… tap to stop"):(ur?"بولنے کے لیے ٹیپ کریں":"Tap to speak")}</strong></div><div className="typed-row"><input value={voiceText} onChange={e=>setVoiceText(e.target.value)} placeholder={ur?"یا لکھ کر بتائیں":"Or type what you need"}/><button onClick={submitTypedVoice}><Send size={17}/></button></div>{voiceMessage&&<div className="voice-message">{voiceMessage}</div>}{voiceText&&detectService(voiceText)&&<button className="primary-button" onClick={useVoice}>{ur?"تفصیل دیکھیں":"Review details"}</button>}</section></div>}
}

function SectionTitle({title,action,onClick}:{title:string;action?:string;onClick?:()=>void}){return <div className="section-title"><h2>{title}</h2>{action&&<button onClick={onClick}>{action}</button>}</div>}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="field"><span>{label}</span><div>{children}</div></label>}
function Progress({n}:{n:number}){return <div className="progress">{[1,2,3,4].map(i=><span key={i} className={i<=n?"on":""}/>)}</div>}
function InfoRow({k,v}:{k:string;v:string}){return <div className="info-row"><span>{k}</span><strong>{v}</strong></div>}
function WorkerAvatar({worker,large}:{worker:Worker&{distance?:number};large?:boolean}){const initials=worker.name.split(" ").map(x=>x[0]).join("").slice(0,2);return <span className={large?"worker-avatar large":"worker-avatar"}>{initials}</span>}
function Stat({n,l}:{n:string|number;l:string}){return <div className="stat"><strong>{n}</strong><span>{l}</span></div>}
function Timeline({current}:{current:number}){const items=["Worker selected","On the way","Arrived","Job complete"];return <div className="timeline">{items.map((x,i)=><div className={i<current?"timeline-item done":i===current?"timeline-item current":"timeline-item"} key={x}><span>{i<current?"✓":"○"}</span><strong>{x}</strong>{i===1&&<em>Live</em>}</div>)}</div>}
function HistoryRow({title,meta,price,danger}:{title:string;meta:string;price:string;danger?:boolean}){return <div className="history-row"><div><strong className={danger?"danger":""}>{title}</strong><span>{meta}</span></div><b>{price}</b></div>}
function MenuList({items}:{items:string[][]}){return <div className="menu-list">{items.map(([t])=><MenuRow key={t} title={t}/>)}</div>}
function MenuRow({icon,title,sub}:{icon?:React.ReactNode;title:string;sub?:string}){return <button className="menu-row">{icon&&<span className="menu-icon">{icon}</span>}<span><strong>{title}</strong>{sub&&<small>{sub}</small>}</span><ChevronRight size={18}/></button>}
function NavItem({active,icon,label,onClick}:{active:boolean;icon:React.ReactNode;label:string;onClick:()=>void}){return <button className={active?"nav-item active":"nav-item"} onClick={onClick}>{icon}<small>{label}</small></button>}
