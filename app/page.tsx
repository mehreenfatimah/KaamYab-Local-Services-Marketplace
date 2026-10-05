"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Bell, BriefcaseBusiness, Camera, Check, ChevronRight, CircleUserRound,
  Clock3, Home, Languages, LocateFixed, MapPin, MessageCircle, Mic, Phone, Zap,
  Snowflake, Sparkles, Search, Send, ShieldCheck, Star, Wrench, X, WalletCards
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

type Screen =
  "home"|"services"|"request"|"location"|"schedule"|"review"|"posted"|"offers"|
  "workerProfile"|"active"|"chat"|"complete"|"rating"|"history"|"account"|
  "settings"|"support"|"notifications"|"savedWorkers"|"addresses"|"legal"|
  "contactSupport"|"report"|"safetyTips"|"workerHome"|"workerJob"|"workerOffer"|
  "workerActive"|"earnings"|"workerReviews"|"workerSetup";

type Draft = {
  service: ServiceKey | "";
  issue: string;
  area: string;
  when: "today" | "tomorrow" | "week" | "schedule";
  scheduledDate: string;
  scheduledTime: string;
  budget: number;
  urgency: "asap" | "flexible";
};

type RequestStatus = "posted" | "accepted" | "completed" | "cancelled";

type ServiceRequest = {
  id: string;
  service: ServiceKey;
  issue: string;
  area: string;
  when: Draft["when"];
  scheduledDate: string;
  scheduledTime: string;
  budget: number;
  urgency: Draft["urgency"];
  status: RequestStatus;
  createdAt: string;
  workerId?: string;
};

type ChatMessage = {
  id: string;
  requestId: string;
  sender: "customer" | "worker";
  text: string;
  createdAt: string;
};

type ReviewEntry = {
  id: string;
  requestId: string;
  workerId: string;
  rating: number;
  text: string;
  createdAt: string;
};

const EN = {
  home:"Home", requests:"Requests", ask:"Request", activity:"Activity", account:"Account",
};
const UR = {
  home:"ہوم", requests:"درخواستیں", ask:"درخواست", activity:"سرگرمی", account:"اکاؤنٹ",
};

const STORAGE = {
  requests:"kaamyab.requests.v2",
  messages:"kaamyab.messages.v2",
  reviews:"kaamyab.reviews.v2",
  saved:"kaamyab.savedWorkers.v2",
  lang:"kaamyab.lang.v2",
  online:"kaamyab.workerOnline.v2",
};

function seedRequests(): ServiceRequest[] {
  const now = Date.now();
  return [
    {
      id:"demo-ac",
      service:"AC Technician",
      issue:"AC was running but not cooling properly.",
      area:"Bahria Town Phase 4, Rawalpindi",
      when:"today",
      scheduledDate:"",
      scheduledTime:"",
      budget:2800,
      urgency:"asap",
      status:"completed",
      createdAt:new Date(now - 24*60*60*1000).toISOString(),
      workerId:"w3",
    },
    {
      id:"demo-plumbing",
      service:"Plumber",
      issue:"Kitchen sink leak.",
      area:"Bahria Town Phase 4, Rawalpindi",
      when:"today",
      scheduledDate:"",
      scheduledTime:"",
      budget:1800,
      urgency:"flexible",
      status:"completed",
      createdAt:new Date(now - 4*24*60*60*1000).toISOString(),
      workerId:"w1",
    },
    {
      id:"demo-electric",
      service:"Electrician",
      issue:"Ceiling fan stopped working.",
      area:"PWD, Rawalpindi",
      when:"week",
      scheduledDate:"",
      scheduledTime:"",
      budget:2200,
      urgency:"flexible",
      status:"cancelled",
      createdAt:new Date(now - 7*24*60*60*1000).toISOString(),
      workerId:"w2",
    },
  ];
}

function loadJSON<T>(key:string, fallback:T):T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

export default function Page(){
  const [showSplash,setShowSplash]=useState(true);
  const [hydrated,setHydrated]=useState(false);
  const [historyFilter,setHistoryFilter]=useState<"all"|"completed"|"cancelled">("all");
  const [activeRequestId,setActiveRequestId]=useState<string|null>(null);
  const [chatInput,setChatInput]=useState("");
  const [messages,setMessages]=useState<ChatMessage[]>([]);
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
  const photoInputRef=useRef<HTMLInputElement|null>(null);
  const [problemPhoto,setProblemPhoto]=useState<string>("");
  const [location,setLocation]=useState<[number,number]>([33.5651,73.0169]);
  const [locationLabel,setLocationLabel]=useState("Bahria Town, Rawalpindi");
  const [serviceSearch,setServiceSearch]=useState("");
  const [savedWorkerIds,setSavedWorkerIds]=useState<string[]>([]);
  const [workerOnline,setWorkerOnline]=useState(true);
  const [locationSharing,setLocationSharing]=useState(true);
  const [rating,setRating]=useState(5);
  const [review,setReview]=useState("");
  const [reviews,setReviews]=useState<ReviewEntry[]>([]);
  const [supportMessage,setSupportMessage]=useState("");
  const [reportMessage,setReportMessage]=useState("");
  const [workerArrived,setWorkerArrived]=useState(false);

  const [draft,setDraft]=useState<Draft>({
    service:"",
    issue:"",
    area:"Bahria Town Phase 4, Rawalpindi",
    when:"today",
    scheduledDate:"",
    scheduledTime:"",
    budget:2400,
    urgency:"asap"
  });

  const [requests,setRequests]=useState<ServiceRequest[]>(seedRequests());
  const [selected,setSelected]=useState<Worker>(workers[1]);

  useEffect(()=>{
    const timer=setTimeout(()=>setShowSplash(false),1000);
    return ()=>clearTimeout(timer);
  },[]);

  useEffect(()=>{
    setRequests(loadJSON(STORAGE.requests, seedRequests()));
    setMessages(loadJSON(STORAGE.messages, []));
    setReviews(loadJSON(STORAGE.reviews, []));
    setSavedWorkerIds(loadJSON(STORAGE.saved, []));
    const savedLang = localStorage.getItem(STORAGE.lang) as Language | null;
    if(savedLang==="en" || savedLang==="ur") setLang(savedLang);
    const savedOnline = localStorage.getItem(STORAGE.online);
    if(savedOnline!==null) setWorkerOnline(savedOnline==="true");
    setHydrated(true);
  },[]);

  useEffect(()=>{ if(hydrated) localStorage.setItem(STORAGE.requests,JSON.stringify(requests)); },[requests,hydrated]);
  useEffect(()=>{ if(hydrated) localStorage.setItem(STORAGE.messages,JSON.stringify(messages)); },[messages,hydrated]);
  useEffect(()=>{ if(hydrated) localStorage.setItem(STORAGE.reviews,JSON.stringify(reviews)); },[reviews,hydrated]);
  useEffect(()=>{ if(hydrated) localStorage.setItem(STORAGE.saved,JSON.stringify(savedWorkerIds)); },[savedWorkerIds,hydrated]);
  useEffect(()=>{ if(hydrated) localStorage.setItem(STORAGE.lang,lang); },[lang,hydrated]);
  useEffect(()=>{ if(hydrated) localStorage.setItem(STORAGE.online,String(workerOnline)); },[workerOnline,hydrated]);

  const nearby=useMemo(
    ()=>workers
      .map(w=>({...w,distance:distanceKm(location[0],location[1],w.lat,w.lng)}))
      .sort((a,b)=>Number(b.available)-Number(a.available)||a.distance-b.distance),
    [location]
  );

  const offers: WorkerOffer[] = nearby.slice(0,3).map((w,i)=>({
    worker:w,
    price:[2400,2000,2700][i],
    etaMin:[35,60,50][i],
    note:i===0 ? "Can inspect and repair today." : undefined
  }));

  const activeRequest = requests.find(r=>r.id===activeRequestId)
    || requests.find(r=>r.status==="accepted")
    || requests.find(r=>r.status==="posted");

  const activeMessages = activeRequest
    ? messages.filter(m=>m.requestId===activeRequest.id)
    : [];

  const completedCount = requests.filter(r=>r.status==="completed").length;
  const activeCount = requests.filter(r=>r.status==="posted" || r.status==="accepted").length;
const recentRequests = [...requests]
  .sort((a,b)=>+new Date(b.createdAt)-+new Date(a.createdAt))
  .slice(0,1);

  function resetDraft(){
    setDraft({
      service:"",
      issue:"",
      area:locationLabel || "Bahria Town Phase 4, Rawalpindi",
      when:"today",
      scheduledDate:"",
      scheduledTime:"",
      budget:2400,
      urgency:"asap"
    });
    setProblemPhoto("");
  }

  function sendMessage(){
    if(!activeRequest) return;
    const text=chatInput.trim();
    if(!text) return;
    setMessages(prev=>[
      ...prev,
      {
        id:crypto.randomUUID(),
        requestId:activeRequest.id,
        sender:"customer",
        text,
        createdAt:new Date().toISOString()
      }
    ]);
    setChatInput("");
  }

  function postRequest(){
    if(!draft.service){
      alert(ur?"براہ کرم سروس منتخب کریں۔":"Please select a service.");
      return;
    }
    if(draft.when==="schedule" && (!draft.scheduledDate || !draft.scheduledTime)){
      alert(ur?"تاریخ اور وقت منتخب کریں۔":"Please choose a date and time.");
      return;
    }
    const newRequest:ServiceRequest={
      id:crypto.randomUUID(),
      service:draft.service,
      issue:draft.issue.trim(),
      area:draft.area,
      when:draft.when,
      scheduledDate:draft.scheduledDate,
      scheduledTime:draft.scheduledTime,
      budget:draft.budget,
      urgency:draft.urgency,
      status:"posted",
      createdAt:new Date().toISOString()
    };
    setRequests(prev=>[newRequest,...prev]);
    setActiveRequestId(newRequest.id);
    setScreen("posted");
  }

  function acceptWorker(worker:Worker){
    if(!activeRequestId) return;
    setSelected(worker);
    setRequests(prev=>prev.map(r=>r.id===activeRequestId?{...r,status:"accepted",workerId:worker.id}:r));
    setScreen("active");
  }

  function completeActiveRequest(){
    if(!activeRequest) return;
    setRequests(prev=>prev.map(r=>r.id===activeRequest.id?{...r,status:"completed"}:r));
    setScreen("complete");
  }

  function cancelActiveRequest(){
    if(!activeRequest) return;
    if(!window.confirm(ur?"کیا آپ واقعی درخواست منسوخ کرنا چاہتے ہیں؟":"Cancel this request?")) return;
    setRequests(prev=>prev.map(r=>r.id===activeRequest.id?{...r,status:"cancelled"}:r));
    setActiveRequestId(null);
    setScreen("history");
  }

  function submitReview(){
    if(!activeRequest) {
      setScreen("home");
      return;
    }
    setReviews(prev=>[
      {
        id:crypto.randomUUID(),
        requestId:activeRequest.id,
        workerId:selected.id,
        rating,
        text:review.trim(),
        createdAt:new Date().toISOString()
      },
      ...prev.filter(r=>r.requestId!==activeRequest.id)
    ]);
    setReview("");
    setRating(5);
    setActiveRequestId(null);
    resetDraft();
    setScreen("home");
  }

  function toggleSavedWorker(workerId:string){
    setSavedWorkerIds(prev=>prev.includes(workerId)?prev.filter(id=>id!==workerId):[...prev,workerId]);
  }

  function back(){
    const map:Partial<Record<Screen,Screen>>={
      services:"home",request:"home",location:"request",schedule:"location",review:"schedule",
      posted:"review",offers:"posted",workerProfile:"offers",active:"offers",chat:"active",
      complete:"active",rating:"complete",history:"home",account:"home",settings:"account",
      support:"account",notifications:"account",savedWorkers:"account",addresses:"account",
      legal:"settings",contactSupport:"support",report:"support",safetyTips:"support",
      workerHome:"account",workerJob:"workerHome",workerOffer:"workerJob",workerActive:"workerHome",
      earnings:"workerHome",workerReviews:"workerHome",workerSetup:"account"
    };
    setScreen(map[screen]||"home");
  }

  function chooseService(s:ServiceKey){
    setDraft(d=>({...d,service:s}));
    setScreen("request");
  }

  function locate(){
    navigator.geolocation?.getCurrentPosition(
      p=>{
        setLocation([p.coords.latitude,p.coords.longitude]);
        setLocationLabel(ur?"موجودہ مقام":"Current location");
        setDraft(d=>({...d,area:ur?"موجودہ مقام":"Current location"}));
      },
      ()=>alert(ur?"لوکیشن کی اجازت نہیں ملی۔":"Location permission was not available.")
    );
  }

  async function startVoice(){
    setVoiceMessage("");
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true});
      const mimeType=MediaRecorder.isTypeSupported("audio/webm;codecs=opus")?"audio/webm;codecs=opus":"audio/webm";
      const rec=new MediaRecorder(stream,{mimeType});
      chunksRef.current=[];
      rec.ondataavailable=e=>{if(e.data.size)chunksRef.current.push(e.data)};
      rec.onstop=async()=>{
        stream.getTracks().forEach(x=>x.stop());
        const blob=new Blob(chunksRef.current,{type:rec.mimeType});
        if(blob.size<1000){
          setVoiceMessage(ur?"ریکارڈنگ بہت مختصر تھی۔ دوبارہ کوشش کریں۔":"That recording was too short. Try again.");
          return;
        }
        setVoiceBusy(true);
        try{
          const fd=new FormData();
          fd.append("audio",blob,"voice.webm");
          fd.append("language",lang);
          const r=await fetch("/api/transcribe",{method:"POST",body:fd});
          const data=await r.json();
          if(!r.ok) throw new Error(data?.error||"failed");
          const text=cleanTranscript(data.text||"");
          setVoiceText(text);

          if(draft.service){
            setVoiceMessage(
              ur
                ?"آپ کی سروس پہلے سے منتخب ہے۔ نیلا بٹن دبائیں اور یہ متن مسئلے میں شامل ہو جائے گا۔"
                :"Your service is already selected. Press the blue send button to add this text as the problem."
            );
          }else{
            const service=detectService(text);
            if(service){
              setVoiceMessage(ur?"سروس سمجھ آگئی۔ نیلا بٹن دبائیں۔":"Service detected. Press the blue send button.");
            }else{
              setVoiceMessage(ur?"سروس منتخب نہیں ہے۔ پلمبر، الیکٹریشن یا اے سی جیسا لفظ شامل کریں۔":"No service is selected yet. Include a service such as plumber, electrician or AC.");
            }
          }
        }catch{
          setVoiceMessage(ur?"وائس ابھی دستیاب نہیں۔ آپ لکھ کر بھی درخواست بنا سکتے ہیں۔":"Voice is unavailable right now. You can still type your request.");
        }finally{
          setVoiceBusy(false);
        }
      };
      mediaRef.current=rec;
      rec.start();
      setRecording(true);
    }catch{
      setVoiceMessage(ur?"مائیکروفون کی اجازت درکار ہے۔":"Microphone permission is required.");
    }
  }

  function stopVoice(){mediaRef.current?.stop();setRecording(false)}

  function useVoice(){
    const text=cleanTranscript(voiceText);
    if(!text)return;

    if(draft.service){
      setDraft(d=>({...d,issue:text}));
      setVoiceOpen(false);
      setScreen("request");
      return;
    }

    const service=detectService(text);
    if(service){
      setDraft(d=>({...d,service,issue:text}));
      setVoiceOpen(false);
      setScreen("request");
    }else{
      setVoiceMessage(
        ur
          ?"پہلے سروس منتخب کریں، یا متن میں پلمبر، الیکٹریشن یا اے سی جیسی سروس شامل کریں۔"
          :"Choose a service first, or include a service such as plumber, electrician or AC."
      );
    }
  }

  function submitTypedVoice(){
    const text=cleanTranscript(voiceText);
    if(!text)return;

    // If the customer already chose a service, this field is simply the
    // problem description. It does not need to mention the service again.
    if(draft.service){
      setDraft(d=>({...d,issue:text}));
      setVoiceOpen(false);
      setScreen("request");
      return;
    }

    // Only infer/require a service when no service has been selected yet.
    const service=detectService(text);
    if(service){
      setDraft(d=>({...d,service,issue:text}));
      setVoiceOpen(false);
      setScreen("request");
    }else{
      setVoiceMessage(
        ur
          ?"ابھی سروس منتخب نہیں ہے۔ پلمبر، الیکٹریشن یا اے سی جیسی سروس شامل کریں۔"
          :"No service is selected yet. Include a service such as plumber, electrician or AC."
      );
    }
  }

  function navTo(k:"home"|"requests"|"ask"|"activity"|"account"){
    if(k==="home") setScreen("home");
    if(k==="requests") setScreen("history");
    if(k==="ask") setVoiceOpen(true);
    if(k==="activity"){
      if(activeRequest){
        setActiveRequestId(activeRequest.id);
        setScreen("active");
      }else{
        setScreen("history");
      }
    }
    if(k==="account") setScreen("account");
  }

  const showBottom=!(["location","chat"].includes(screen));

  if(showSplash){
    return <main className="app splash-app">
      <div className="app-shell splash-shell">
        <div className="splash-center">
          <div className="splash-wordmark"><span>Kaam</span><span>Yab</span></div>
        </div>
        <div className="splash-footer">
          <strong>KaamYab</strong>
          <div className="splash-footer-line"></div>
          <span className="splash-message">Connecting Pakistan&apos;s local workforce</span>
        </div>
      </div>
    </main>
  }

  return <main className={ur?"app rtl":"app"} dir={ur?"rtl":"ltr"}>
    <div className="app-shell">
      {screen==="home" ? HomeScreen() : ScreenHeader()}
      {screen==="services" && Services()}
      {screen==="request" && RequestDetails()}
      {screen==="location" && LocationScreen()}
      {screen==="schedule" && Schedule()}
      {screen==="review" && ReviewRequest()}
      {screen==="posted" && Posted()}
      {screen==="offers" && Offers()}
      {screen==="workerProfile" && WorkerProfile()}
      {screen==="active" && ActiveJob()}
      {screen==="chat" && Chat()}
      {screen==="complete" && Complete()}
      {screen==="rating" && Rating()}
      {screen==="history" && History()}
      {screen==="account" && Account()}
      {screen==="settings" && Settings()}
      {screen==="support" && Support()}
      {screen==="notifications" && Notifications()}
      {screen==="savedWorkers" && SavedWorkers()}
      {screen==="addresses" && Addresses()}
      {screen==="legal" && Legal()}
      {screen==="contactSupport" && ContactSupport()}
      {screen==="report" && Report()}
      {screen==="safetyTips" && SafetyTips()}
      {screen==="workerSetup" && WorkerSetup()}
      {screen==="workerHome" && WorkerHome()}
      {screen==="workerJob" && WorkerJob()}
      {screen==="workerOffer" && WorkerOfferScreen()}
      {screen==="workerActive" && WorkerActive()}
      {screen==="earnings" && Earnings()}
      {screen==="workerReviews" && WorkerReviews()}
      {showBottom && BottomNav()}
      {voiceOpen && VoiceSheet()}
    </div>
  </main>

  function HomeScreen(){
    return <div className="screen home-screen">
      <div className="home-top">
        <button className="brand-button home-wordmark-button" onClick={()=>setScreen("home")}>
          <span className="home-wordmark"><span>Kaam</span><span>Yab</span></span>
        </button>
        <button className="lang-button" onClick={()=>setLang(ur?"en":"ur")}>
          <Languages size={15}/>{ur?"English":"اردو"}
        </button>
      </div>

      <section className="home-hero clean-hero">
        <button className="location-row" onClick={()=>setScreen("location")}>
          <span className="location-icon"><MapPin size={17}/></span>
          <span><small>{ur?"آپ کا مقام":"Your location"}</small><strong>{locationLabel}</strong></span>
          <ChevronRight size={17}/>
        </button>
        <h1>{ur?"آج آپ کو کس کام میں مدد چاہیے؟":"What do you need help with?"}</h1>
        <p>{ur?"اپنا کام بتائیں اور قریب کے ماہر کاریگروں کی آفرز کا موازنہ کریں۔":"Describe the job and compare nearby professionals."}</p>
      </section>

      <div className="problem-bar premium-search">
        <Search size={20}/>
        <button className="problem-text" onClick={()=>setScreen("services")}>
          {ur?"مسئلہ یا سروس لکھیں":"Describe the problem or service"}
        </button>
        <button className="mic-button" onClick={()=>setVoiceOpen(true)}><Mic size={21}/></button>
      </div>

      <div className="quick-actions subtle-actions">
        <button onClick={()=>photoInputRef.current?.click()}><Camera size={16}/>{ur?"تصویر شامل کریں":"Add photo"}</button>
        <input ref={photoInputRef} type="file" accept="image/*" hidden onChange={e=>{
          const file=e.target.files?.[0];
          if(!file)return;
          const reader=new FileReader();
          reader.onload=()=>{
            setProblemPhoto(String(reader.result||""));
            setScreen("request");
          };
          reader.readAsDataURL(file);
        }}/>
        <button onClick={()=>setScreen("services")}><Wrench size={16}/>{ur?"خدمات دیکھیں":"Browse services"}</button>
      </div>

      <SectionTitle title={ur?"خدمات":"Services"} action={ur?"سب دیکھیں":"See all"} onClick={()=>setScreen("services")}/>
      <div className="service-grid premium-services">
        <button className="service-tile" onClick={()=>chooseService("Plumber")}><span className="service-glyph"><Wrench size={20}/></span><span>{ur?"پلمبنگ":"Plumbing"}</span></button>
        <button className="service-tile" onClick={()=>chooseService("Electrician")}><span className="service-glyph"><Zap size={20}/></span><span>{ur?"الیکٹریشن":"Electrical"}</span></button>
        <button className="service-tile" onClick={()=>chooseService("AC Technician")}><span className="service-glyph"><Snowflake size={20}/></span><span>{ur?"اے سی مرمت":"AC Repair"}</span></button>
        <button className="service-tile" onClick={()=>chooseService("Cleaner")}><span className="service-glyph"><Sparkles size={20}/></span><span>{ur?"صفائی":"Cleaning"}</span></button>
      </div>

      <button className="promo-card refined-promo" onClick={()=>setScreen("services")}>
        <div>
          <small>{ur?"فوری درخواست":"QUICK REQUEST"}</small>
          <strong>{ur?"آج ہی کسی ماہر کی ضرورت ہے؟":"Need help today?"}</strong>
          <span>{ur?"سروس منتخب کریں، کام پوسٹ کریں اور آفرز حاصل کریں۔":"Choose a service, post the job and compare offers."}</span>
        </div>
        <ChevronRight size={22}/>
      </button>

      <SectionTitle title={ur?"حالیہ کام":"Recent work"} action={ur?"سب دیکھیں":"See all"} onClick={()=>setScreen("history")}/>
      

      <div className="menu-list">
        {recentRequests.map(req=>
          <button key={req.id} className="menu-row" onClick={()=>{
            if(req.status==="posted" || req.status==="accepted"){
              setActiveRequestId(req.id);
              if(req.workerId){
                const w=workers.find(x=>x.id===req.workerId);
                if(w)setSelected(w);
              }
              setScreen("active");
            }else{
              setScreen("history");
            }
          }}>
            <span className="menu-icon">{req.status==="completed"?<Check size={18}/>:req.status==="cancelled"?<X size={18}/>:<Clock3 size={18}/>}</span>
            <span>
              <strong>{ur?SERVICE_META[req.service].ur:SERVICE_META[req.service].en}</strong>
              <small>{statusLabel(req.status)} · Rs. {req.budget.toLocaleString()}</small>
            </span>
            <ChevronRight size={18}/>
          </button>
        )}
      </div>

      <SectionTitle title={ur?"قریب بہترین کاریگر":"Top-rated near you"}/>
      <div className="nearby-list">
        {nearby.slice(0,3).map(worker=>
          <button key={worker.id} className="worker-mini improved-worker" onClick={()=>{setSelected(worker);setScreen("workerProfile")}}>
            <WorkerAvatar worker={worker}/>
            <div>
              <strong>{worker.name}</strong>
              <span>{ur?worker.skillUr:SERVICE_META[worker.skill].en} · ★ {worker.rating} ({worker.jobs})</span>
              <small>{worker.distance.toFixed(1)} km away · From Rs. {worker.startingRate.toLocaleString()}</small>
            </div>
            <span className="availability">{worker.available?(ur?"دستیاب":"Available"):(ur?"مصروف":"Busy")}</span>
          </button>
        )}
      </div>
    </div>
  }

  function ScreenHeader(){
    const titleMap:Partial<Record<Screen,string>>={
      services:ur?"تمام خدمات":"All services",
      request:ur?"نئی درخواست":"New request",
      location:ur?"مقام":"Location",
      schedule:ur?"وقت اور بجٹ":"Time & budget",
      review:ur?"درخواست دیکھیں":"Review request",
      posted:ur?"درخواست پوسٹ ہوگئی":"Request posted",
      offers:ur?"آفرز":"Offers",
      workerProfile:ur?"کاریگر پروفائل":"Worker profile",
      active:ur?"موجودہ کام":"Current job",
      chat:selected.name,
      complete:ur?"کام مکمل":"Job complete",
      rating:ur?"ریٹنگ":"Rate experience",
      history:ur?"درخواستوں کی تاریخ":"Request history",
      account:ur?"اکاؤنٹ":"Account",
      settings:ur?"ایپ سیٹنگز":"App settings",
      support:ur?"مدد اور حفاظت":"Safety & support",
      notifications:ur?"اطلاعات":"Notifications",
      savedWorkers:ur?"محفوظ کاریگر":"Saved workers",
      addresses:ur?"پتے":"Addresses",
      legal:ur?"قانونی دستاویزات":"Legal documents",
      contactSupport:ur?"سپورٹ":"Contact support",
      report:ur?"رپورٹ":"Report",
      safetyTips:ur?"حفاظتی مشورے":"Safety tips",
      workerHome:"KaamYab Pro",
      workerJob:ur?"کام کی تفصیل":"Job details",
      workerOffer:ur?"اپنی آفر دیں":"Send an offer",
      workerActive:ur?"موجودہ کام":"Current job",
      earnings:ur?"آمدنی":"Earnings",
      workerReviews:ur?"ریویوز":"Reviews",
      workerSetup:ur?"پروفائل بنائیں":"Create profile"
    };
    return <div className="screen-header">
      <button className="icon-button" onClick={back}><ArrowLeft size={19}/></button>
      <strong>{titleMap[screen]}</strong>
      {screen==="account"
        ? <button className="lang-button compact" onClick={()=>setLang(ur?"en":"ur")}>{ur?"English":"اردو"}</button>
        : <span className="header-spacer"/>}
    </div>
  }

  function Services(){
    const list=(Object.keys(SERVICE_META) as ServiceKey[]).filter(s=>{
      const q=serviceSearch.trim().toLowerCase();
      if(!q)return true;
      return SERVICE_META[s].en.toLowerCase().includes(q)
        || SERVICE_META[s].note.toLowerCase().includes(q)
        || s.toLowerCase().includes(q);
    });

    return <div className="screen">
      <h1 className="page-title">{ur?"آپ کو کس کام میں مدد چاہیے؟":"What can we help with?"}</h1>
      <p className="page-sub">{ur?"سروس منتخب کریں یا اپنا کام تلاش کریں۔":"Choose a category or search for the task you need."}</p>
      <div className="problem-bar compact-bar">
        <Search size={18}/>
        <input value={serviceSearch} onChange={e=>setServiceSearch(e.target.value)} placeholder={ur?"سروس تلاش کریں":"Search services"}/>
      </div>
      <div className="service-list">
        {list.map(s=>
          <button key={s} onClick={()=>chooseService(s)}>
            <span className="list-glyph">{SERVICE_META[s].glyph}</span>
            <span><strong>{ur?SERVICE_META[s].ur:SERVICE_META[s].en}</strong><small>{SERVICE_META[s].note}</small></span>
            <ChevronRight size={18}/>
          </button>
        )}
      </div>
    </div>
  }

  function RequestDetails(){
    return <div className="screen">
      <Progress n={2}/>
      <h1 className="page-title">{ur?"تفصیل کی تصدیق کریں":"Confirm the details"}</h1>
      <p className="page-sub">{ur?"مسئلہ لکھنا اختیاری ہے۔":"The problem description is optional."}</p>

      {problemPhoto&&<div className="problem-photo-preview">
        <img src={problemPhoto} alt="Problem preview"/>
        <button onClick={()=>photoInputRef.current?.click()}><Camera size={15}/>{ur?"تصویر تبدیل کریں":"Change photo"}</button>
      </div>}

      <Field label={ur?"سروس":"Service"}>
        <select value={draft.service} onChange={e=>setDraft(d=>({...d,service:e.target.value as ServiceKey}))}>
          <option value="">{ur?"سروس منتخب کریں":"Choose a service"}</option>
          {(Object.keys(SERVICE_META) as ServiceKey[]).map(s=><option key={s} value={s}>{ur?SERVICE_META[s].ur:SERVICE_META[s].en}</option>)}
        </select>
      </Field>

      <Field label={ur?"مسئلہ":"Problem"}>
        <textarea rows={4} value={draft.issue} onChange={e=>setDraft(d=>({...d,issue:e.target.value}))} placeholder={ur?"مثلاً: اے سی چل رہا ہے مگر ٹھنڈا نہیں کر رہا":"Example: AC is running but not cooling"}/>
      </Field>

      <Field label={ur?"مقام":"Location"}>
        <button className="field-button" onClick={()=>setScreen("location")}><MapPin size={17}/><span>{draft.area}</span><ChevronRight size={17}/></button>
      </Field>

      <button className="primary-button" disabled={!draft.service} onClick={()=>setScreen("schedule")}>{ur?"جاری رکھیں":"Continue"}</button>
    </div>
  }

  function LocationScreen(){
    return <div className="screen">
      <h1 className="page-title">{ur?"آپ کہاں ہیں؟":"Where do you need help?"}</h1>
      <Field label={ur?"علاقہ":"Area"}>
        <input value={draft.area} onChange={e=>setDraft(d=>({...d,area:e.target.value}))}/>
      </Field>
      <button className="secondary-button" onClick={locate}><LocateFixed size={17}/>{ur?"موجودہ مقام استعمال کریں":"Use current location"}</button>
      <button className="primary-button" onClick={()=>setScreen("schedule")}>{ur?"جاری رکھیں":"Continue"}</button>
    </div>
  }

  function Schedule(){
    return <div className="screen">
      <Progress n={3}/>
      <h1 className="page-title">{ur?"کب اور کتنا بجٹ؟":"When and for how much?"}</h1>

      <Field label={ur?"مدد کب چاہیے؟":"When do you need help?"}>
        <div className="choice-grid">
          {[
            ["today",ur?"آج":"Today"],
            ["tomorrow",ur?"کل":"Tomorrow"],
            ["week",ur?"اس ہفتے":"This week"],
            ["schedule",ur?"وقت منتخب کریں":"Choose time"],
          ].map(([v,l])=><button key={v} className={draft.when===v?"choice active":"choice"} onClick={()=>setDraft(d=>({...d,when:v as Draft["when"]}))}>{l}</button>)}
        </div>
      </Field>

      {draft.when==="schedule"&&<div className="schedule-picker">
        <Field label={ur?"تاریخ منتخب کریں":"Choose date"}>
          <input type="date" value={draft.scheduledDate} onChange={e=>setDraft(d=>({...d,scheduledDate:e.target.value}))}/>
        </Field>
        <Field label={ur?"وقت منتخب کریں":"Choose time"}>
          <input type="time" value={draft.scheduledTime} onChange={e=>setDraft(d=>({...d,scheduledTime:e.target.value}))}/>
        </Field>
      </div>}

      <Field label={ur?"آپ کا بجٹ":"Your budget"}>
        <div className="budget-input">
          <span>Rs.</span>
          <input type="number" min={0} value={draft.budget} onChange={e=>setDraft(d=>({...d,budget:Number(e.target.value)}))}/>
        </div>
      </Field>

      <Field label={ur?"کتنی جلدی؟":"Urgency"}>
        <div className="choice-grid two">
          {[["asap",ur?"جلد از جلد":"As soon as possible"],["flexible",ur?"وقت لچکدار ہے":"Flexible"]].map(([v,l])=>
            <button key={v} className={draft.urgency===v?"choice active":"choice"} onClick={()=>setDraft(d=>({...d,urgency:v as Draft["urgency"]}))}>{l}</button>
          )}
        </div>
      </Field>

      <button className="primary-button" disabled={draft.when==="schedule"&&(!draft.scheduledDate||!draft.scheduledTime)} onClick={()=>setScreen("review")}>{ur?"جاری رکھیں":"Continue"}</button>
    </div>
  }

  function ReviewRequest(){
    return <div className="screen">
      <Progress n={4}/>
      <h1 className="page-title">{ur?"پوسٹ کرنے کے لیے تیار؟":"Ready to post?"}</h1>
      <div className="review-card">
        <InfoRow k={ur?"سروس":"Service"} v={draft.service?(ur?SERVICE_META[draft.service].ur:SERVICE_META[draft.service].en):"-"}/>
        <InfoRow k={ur?"مسئلہ":"Problem"} v={draft.issue|| (ur?"تفصیل شامل نہیں":"No description")}/>
        <InfoRow k={ur?"مقام":"Location"} v={draft.area}/>
        <InfoRow k={ur?"وقت":"When"} v={whenLabel(draft)}/>
        <InfoRow k={ur?"بجٹ":"Budget"} v={`Rs. ${draft.budget.toLocaleString()}`}/>
      </div>
      <button className="primary-button" onClick={postRequest}>{ur?"درخواست پوسٹ کریں":"Post request"}</button>
    </div>
  }

  function Posted(){
    return <div className="screen success-screen">
      <div className="success-icon green"><Check size={36}/></div>
      <h1 className="page-title">{ur?"درخواست پوسٹ ہوگئی":"Request posted"}</h1>
      <p className="page-sub">{ur?"قریب کے کاریگر اب اپنی آفرز بھیج سکتے ہیں۔":"Nearby workers can now send you offers."}</p>
      <button className="primary-button" onClick={()=>setScreen("offers")}>{ur?"آفرز دیکھیں":"View offers"}</button>
    </div>
  }

  function Offers(){
    return <div className="screen">
      <h1 className="page-title">{ur?"قریب کی آفرز":"Nearby offers"}</h1>
      <div className="nearby-list">
        {offers.map(o=>
          <button key={o.worker.id} className="worker-mini improved-worker" onClick={()=>{setSelected(o.worker);setScreen("workerProfile")}}>
            <WorkerAvatar worker={o.worker}/>
            <div>
              <strong>{o.worker.name}</strong>
              <span>★ {o.worker.rating} · {o.etaMin} min</span>
              <small>Rs. {o.price.toLocaleString()} {o.note?`· ${o.note}`:""}</small>
            </div>
            <ChevronRight size={18}/>
          </button>
        )}
      </div>
    </div>
  }

  function WorkerProfile(){
    const saved=savedWorkerIds.includes(selected.id);
    return <div className="screen">
      <div className="center">
        <WorkerAvatar worker={selected} large/>
        <h1 className="page-title">{selected.name}</h1>
        <p className="page-sub">{ur?selected.skillUr:SERVICE_META[selected.skill].en} · ★ {selected.rating} · {selected.jobs} jobs</p>
      </div>

      <div className="stats-grid">
        <Stat n={`${selected.experienceYears}y`} l={ur?"تجربہ":"Experience"}/>
        <Stat n={`${selected.onTimeRate}%`} l={ur?"وقت پر":"On time"}/>
        <Stat n={`${selected.trustScore}%`} l={ur?"اعتماد":"Trust"}/>
      </div>

      <div className="review-card">
        <p>{ur?selected.bioUr:selected.bioEn}</p>
      </div>

      <button className="secondary-button" onClick={()=>toggleSavedWorker(selected.id)}>
        <Star size={17}/>{saved?(ur?"محفوظ سے ہٹائیں":"Remove saved worker"):(ur?"کاریگر محفوظ کریں":"Save worker")}
      </button>

      {activeRequestId&&<button className="primary-button" onClick={()=>acceptWorker(selected)}>
        {ur?`${selected.name} کو منتخب کریں`:`Request ${selected.name.split(" ")[0]}`}
      </button>}
    </div>
  }

  function ActiveJob(){
    if(!activeRequest){
      return <div className="screen">
        <div className="empty-state">
          <Clock3 size={28}/>
          <h3>{ur?"کوئی فعال کام نہیں":"No active job"}</h3>
          <p>{ur?"نئی درخواست بنا کر یہاں اس کی پیش رفت دیکھیں۔":"Create a request to track it here."}</p>
          <button className="primary-button" onClick={()=>setScreen("services")}>{ur?"درخواست بنائیں":"Create request"}</button>
        </div>
      </div>
    }

    const worker=activeRequest.workerId?workers.find(w=>w.id===activeRequest.workerId):selected;
    return <div className="screen">
      <div className="summary-card">
        <span className="pill success">{activeRequest.status==="accepted"?(ur?"تصدیق شدہ":"Confirmed"):(ur?"آفرز کا انتظار":"Waiting for offers")}</span>
        <h2>{ur?SERVICE_META[activeRequest.service].ur:SERVICE_META[activeRequest.service].en}</h2>
        <p>{worker?.name||""} · Rs. {activeRequest.budget.toLocaleString()}</p>
      </div>

      <SectionTitle title={ur?"حالت":"Status"}/>
      <Timeline current={activeRequest.status==="accepted"?2:0}/>

      {activeRequest.status==="posted"&&<button className="primary-button" onClick={()=>setScreen("offers")}>{ur?"آفرز دیکھیں":"View offers"}</button>}

      {activeRequest.status==="accepted"&&<>
        <button className="primary-button" onClick={()=>setScreen("chat")}><MessageCircle size={17}/>{ur?"کاریگر سے پیغام":"Message worker"}</button>
        <button className="secondary-button" onClick={completeActiveRequest}>{ur?"کام مکمل کریں":"Mark job complete"}</button>
      </>}

      <button className="secondary-button" onClick={cancelActiveRequest}>{ur?"درخواست منسوخ کریں":"Cancel request"}</button>
    </div>
  }

  function Chat(){
    return <div className="chat-screen">
      <div className="chat-body">
        {activeMessages.length===0
          ? <div className="empty-state"><MessageCircle size={26}/><p>{ur?"ابھی کوئی پیغام نہیں۔ گفتگو شروع کریں۔":"No messages yet. Start the conversation."}</p></div>
          : activeMessages.map(message=>
              <div key={message.id} className={message.sender==="customer"?"bubble mine":"bubble theirs"}>{message.text}</div>
            )
        }
      </div>
      <div className="chat-input">
        <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")sendMessage()}} placeholder={ur?"پیغام لکھیں":"Write a message…"}/>
        <button onClick={sendMessage}><Send size={18}/></button>
      </div>
    </div>
  }

  function Complete(){
    return <div className="screen success-screen">
      <div className="success-icon green"><Check size={36}/></div>
      <h1 className="page-title">{ur?"کام مکمل ہوگیا":"Job completed"}</h1>
      <p className="page-sub">{ur?"درخواست مکمل شدہ تاریخ میں محفوظ ہوگئی ہے۔":"The request is now saved in your completed history."}</p>
      <div className="summary-card left">
        <InfoRow k={ur?"آخری رقم":"Final amount"} v={`Rs. ${(activeRequest?.budget||draft.budget).toLocaleString()}`}/>
        <InfoRow k={ur?"مکمل ہوا":"Completed"} v={new Date().toLocaleString()}/>
      </div>
      <button className="primary-button" onClick={()=>setScreen("rating")}>{ur?"تجربہ ریٹ کریں":"Rate your experience"}</button>
      <button className="secondary-button" onClick={()=>{setActiveRequestId(null);resetDraft();setScreen("home")}}>{ur?"ہوم پر جائیں":"Back to home"}</button>
    </div>
  }

  function Rating(){
    return <div className="screen rating-screen">
      <WorkerAvatar worker={selected} large/>
      <h1 className="page-title">{ur?`${selected.name} کیسے تھے؟`:`How was ${selected.name.split(" ")[0]}?`}</h1>
      <div className="stars">{[1,2,3,4,5].map(n=><button key={n} onClick={()=>setRating(n)} className={n<=rating?"on":""}>★</button>)}</div>
      <p className="page-sub">{ur?"آپ کا ریویو دوسروں کو بہتر انتخاب میں مدد دیتا ہے۔":"Your review helps other customers choose confidently."}</p>
      <textarea className="field-control tall" value={review} onChange={e=>setReview(e.target.value)} placeholder={ur?"مختصر ریویو لکھیں":"Write a short review…"}/>
      <button className="primary-button" onClick={submitReview}>{ur?"ریویو جمع کریں":"Submit review"}</button>
    </div>
  }

  function History(){
    const filtered=historyFilter==="all"?requests:requests.filter(req=>req.status===historyFilter);
    return <div className="screen">
      <div className="filter-row">
        <button className={historyFilter==="all"?"active":""} onClick={()=>setHistoryFilter("all")}>{ur?"سب":"All"}</button>
        <button className={historyFilter==="completed"?"active":""} onClick={()=>setHistoryFilter("completed")}>{ur?"مکمل":"Completed"}</button>
        <button className={historyFilter==="cancelled"?"active":""} onClick={()=>setHistoryFilter("cancelled")}>{ur?"منسوخ":"Cancelled"}</button>
      </div>

      {filtered.length===0
        ? <div className="empty-state"><h3>{ur?"اس حصے میں ابھی کوئی درخواست نہیں":"No requests in this section yet"}</h3></div>
        : filtered.map(req=>
            <button
              key={req.id}
              className="history-row"
              style={{width:"100%", textAlign:"left"}}
              onClick={()=>{
                if(req.status==="posted"||req.status==="accepted"){
                  setActiveRequestId(req.id);
                  const w=workers.find(x=>x.id===req.workerId);
                  if(w)setSelected(w);
                  setScreen("active");
                }
              }}
            >
              <div>
                <strong className={req.status==="cancelled"?"danger":""}>{ur?SERVICE_META[req.service].ur:SERVICE_META[req.service].en}</strong>
                <span>{statusLabel(req.status)} · {new Date(req.createdAt).toLocaleDateString()}</span>
              </div>
              <b>Rs. {req.budget.toLocaleString()}</b>
            </button>
          )
      }
    </div>
  }

  function Account(){
    return <div className="screen">
      <div className="account-user">
        <span className="user-avatar">DC</span>
        <div><strong>Demo Customer</strong><span>0300 1234567</span></div>
        <ChevronRight size={18}/>
      </div>

      <SectionTitle title={ur?"آپ کا کامیاب":"Your KaamYab"}/>
      <div className="menu-list">
        <MenuRow icon={<Bell size={18}/>} title={ur?"اطلاعات":"Notifications"} onClick={()=>setScreen("notifications")}/>
        <MenuRow icon={<Star size={18}/>} title={ur?"محفوظ کاریگر":"Saved workers"} sub={`${savedWorkerIds.length}`} onClick={()=>setScreen("savedWorkers")}/>
        <MenuRow icon={<MapPin size={18}/>} title={ur?"پتے":"Addresses"} onClick={()=>setScreen("addresses")}/>
      </div>

      <SectionTitle title={ur?"کامیاب کے ساتھ کام کریں":"Work with KaamYab"}/>
      <button className="menu-card" onClick={()=>setScreen("workerSetup")}>
        <BriefcaseBusiness size={18}/>
        <span><strong>{ur?"اپنی سروس دیں":"Offer your services"}</strong><small>{ur?"کاریگر پروفائل بنائیں":"Create a worker profile"}</small></span>
        <ChevronRight size={18}/>
      </button>

      <SectionTitle title={ur?"مدد":"Support"}/>
      <button className="menu-card" onClick={()=>setScreen("support")}>
        <ShieldCheck size={18}/>
        <span><strong>{ur?"مدد اور حفاظت":"Help & safety"}</strong></span>
        <ChevronRight size={18}/>
      </button>

      <button className="menu-card" onClick={()=>setScreen("settings")}>
        <Languages size={18}/>
        <span><strong>{ur?"ایپ سیٹنگز":"App settings"}</strong></span>
        <ChevronRight size={18}/>
      </button>
    </div>
  }

  function Notifications(){
    const notifications=recentRequests.slice(0,5);
    return <div className="screen">
      {notifications.length===0
        ? <div className="empty-state"><Bell size={28}/><h3>{ur?"ابھی کوئی اطلاع نہیں":"No notifications yet"}</h3></div>
        : <div className="menu-list">
            {notifications.map(req=>
              <button key={req.id} className="menu-row" onClick={()=>setScreen("history")}>
                <span className="menu-icon"><Bell size={18}/></span>
                <span>
                  <strong>{statusLabel(req.status)}</strong>
                  <small>{ur?SERVICE_META[req.service].ur:SERVICE_META[req.service].en} · Rs. {req.budget.toLocaleString()}</small>
                </span>
                <ChevronRight size={18}/>
              </button>
            )}
          </div>
      }
    </div>
  }

  function SavedWorkers(){
    const saved=workers.filter(w=>savedWorkerIds.includes(w.id));
    return <div className="screen">
      {saved.length===0
        ? <div className="empty-state"><Star size={28}/><h3>{ur?"ابھی کوئی کاریگر محفوظ نہیں":"No saved workers yet"}</h3><p>{ur?"کاریگر کے پروفائل سے Save Worker دبائیں۔":"Open a worker profile and tap Save worker."}</p></div>
        : <div className="nearby-list">
            {saved.map(worker=>
              <button key={worker.id} className="worker-mini improved-worker" onClick={()=>{setSelected(worker);setScreen("workerProfile")}}>
                <WorkerAvatar worker={worker}/>
                <div><strong>{worker.name}</strong><span>★ {worker.rating} · {worker.jobs} jobs</span><small>{worker.area}</small></div>
                <ChevronRight size={18}/>
              </button>
            )}
          </div>
      }
    </div>
  }

  function Addresses(){
    return <div className="screen">
      <div className="menu-list">
        <div className="menu-row">
          <span className="menu-icon"><MapPin size={18}/></span>
          <span><strong>{ur?"موجودہ پتہ":"Current address"}</strong><small>{draft.area||locationLabel}</small></span>
        </div>
      </div>
      <Field label={ur?"پتہ تبدیل کریں":"Edit address"}>
        <input value={draft.area} onChange={e=>setDraft(d=>({...d,area:e.target.value}))}/>
      </Field>
      <button className="secondary-button" onClick={locate}><LocateFixed size={17}/>{ur?"موجودہ مقام استعمال کریں":"Use current location"}</button>
    </div>
  }

  function Settings(){
    return <div className="screen">
      <div className="menu-list">
        <MenuRow icon={<Languages size={18}/>} title={ur?"زبان":"Language"} sub={ur?"اردو":"English"} onClick={()=>setLang(ur?"en":"ur")}/>
        <MenuRow icon={<MapPin size={18}/>} title={ur?"لوکیشن شیئرنگ":"Location sharing"} sub={locationSharing?(ur?"فعال":"On"):(ur?"بند":"Off")} onClick={()=>setLocationSharing(v=>!v)}/>
        <MenuRow icon={<ShieldCheck size={18}/>} title={ur?"قانونی دستاویزات":"Legal documents"} onClick={()=>setScreen("legal")}/>
        <MenuRow icon={<CircleUserRound size={18}/>} title={ur?"مقامی ڈیٹا صاف کریں":"Clear local app data"} onClick={()=>{
          if(window.confirm(ur?"کیا مقامی ایپ ڈیٹا صاف کرنا ہے؟":"Clear locally saved KaamYab demo data?")){
            Object.values(STORAGE).forEach(k=>localStorage.removeItem(k));
            setRequests(seedRequests());
            setMessages([]);
            setReviews([]);
            setSavedWorkerIds([]);
            setActiveRequestId(null);
            alert(ur?"مقامی ڈیٹا صاف ہوگیا۔":"Local app data cleared.");
          }
        }}/>
      </div>
    </div>
  }

  function Legal(){
    return <div className="screen">
      <div className="review-card">
        <h3>{ur?"پرائیویسی":"Privacy"}</h3>
        <p>{ur?"یہ پروٹوٹائپ درخواست، پیغامات اور ترجیحات آپ کے براؤزر کی localStorage میں محفوظ کرتا ہے۔":"This prototype stores requests, messages and preferences in your browser localStorage."}</p>
      </div>
      <div className="review-card">
        <h3>{ur?"حفاظت":"Safety"}</h3>
        <p>{ur?"ذاتی یا حساس معلومات صرف ضرورت کے مطابق شیئر کریں اور کام شروع ہونے سے پہلے قیمت کی تصدیق کریں۔":"Share personal information only when needed and confirm pricing before work begins."}</p>
      </div>
    </div>
  }

  function Support(){
    return <div className="screen">
      <div className="support-icon">!</div>
      <h1 className="page-title center">{ur?"مدد چاہیے؟":"Need help?"}</h1>
      <div className="menu-list">
        <MenuRow icon={<Phone size={18}/>} title={ur?"سپورٹ سے رابطہ":"Contact support"} sub={ur?"درخواست یا اکاؤنٹ مسئلہ":"Request or account issue"} onClick={()=>setScreen("contactSupport")}/>
        <MenuRow icon={<ShieldCheck size={18}/>} title={ur?"رپورٹ کریں":"Report a worker or customer"} sub={ur?"حفاظت یا فراڈ":"Safety, conduct or fraud"} onClick={()=>setScreen("report")}/>
        <MenuRow icon={<Check size={18}/>} title={ur?"حفاظتی مشورے":"Safety tips"} onClick={()=>setScreen("safetyTips")}/>
      </div>
    </div>
  }

  function ContactSupport(){
    return <div className="screen">
      <h1 className="page-title">{ur?"ہم کس طرح مدد کر سکتے ہیں؟":"How can we help?"}</h1>
      <Field label={ur?"مسئلہ بیان کریں":"Describe the issue"}>
        <textarea rows={5} value={supportMessage} onChange={e=>setSupportMessage(e.target.value)} placeholder={ur?"اپنی درخواست یا اکاؤنٹ کا مسئلہ لکھیں":"Tell us what happened with your request or account"}/>
      </Field>
      <button className="primary-button" disabled={!supportMessage.trim()} onClick={()=>{
        alert(ur?"سپورٹ درخواست محفوظ ہوگئی۔":"Support request saved for this prototype.");
        setSupportMessage("");
        setScreen("support");
      }}>{ur?"درخواست بھیجیں":"Send request"}</button>
    </div>
  }

  function Report(){
    return <div className="screen">
      <h1 className="page-title">{ur?"مسئلہ رپورٹ کریں":"Report an issue"}</h1>
      <Field label={ur?"تفصیل":"Details"}>
        <textarea rows={5} value={reportMessage} onChange={e=>setReportMessage(e.target.value)} placeholder={ur?"حفاظت، رویے یا فراڈ کی تفصیل لکھیں":"Describe the safety, conduct or fraud concern"}/>
      </Field>
      <button className="primary-button" disabled={!reportMessage.trim()} onClick={()=>{
        alert(ur?"رپورٹ محفوظ ہوگئی۔":"Report saved for this prototype.");
        setReportMessage("");
        setScreen("support");
      }}>{ur?"رپورٹ جمع کریں":"Submit report"}</button>
    </div>
  }

  function SafetyTips(){
    return <div className="screen">
      <div className="review-card"><strong>{ur?"قیمت پہلے طے کریں":"Confirm the price first"}</strong><p>{ur?"کام شروع ہونے سے پہلے متوقع قیمت اور کام کی حدود واضح کریں۔":"Agree on the expected price and scope before work starts."}</p></div>
      <div className="review-card"><strong>{ur?"پروفائل چیک کریں":"Check the profile"}</strong><p>{ur?"ریٹنگ، کاموں کی تعداد اور تصدیق دیکھیں۔":"Review ratings, completed jobs and verification details."}</p></div>
      <div className="review-card"><strong>{ur?"حساس معلومات محفوظ رکھیں":"Protect sensitive information"}</strong><p>{ur?"غیر ضروری ذاتی یا مالی معلومات شیئر نہ کریں۔":"Do not share unnecessary personal or financial information."}</p></div>
    </div>
  }

  function WorkerSetup(){
    return <div className="screen">
      <Progress n={2}/>
      <h1 className="page-title">{ur?"صارفین کو بتائیں آپ کیا کرتے ہیں":"Tell customers what you do"}</h1>
      <Field label={ur?"پورا نام":"Full name"}><input defaultValue="Ahmed Raza"/></Field>
      <Field label={ur?"بنیادی ہنر":"Primary skill"}><select defaultValue="Electrician">{(Object.keys(SERVICE_META) as ServiceKey[]).map(s=><option key={s}>{s}</option>)}</select></Field>
      <Field label={ur?"شہر / علاقہ":"City / area"}><input defaultValue="Rawalpindi · Bahria Town"/></Field>
      <Field label={ur?"تجربہ":"Experience"}><input defaultValue="6 years"/></Field>
      <Field label={ur?"ابتدائی ریٹ":"Starting rate"}><input defaultValue="Rs. 1,500"/></Field>
      <button className="primary-button" onClick={()=>setScreen("workerHome")}>{ur?"پروفائل مکمل کریں":"Complete profile"}</button>
    </div>
  }

  function WorkerHome(){
    const openCustomerRequests=requests.filter(r=>r.status==="posted");
    const totalEarned=requests.filter(r=>r.status==="completed").reduce((sum,r)=>sum+r.budget,0);
    return <div className="screen">
      <div className="worker-mode-top">
        <div><small>{ur?"کام کی حالت":"Work status"}</small><strong>{workerOnline?(ur?"آپ آن لائن ہیں":"You’re online"):(ur?"آپ آف لائن ہیں":"You’re offline")}</strong></div>
        <button className={workerOnline?"toggle on":"toggle"} onClick={()=>setWorkerOnline(v=>!v)}><span/></button>
      </div>

      <div className="stats-grid">
        <Stat n={`Rs. ${totalEarned.toLocaleString()}`} l={ur?"مکمل کام":"Completed value"}/>
        <Stat n={completedCount} l={ur?"کام":"Jobs"}/>
        <Stat n={reviews.length?((reviews.reduce((s,r)=>s+r.rating,0)/reviews.length).toFixed(1)):"—"} l={ur?"ریٹنگ":"Rating"}/>
      </div>

      <SectionTitle title={ur?"قریب موجود کام":"Jobs near you"}/>
      {openCustomerRequests.length===0
        ? <div className="empty-state"><BriefcaseBusiness size={28}/><h3>{ur?"ابھی کوئی نئی درخواست نہیں":"No new customer requests right now"}</h3></div>
        : openCustomerRequests.map(req=>
            <button key={req.id} className="job-card" onClick={()=>{setActiveRequestId(req.id);setScreen("workerJob")}}>
              <div className="job-top"><span className="pill blue">{SERVICE_META[req.service].en}</span><span>{req.area}</span></div>
              <strong>{req.issue || SERVICE_META[req.service].note}</strong>
              <small>{whenLabel(req)}</small>
              <div className="job-bottom"><div><small>{ur?"بجٹ":"Budget"}</small><strong>Rs. {req.budget.toLocaleString()}</strong></div><ChevronRight size={18}/></div>
            </button>
          )
      }

      <div className="worker-shortcuts">
        <button onClick={()=>setScreen("earnings")}><WalletCards size={18}/>{ur?"آمدنی":"Earnings"}</button>
        <button onClick={()=>setScreen("workerReviews")}><Star size={18}/>{ur?"ریویوز":"Reviews"}</button>
      </div>
    </div>
  }

  function WorkerJob(){
    if(!activeRequest){
      return <div className="screen"><div className="empty-state"><h3>{ur?"درخواست نہیں ملی":"Request not found"}</h3></div></div>
    }
    return <div className="screen">
      <div className="summary-card">
        <div className="job-top"><span className="pill blue">{SERVICE_META[activeRequest.service].en}</span><span>{activeRequest.area}</span></div>
        <h2>{activeRequest.issue||SERVICE_META[activeRequest.service].note}</h2>
        <p>{whenLabel(activeRequest)}</p>
      </div>
      <SectionTitle title={ur?"صارف کی درخواست":"Customer request"}/>
      <div className="offer-meta standalone">
        <div><small>{ur?"بجٹ":"Budget"}</small><strong>Rs. {activeRequest.budget.toLocaleString()}</strong></div>
        <div><small>{ur?"فوری":"Urgency"}</small><strong>{activeRequest.urgency==="asap"?"ASAP":"Flexible"}</strong></div>
      </div>
      <button className="primary-button" onClick={()=>{
        setRequests(prev=>prev.map(r=>r.id===activeRequest.id?{...r,status:"accepted",workerId:selected.id}:r));
        setScreen("workerActive");
      }}>{ur?"بجٹ قبول کریں":"Accept budget"}</button>
      <button className="secondary-button" onClick={()=>setScreen("workerOffer")}>{ur?"اپنی قیمت دیں":"Send another offer"}</button>
    </div>
  }

  function WorkerOfferScreen(){
    return <div className="screen">
      <h1 className="page-title">{ur?"اپنی آفر دیں":"Your offer"}</h1>
      <Field label={ur?"قیمت":"Price"}><input defaultValue={`Rs. ${activeRequest?.budget||1800}`}/></Field>
      <Field label={ur?"کب پہنچ سکتے ہیں؟":"When can you arrive?"}>
        <div className="choice-grid"><button className="choice active">30–45 min</button><button className="choice">1 hour</button><button className="choice">2 hours</button><button className="choice">Choose time</button></div>
      </Field>
      <Field label={ur?"اختیاری نوٹ":"Optional note"}><textarea rows={3} defaultValue="I can inspect and complete this job today."/></Field>
      <button className="primary-button" onClick={()=>{
        if(activeRequest){
          setRequests(prev=>prev.map(r=>r.id===activeRequest.id?{...r,status:"accepted",workerId:selected.id}:r));
        }
        setScreen("workerActive");
      }}>{ur?"آفر بھیجیں":"Send offer"}</button>
    </div>
  }

  function WorkerActive(){
    if(!activeRequest)return <div className="screen"><div className="empty-state"><h3>{ur?"کوئی فعال کام نہیں":"No active job"}</h3></div></div>;
    return <div className="screen">
      <div className="summary-card">
        <span className="pill success">{ur?"تصدیق شدہ":"Confirmed"}</span>
        <h2>{activeRequest.issue||SERVICE_META[activeRequest.service].en}</h2>
        <p>{activeRequest.area} · Rs. {activeRequest.budget.toLocaleString()}</p>
      </div>
      <SectionTitle title={ur?"حالت":"Status"}/>
      <Timeline current={workerArrived?2:1}/>
      <button className="primary-button" onClick={()=>setWorkerArrived(true)}>{workerArrived?(ur?"پہنچنے کی تصدیق ہوگئی":"Arrival confirmed"):(ur?"میں پہنچ گیا ہوں":"I’ve arrived")}</button>
      <button className="secondary-button" onClick={()=>setScreen("chat")}><MessageCircle size={17}/>{ur?"صارف کو پیغام":"Message customer"}</button>
      <button className="secondary-button" onClick={completeActiveRequest}>{ur?"کام مکمل کریں":"Mark job complete"}</button>
    </div>
  }

  function Earnings(){
    const completed=requests.filter(r=>r.status==="completed");
    const total=completed.reduce((sum,r)=>sum+r.budget,0);
    const avg=completed.length?Math.round(total/completed.length):0;
    return <div className="screen">
      <small className="kicker">{ur?"کل آمدنی":"TOTAL EARNINGS"}</small>
      <div className="earn-number">Rs. {total.toLocaleString()}</div>
      <div className="stats-grid"><Stat n={completed.length} l={ur?"کام":"Jobs"}/><Stat n={`Rs. ${avg.toLocaleString()}`} l={ur?"اوسط":"Avg. job"}/><Stat n={reviews.length?((reviews.reduce((s,r)=>s+r.rating,0)/reviews.length).toFixed(1)):"—"} l={ur?"ریٹنگ":"Rating"}/></div>
      <SectionTitle title={ur?"حالیہ آمدنی":"Recent earnings"}/>
      {completed.map(r=><HistoryRow key={r.id} title={SERVICE_META[r.service].en} meta={new Date(r.createdAt).toLocaleDateString()} price={`Rs. ${r.budget.toLocaleString()}`}/>)}
    </div>
  }

  function WorkerReviews(){
    const workerReviews=reviews.filter(r=>r.workerId===selected.id);
    const avg=workerReviews.length?(workerReviews.reduce((s,r)=>s+r.rating,0)/workerReviews.length).toFixed(1):selected.rating.toFixed(1);
    return <div className="screen center">
      <div className="earn-number">{avg}</div>
      <div className="stars static">★★★★★</div>
      <p className="page-sub">{workerReviews.length || selected.jobs} {ur?"ریویوز/کام":"reviews/jobs"}</p>
      <SectionTitle title={ur?"تازہ ریویوز":"Latest reviews"}/>
      {workerReviews.length===0
        ? <div className="empty-state"><p>{ur?"اس ڈیمو سیشن میں ابھی کوئی نیا ریویو نہیں۔":"No new review has been submitted in this demo session yet."}</p></div>
        : workerReviews.map(r=><div key={r.id} className="review-card left"><strong>{"★".repeat(r.rating)}</strong><p>{r.text||"—"}</p><small>{new Date(r.createdAt).toLocaleDateString()}</small></div>)
      }
    </div>
  }

  function BottomNav(){
    const workerMode=["workerHome","workerJob","workerOffer","workerActive","earnings","workerReviews"].includes(screen);
    if(workerMode){
      return <nav className="bottom-nav">
        <NavItem active={screen==="workerHome"} icon={<Home/>} label={ur?"ہوم":"Home"} onClick={()=>setScreen("workerHome")}/>
        <NavItem active={screen==="workerJob"} icon={<BriefcaseBusiness/>} label={ur?"کام":"Jobs"} onClick={()=>setScreen("workerHome")}/>
        <button className="center-nav worker-center" onClick={()=>setWorkerOnline(v=>!v)}><span className={workerOnline?"online-dot on":"online-dot"}/><small>{workerOnline?(ur?"آن لائن":"Online"):(ur?"آف لائن":"Offline")}</small></button>
        <NavItem active={screen==="earnings"} icon={<WalletCards/>} label={ur?"آمدنی":"Earnings"} onClick={()=>setScreen("earnings")}/>
        <NavItem active={false} icon={<CircleUserRound/>} label={ur?"اکاؤنٹ":"Account"} onClick={()=>setScreen("account")}/>
      </nav>
    }

    return <nav className="bottom-nav">
      <NavItem active={screen==="home"} icon={<Home/>} label={t.home} onClick={()=>navTo("home")}/>
      <NavItem active={screen==="history"||screen==="offers"} icon={<BriefcaseBusiness/>} label={t.requests} onClick={()=>navTo("requests")}/>
      <button className="center-nav" onClick={()=>navTo("ask")}><Mic/><small>{t.ask}</small></button>
      <NavItem active={screen==="active"||screen==="chat"} icon={<Clock3/>} label={t.activity} onClick={()=>navTo("activity")}/>
      <NavItem active={["account","settings","support","notifications","savedWorkers","addresses"].includes(screen)} icon={<CircleUserRound/>} label={t.account} onClick={()=>navTo("account")}/>
    </nav>
  }

  function VoiceSheet(){
    return <div className="overlay" onMouseDown={e=>{if(e.currentTarget===e.target)setVoiceOpen(false)}}>
      <section className="voice-sheet">
        <span className="drag-handle"></span>
        <div className="voice-top">
          <div><h2>{ur?"اپنا مسئلہ بتائیں":"Tell us what’s wrong"}</h2><p>{ur?"عام انداز میں بولیں۔ ایک مختصر تفصیل کافی ہے۔":"Speak naturally. One short description is enough."}</p></div>
          <button className="icon-button" onClick={()=>setVoiceOpen(false)}><X size={18}/></button>
        </div>
        <div className="voice-examples"><span>“My AC is running but it isn’t cooling.”</span><span>“Mere kitchen sink se pani leak ho raha hai.”</span></div>
        <button className={recording?"record-button live":"record-button"} onClick={recording?stopVoice:startVoice} disabled={voiceBusy}><Mic size={31}/></button>
        <div className="record-label"><strong>{voiceBusy?(ur?"سمجھا جا رہا ہے…":"Understanding…"):recording?(ur?"ریکارڈنگ… روکنے کے لیے ٹیپ کریں":"Recording… tap to stop"):(ur?"بولنے کے لیے ٹیپ کریں":"Tap to speak")}</strong></div>
        <div className="typed-row"><input value={voiceText} onChange={e=>setVoiceText(e.target.value)} placeholder={ur?"یا لکھ کر بتائیں":"Or type what you need"}/><button onClick={submitTypedVoice}><Send size={17}/></button></div>
        {voiceMessage&&<div className="voice-message">{voiceMessage}</div>}
        {voiceText&&(draft.service||detectService(voiceText))&&<button className="primary-button" onClick={useVoice}>{ur?"تفصیل میں شامل کریں":"Add to details"}</button>}
      </section>
    </div>
  }

  function whenLabel(item:Pick<ServiceRequest,"when"|"scheduledDate"|"scheduledTime">|Draft){
    if(item.when==="today")return ur?"آج":"Today";
    if(item.when==="tomorrow")return ur?"کل":"Tomorrow";
    if(item.when==="week")return ur?"اس ہفتے":"This week";
    if(item.scheduledDate&&item.scheduledTime){
      const d=new Date(`${item.scheduledDate}T${item.scheduledTime}`);
      return `${d.toLocaleDateString([], {day:"numeric",month:"short"})} · ${d.toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}`;
    }
    return ur?"وقت منتخب کریں":"Choose time";
  }

  function statusLabel(status:RequestStatus){
    if(status==="completed")return ur?"مکمل":"Completed";
    if(status==="cancelled")return ur?"منسوخ":"Cancelled";
    if(status==="accepted")return ur?"تصدیق شدہ":"Confirmed";
    return ur?"پوسٹ شدہ":"Posted";
  }
}

function SectionTitle({title,action,onClick}:{title:string;action?:string;onClick?:()=>void}){
  return <div className="section-title"><h2>{title}</h2>{action&&<button onClick={onClick}>{action}</button>}</div>
}

function Field({label,children}:{label:string;children:React.ReactNode}){
  return <label className="field"><span>{label}</span><div>{children}</div></label>
}

function Progress({n}:{n:number}){
  return <div className="progress">{[1,2,3,4].map(i=><span key={i} className={i<=n?"on":""}/>)}</div>
}

function InfoRow({k,v}:{k:string;v:string}){
  return <div className="info-row"><span>{k}</span><strong>{v}</strong></div>
}

function WorkerAvatar({worker,large}:{worker:Worker&{distance?:number};large?:boolean}){
  const initials=worker.name.split(" ").map(x=>x[0]).join("").slice(0,2);
  return <span className={large?"worker-avatar large":"worker-avatar"}>{initials}</span>
}

function Stat({n,l}:{n:string|number;l:string}){
  return <div className="stat"><strong>{n}</strong><span>{l}</span></div>
}

function Timeline({current}:{current:number}){
  const items=["Worker selected","On the way","Arrived","Job complete"];
  return <div className="timeline">{items.map((x,i)=>
    <div className={i<current?"timeline-item done":i===current?"timeline-item current":"timeline-item"} key={x}>
      <span>{i<current?"✓":"○"}</span><strong>{x}</strong>{i===1&&<em>Live</em>}
    </div>
  )}</div>
}

function HistoryRow({title,meta,price,danger}:{title:string;meta:string;price:string;danger?:boolean}){
  return <div className="history-row"><div><strong className={danger?"danger":""}>{title}</strong><span>{meta}</span></div><b>{price}</b></div>
}

function MenuRow({icon,title,sub,onClick}:{icon?:React.ReactNode;title:string;sub?:string;onClick?:()=>void}){
  return <button className="menu-row" onClick={onClick}>
    {icon&&<span className="menu-icon">{icon}</span>}
    <span><strong>{title}</strong>{sub&&<small>{sub}</small>}</span>
    <ChevronRight size={18}/>
  </button>
}

function NavItem({active,icon,label,onClick}:{active:boolean;icon:React.ReactNode;label:string;onClick:()=>void}){
  return <button className={active?"nav-item active":"nav-item"} onClick={onClick}>{icon}<small>{label}</small></button>
}
