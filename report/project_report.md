# Project Report — Sports Buddy

## 1. Abstract

Sports Buddy is a Firebase-first web application that matches athletes through community-hosted events. Users sign up with skill metadata, publish events for their city/area, and find nearby games, while admins curate sports, cities, and areas. The system leverages modular ES modules, strict Firestore security rules, and comprehensive logging to stay safe, testable, and maintainable.

## 2. Introduction

- **Problem**: Local players lack a reliable hub to find equally skilled partners or discover pickup games.
- **Goal**: Deliver a responsive web app that simplifies registration, event discovery, and admin curation with minimal setup time.
- **Scope**: Client-side SPA + Firebase backend (Auth, Firestore, Hosting) with documentation, tests, and deployment guide.

## 3. System Design

- **Architecture**: Static hosting → Browser → Firebase SDK → Firebase services. No custom backend required.
- **Modules**: `firebase.js` (bootstrap), `auth.js`, `events.js`, `admin.js`, `ui.js`, `logger.js`.
- **Data model**
  - `users/{uid}`: `email`, `displayName`, `skillLevel`, `role`, timestamps.
  - `events/{eventId}`: `name`, `sport`, `city`, `area`, `date`, `desc`, `createdBy`.
  - `sports/{id}`, `cities/{id}`, `areas/{id}`: admin-managed catalogs.
  - `logs/{id}`: `userId`, `action`, `details`, `ts`.
- **RBAC flow**: On login, UI fetches `users/{uid}` to hydrate role and adjusts navigation + permissions.

## 4. Technologies Used

- HTML5, CSS3 (responsive layout), vanilla JS (ES modules)
- Firebase Authentication (email/password, reset, verification)
- Cloud Firestore (NoSQL store + security rules)
- Firebase Hosting & CLI for deployment

## 5. Implementation

- **Authentication module (`auth.js`)**
  - Credential validation, registration, login, logout
  - Password reset + email verification
  - Profile persistence (`users/{uid}`) with default `role: user`
- **Events module (`events.js`)**
  - Add/update/delete events with ownership checks
  - Nearby lookup by city + area
- **Admin module (`admin.js`)**
  - Add/rename/delete sports and cities
  - Attach areas to cities, delete areas
  - UI bindings for admin console
- **UI module (`ui.js`)**
  - Auth tabs, status messaging, role banner, event form wiring
  - Conditional rendering + logout + input validation
- **Logging (`logger.js`)**
  - Central helper using Firestore `logs` + console output
  - Called from every critical action (auth, admin, events)

## 6. Testing

- Manual regression suite defined in `tests/testcases.md` (registration, login, RBAC, CRUD, rules).
- Recommended: run through the checklist before every release or rules change.
- Future work: add automated smoke tests via Playwright/Firebase Emulator Suite.

## 7. Security

- Firestore rules enforce:
  - Users can read/write only their own profile.
  - Events can be modified by creator or admins.
  - Admin collections require `role === "admin"`.
  - Logs are write-only from clients.
- Password reset & verification reduce account takeover risks.
- All form inputs validated client-side before hitting Firebase.

## 8. Deployment

1. `firebase login`
2. `firebase init` (Hosting + Firestore rules)
3. `firebase deploy`

Environment-agnostic: the static bundle can also ship via Netlify, Vercel, S3, or any CDN.

## 9. Optimization

- Cache catalogs in `localStorage` to reduce reads.
- Batch writes when creating multiple admin entities.
- Add Firestore composite indexes for city+sport queries.
- Consider geohashing for precise distance filters.
- Lazy-load admin console components to shrink initial bundle.

## 10. Conclusion

Sports Buddy demonstrates how far a purely front-end + Firebase stack can scale when paired with modular code, RBAC, and comprehensive logging. Future iterations can incorporate matchmaking algorithms, push notifications, and automated moderation while retaining the same architecture.
