# Product research and design rationale

KaamYab deliberately uses interaction patterns people already understand from mature marketplaces, while keeping its own product thesis focused on accessibility for Pakistan's informal skilled workforce.

## Reference patterns

### Ride-hailing apps
Useful patterns: location first, live availability, simple status, short task-focused screens, and a clear transition from request to match.

### Offer-based marketplaces
Useful patterns: the customer can state a budget, providers can accept or counter, and the customer keeps the final choice.

### Local-services marketplaces
Useful patterns: clear service categories, visible pricing, trust signals, ratings, work history and post-job reviews.

### Professional marketplaces
Useful patterns: a worker profile should show skills, experience, reputation and examples of previous work instead of behaving like a basic phone directory.

## KaamYab's product decision

The product is not differentiated by having plumbers, electricians or ratings; those are category basics.

The differentiating direction in this prototype is the combination of:

- voice-first job posting;
- voice-first worker profile creation;
- complete English / Urdu switching;
- live worker availability;
- a compact trust/reputation profile;
- customer-controlled offers;
- a multi-worker business request path.

## Accessibility decision

The worker flow should remain usable for someone who is comfortable with WhatsApp and voice notes but uncomfortable with long forms or polished written English. Important actions should therefore be large, short, forgiving and explain themselves without product jargon.

## Language decision

English and Urdu are full interface modes. Urdu uses RTL. Roman-Urdu phrases are accepted by the intent rules. A production version could add Punjabi, Pashto, Saraiki and Sindhi after testing which languages materially improve worker onboarding and job completion.

## Voice decision

Voice is an accelerator, not a requirement. The rest of the product still works when microphone access or transcription is unavailable.

The browser demo records one short utterance and can send it to a server-side transcription route. A production mobile client should use reliable native recording, background upload, explicit consent and a structured extraction step with confirmation before publishing a worker profile or job request.

## Marketplace launch principle

Density matters more than coverage. The recommended early launch is a small number of high-frequency categories in Rawalpindi / Islamabad, with enough verified supply that customers consistently see useful nearby choices.
