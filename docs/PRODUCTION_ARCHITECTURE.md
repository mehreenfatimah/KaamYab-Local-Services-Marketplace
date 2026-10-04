# Production architecture

## Client

Phase 1: Next.js PWA for rapid deployment, product validation and portfolio demonstration.

Phase 2: React Native / Expo mobile client using the same API contracts and product flows. The product should move to native when real field testing shows sustained demand for push notifications, background location, background audio upload, stronger offline behaviour, and app-store distribution.

## Backend

Use a dedicated API service (FastAPI or NestJS) once the product stores real users and jobs.

Core entities:
- users
- worker_profiles
- worker_skills
- verification_records
- service_requests
- offers
- bookings
- reviews
- conversations
- device_tokens
- service_areas

## Authentication

Phone number + OTP. Email/password should not be required for the primary audience.

## Location

Store coarse worker service areas and live location only while a worker explicitly goes online. Customer location should be collected for matching with clear permission.

Use PostGIS for radius queries at scale.

## Voice

Client records compressed Opus/WebM audio. Production uploads should go directly to object storage with signed URLs. A background worker transcribes audio and writes the result to the job/profile record.

Do not route long raw audio through app WebSockets.

## Matching

1. Filter by service.
2. Filter by online/available status.
3. Radius search.
4. Rank by distance, rating, response rate, completed jobs and recent activity.
5. Notify eligible workers.
6. Collect accept/counter-offer responses.
7. Customer chooses.

## Trust and safety

- phone OTP
- optional CNIC/identity verification
- worker photo and skill verification
- report/block
- post-job ratings only
- suspicious review detection
- support trail for each booking
- clear emergency/contact escalation

## Payments

Start with cash / direct settlement if product validation requires minimal friction. Add wallet/card/Raast integrations only when transaction control is needed.

## Suggested deployment

Early production:
- Vercel: web frontend
- Supabase/Postgres: database + auth/storage if desired
- FastAPI on Render/Railway/AWS: backend
- object storage: S3 or Supabase Storage
- Redis/queue when asynchronous matching/transcription volume requires it

Growth:
- AWS CloudFront + S3
- ECS/Fargate
- RDS PostgreSQL + PostGIS
- ElastiCache Redis
- SQS
- CloudWatch
