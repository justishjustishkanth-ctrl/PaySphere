# PaySphere Workspace

Welcome to **PaySphere** — a secure international money transfer platform.

## Workspace Structure
- [backend](file:///c:/Users/justi/.gemini/antigravity-ide/scratch/paysphere/backend) — Spring Boot (Java) backend application running on port `8081`.
- [frontend](file:///c:/Users/justi/.gemini/antigravity-ide/scratch/paysphere/frontend) — React, Vite, and TailwindCSS frontend application running on port `5173`.
- [salesforce](file:///c:/Users/justi/.gemini/antigravity-ide/scratch/paysphere/salesforce) — Salesforce components and metadata.

## Twilio Trial Account Setup & Limitations
If you run into issues sending SMS OTP messages using a Twilio Trial Account (such as Twilio Error 21608 for unverified numbers), please read the setup and caller ID verification guide:
- **[Twilio Trial Limitations & Verification Guide](file:///c:/Users/justi/.gemini/antigravity-ide/scratch/paysphere/TWILIO_GUIDE.md)**

## Running the Application Locally

### Backend
1. Navigate to `backend` directory.
2. Run `mvn spring-boot:run`.

### Frontend
1. Navigate to `frontend` directory.
2. Run `npm run dev`.
