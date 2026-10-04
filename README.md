# KaamYab — Local Services Marketplace

KaamYab is a bilingual local-services marketplace concept for Pakistan. It connects customers who need nearby help with skilled workers who want local work.

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
- optional Groq Whisper transcription through a server route
- PWA manifest

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

Voice transcription is optional. To enable it, set:

```text
GROQ_API_KEY=your_key_here
```

Never commit `.env.local`.

## Build checks

```bash
npm run check
npm run build
```

## Data and production scope

The included workers, jobs, offers, ratings and earnings are synthetic demo data. This repository demonstrates the product experience and front-end marketplace logic; it is not presented as a live marketplace.

A production deployment would require persistent accounts, phone verification, a real database, location-aware matching, notifications, moderation, worker verification, media storage, abuse controls and privacy/legal review.

See `docs/PRODUCTION_ARCHITECTURE.md` for the proposed production path.

## Project background

KaamYab began as a university/hackathon concept around bilingual worker discovery and voice-assisted access to local work. This version develops that original idea into a more complete two-sided marketplace while keeping the same purpose: making local skilled work easier to request and easier to access.
