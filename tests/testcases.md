# Test cases — Sports Buddy

Use the following template per test: **Steps → Expected → Actual → Pass/Fail → Notes**.

1. **User registration (happy path)**
   - Register with valid name/email/password/skill.
   - Expect Firestore `users/{uid}` doc with `role: user`, email verification sent, `logs` entry `register`.

2. **Registration validation**
   - Try invalid email or password < 6 chars.
   - Expect inline error message and no Auth/Firestore record.

3. **Login**
   - Login with valid credentials.
   - Expect dashboard to unlock, role banner populated, log entry `login`.

4. **Forgot password**
   - Click “Forgot password?” with valid email.
   - Expect Firebase email sent, log entry `reset_password_request`.

5. **Logout**
   - Click Logout.
   - Expect nav/button reset, event form hidden, log entry `logout`.

6. **Event creation**
   - Authenticated user fills event form (sport/city/area/date).
   - Expect Firestore `events` doc with `createdBy = uid`, log entry `add_event`, event visible in list.

7. **Event authorization**
   - User A creates event; User B attempts update/delete.
   - Expect Firestore rules to block (permission error); only creator or admin succeeds.

8. **Admin sports CRUD**
   - Admin adds sport, renames it, deletes it.
   - Expect sports list + dropdown reflect change, logs contain `add_sport`, `rename_sport`, `delete_sport`.

9. **Admin city/area management**
   - Admin adds city, renames it, adds area, deletes area/city.
   - Expect dependent dropdown and areas list update; verify Firestore documents removed/updated.

10. **Logs privacy**
    - Attempt to read `logs` collection from regular user (Firestore rules simulator).
    - Expect read denied; writes still allowed.

11. **RBAC enforcement**
    - Regular user navigates directly to `admin.html`.
    - Expect operations to fail at Firestore layer (writes denied) unless role manually set to `admin`.

12. **UI responsiveness**
    - Test on mobile viewport (375px) and desktop.
    - Expect layout reflows without overlapping elements.

Record results in this file or spreadsheet for each release. Add regression tests when new modules are introduced.

