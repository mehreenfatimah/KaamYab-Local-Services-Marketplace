import { ServiceKey } from "./types";
const servicePatterns: {service:ServiceKey; patterns:RegExp[]}[] = [
 {service:"Plumber",patterns:[/plumb/i,/پلمبر/,/nalka|nalkay|pipe|leak/i,/لیک|پائپ|نل/]},
 {service:"Electrician",patterns:[/electric/i,/الیکٹریشن/,/bijli|switch|fan/i,/بجلی|سوئچ|پنکھ/]},
 {service:"AC Technician",patterns:[/\bac\b|air.?condition/i,/اے\s*سی/,/ac technician/i]},
 {service:"Carpenter",patterns:[/carpenter/i,/بڑھئی/,/wood|furniture/i,/لکڑی|فرنیچر/]},
 {service:"Painter",patterns:[/paint/i,/پینٹر|رنگ/]},
 {service:"Cleaner",patterns:[/clean/i,/صفائی|کلینر/]},
 {service:"Mechanic",patterns:[/mechanic/i,/مکینک|گاڑی|موٹر سائیکل/]}
];
export function detectService(text:string): ServiceKey|"" { for(const x of servicePatterns) if(x.patterns.some(p=>p.test(text))) return x.service; return ""; }
export function detectWorkerIntent(text:string){ return /job|work|earn|worker|kaam karna|kam karna|rozgar|کام کرنا|روزگار|کاریگر بن/i.test(text); }
export function cleanTranscript(text:string){ return text.replace(/\s+/g," ").replace(/\b(uh|um|hmm)\b/gi,"").trim(); }
