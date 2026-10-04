import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export async function POST(req:NextRequest){
  const key=process.env.GROQ_API_KEY;
  if(!key) return NextResponse.json({error:"not_configured"},{status:503});
  try{
    const incoming=await req.formData(); const audio=incoming.get("audio") as File|null; const language=String(incoming.get("language")||"en");
    if(!audio||audio.size<1000)return NextResponse.json({error:"audio_too_short"},{status:400});
    const form=new FormData();form.append("file",audio,audio.name||"voice.webm");form.append("model","whisper-large-v3-turbo");form.append("response_format","json");form.append("temperature","0");form.append("language",language==="ur"?"ur":"en");
    const r=await fetch("https://api.groq.com/openai/v1/audio/transcriptions",{method:"POST",headers:{Authorization:`Bearer ${key}`},body:form});
    const data=await r.json(); if(!r.ok)return NextResponse.json({error:data?.error?.message||"transcription_failed"},{status:r.status});
    return NextResponse.json({text:data.text||""});
  }catch{return NextResponse.json({error:"transcription_failed"},{status:500})}
}
