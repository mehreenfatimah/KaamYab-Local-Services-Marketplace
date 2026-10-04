export type Language = "en" | "ur";
export type ServiceKey = "Plumber"|"Electrician"|"AC Technician"|"Carpenter"|"Painter"|"Cleaner"|"Mechanic"|"Other";
export type Worker = {
  id: string; name: string; skill: ServiceKey; skillUr: string; city: string; area: string;
  lat: number; lng: number; rating: number; jobs: number; verified: boolean; available: boolean;
  experienceYears: number; startingRate: number; responseMinutes: number; phone: string;
  bioEn: string; bioUr: string; trustScore:number; repeatRate:number; onTimeRate:number;
  languages:string[]; skills:string[]; portfolio:string[]; memberSince:number;
};
export type RequestDraft = {
  service: ServiceKey | ""; issue: string; area: string; city: string; when: "now"|"today"|"schedule";
  budget: number; notes: string;
};
export type WorkerOffer = { worker: Worker & { distance: number }; price: number; etaMin: number; note?: string };
