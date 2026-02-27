# Phase 3b Frontend Implementation Plan

## Overview
Extend the minimal React/Vite frontend to support full dispute flow: open/select dispute, submit arguments, view status, trigger verdict.

## Tasks

### 1. Environment Setup
- [ ] Create `.env.example` with Judge API base URL
- [ ] Add environment variable types

### 2. Core Components
- [ ] `DisputeSelector` - Input to enter/select disputeId
- [ ] `ArgumentForm` - Submit argument (debaterId, argument text)
- [ ] `DisputeStatus` - Display dispute state (both debaters, ready status)
- [ ] `VerdictDisplay` - Show verdict results after judging
- [ ] `JudgeTrigger` - Button to trigger /judgeFromDispute

### 3. API Layer
- [ ] `judgeApi.ts` - Typed functions for:
  - POST /submitArgument
  - GET /dispute/:disputeId
  - POST /judgeFromDispute
  - GET / (health check)

### 4. Main App Integration
- [ ] Replace placeholder UI with dispute flow
- [ ] State management for current dispute
- [ ] Error handling and loading states

### 5. Documentation
- [ ] Update README.md with:
  - How to run (npm install, npm run dev)
  - Required env vars
  - Flow explanation mapping to Judge API

### 6. Verification
- [ ] Run `npm run build` - must pass
- [ ] Document any test results

## File Structure
```
apps/frontend/
├── .env.example
├── README.md
├── src/
│   ├── api/
│   │   └── judgeApi.ts
│   ├── components/
│   │   ├── DisputeSelector.tsx
│   │   ├── ArgumentForm.tsx
│   │   ├── DisputeStatus.tsx
│   │   ├── VerdictDisplay.tsx
│   │   └── JudgeTrigger.tsx
│   ├── app.tsx
│   └── main.tsx
```

## API Endpoints to Use
- Base URL: `http://35.233.167.89:3001` (from env or README)
- POST /submitArgument - Submit argument for a dispute
- GET /dispute/:disputeId - Get dispute status
- POST /judgeFromDispute - Trigger verdict
