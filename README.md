# KaamYab — Local Services Marketplace

KaamYab is a bilingual local-services marketplace for Pakistan. It connects customers who need nearby help with skilled workers who want local work.

The core marketplace flow is simple:

**describe a need → confirm location/time/budget → receive nearby offers → compare price, availability and reputation → choose a worker → complete and review the job**

## Product focus

KaamYab is designed for practical local services such as plumbing, electrical work, AC repair, carpentry, painting, cleaning and basic repair work.

Customers can begin a request in three ways:

- choose a service category;
- type the problem in their own words;
- use short voice input in English, Urdu or Roman Urdu.

Voice is an accessibility layer, not a dependency. Every important flow also works through ordinary text and tap-based controls.

## Customer experience

- English and Urdu / RTL interface
- service discovery
- short voice-assisted request creation
- optional photo support
- location confirmation
- timing, urgency and budget
- nearby worker offers
- worker profiles with ratings, completed jobs and work history
- active-job status
- messaging / contact flow
- completion and review
- request history, settings and safety screens

## Worker experience

- simple profile setup without long forms
- online / offline availability
- nearby job feed
- accept a customer budget or send another offer
- active-job status flow
- earnings view
- worker reviews

## Technology

- Next.js 15
- React 19
- TypeScript
- Lucide icons
- responsive CSS without a UI framework
- browser geolocation
- `MediaRecorder` for short voice recordings
- Groq-powered speech transcription through a server-side API route
- PWA manifest

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

KaamYab supports short voice-assisted requests in English, Urdu and Roman Urdu. Text input remains available whenever voice is unavailable.
Add GROQ_API_KEY to .env.local to enable voice transcription.

## Build checks

```bash
npm run check
npm run build
```

## Current Scope

The repository includes realistic sample workers, offers, ratings, earnings and job activity to demonstrate the complete marketplace experience.

A production deployment would require persistent accounts, phone verification, a real database, location-aware matching, notifications, moderation, worker verification, media storage, abuse controls and privacy/legal review.

See `docs/PRODUCTION_ARCHITECTURE.md` for the proposed production path.

## Project background

KaamYab originated as a hackathon project focused on improving access to local skilled workers through bilingual and voice-assisted interactions. Since then, the project has been expanded into a two-sided marketplace with customer and worker flows, location-aware discovery, service requests, worker offers, ratings and job tracking.
