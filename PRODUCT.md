# Product Context: TCS Joining Tracker

## 1. What It Is
**TCS Joining Tracker** is an independent, privacy-first community platform and recruitment ledger for Tata Consultancy Services (TCS) campus and lateral recruits (`Ninja`, `Digital`, and `Prime` hiring streams across India). It enables candidates waiting between their Offer Letter, Readiness Survey, Joining Letter (JL), and actual Joining Date to log verifiable chronological milestones, compare real cohort wait-time benchmarks, and collaborate in structured discussions and real-time cohort channels without exposing personally identifiable information (PII).

## 2. Core Audience & Usage Scene
- **Primary Users:** Newly selected TCS candidates (`Batch 2024`, `Batch 2025`, `Batch 2026`, etc.) navigating the high-anxiety months between receiving an Offer Letter and receiving a Joining Letter / Onboarding Date.
- **Usage Scene:** Checked daily on both mobile phones (PWA / Android Chrome / iOS Safari) and desktop browsers to see if candidates in the same batch, stream (`Ninja` / `Digital` / `Prime`), and region (`Hyderabad`, `Chennai`, `Pune`, `Kolkata`, `Bengaluru`, `Delhi NCR`, `Mumbai`) have started receiving Joining Letters.
- **Emotional Need:** Calm, trustworthy, factual clarity. Candidates are tired of clickbait rumors, Telegram spam, and fake dates. The interface must feel like an authoritative, transparent civic/engineering ledger—never a flashy marketing template or noisy social network.

## 3. Core Jobs-to-Be-Done
1. **Track Personal Recruitment Pipeline (`/dashboard`, `/timeline`):** Log exact dates for the 6 canonical recruitment milestones (`Offer Received` → `Readiness Survey` → `Waiting for JL` → `JL Received` → `Joining Date Set` → `Joined TCS`) and see elapsed days between stages.
2. **Inspect Cohort Benchmarks (`/analytics`, `/`):** Filter community-reported wait times (`Offer → JL` and `Survey → JL` min/average/max days) and status distributions by Batch, Stream, and Region, with strict `<5` k-anonymity suppression.
3. **Collaborate Safely (`/community`, `/messages`):** Ask verification, BGC/document, and location questions or chat live in cohort rooms under an anonymized or pseudonymous `IdentityPill` (`Anonymous Candidate · Digital · 2025 Batch`).
4. **Receive Privacy-Safe Alerts (`/notifications`, `/settings/devices`):** Receive Web Push (FCM) and in-app notifications when cohort activity or thread replies occur, with zero PII in lock-screen payloads.

## 4. Non-Affiliation & Honesty Mandate
- **Strict Non-Affiliation (`05 §5.6`):** The platform is community-operated and is **not** affiliated with or endorsed by Tata Consultancy Services Limited.
- **Zero Fabricated Telemetry:** Suppress any cohort breakdown with `<5` submissions (`4.2 D2`). Never display invented deltas, fake online counts, or decorative sparklines.
