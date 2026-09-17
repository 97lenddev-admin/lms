# Supabase authentication setup

## Connect a project

1. Use your preferred Supabase account and project. The app connects only through environment variables; it does not depend on the account connected to Codex.
2. Fill in `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from that project's Connect dialog. For a fresh checkout, copy `.env.example` to `.env.local` first. This local file is ignored by Git. Use a publishable key, never a secret or service-role key.
3. In Supabase Authentication → Providers, enable Email/password authentication. Create or invite the app's users through Supabase; this app has no public signup form.
4. In Authentication → URL Configuration, set the production Site URL and add these redirect URLs for environments you use:

   - `http://localhost:3000/auth/callback`
   - `http://192.168.1.41:3000/auth/callback` (local network development)
   - `https://YOUR-PRODUCTION-DOMAIN/auth/callback`

5. Keep the Reset Password email template's link pointed at `{{ .ConfirmationURL }}`. Configure production SMTP for delivery to your users.
6. Restart `npm run dev` after setting environment variables.

## Flow and behavior

- `/log-in` signs in using `signInWithPassword`; passwords never go in the URL. Successful login goes to `/credit-analyst`.
- “Remember for 30 days” persists this browser's session cookies for up to 30 days, preserving the original expiry across refreshes. Unchecked uses session cookies. Supabase's own session lifetime settings can end sessions sooner; browsers with session restoration may restore session cookies.
- `/forgot-password` calls `resetPasswordForEmail` and supports resend. Its success message does not disclose whether an account exists.
- The reset email returns to `/auth/callback`, which exchanges the PKCE code for a session and redirects to `/reset-password`. Open the email link in the same browser and origin that requested it. Expired links and missing verifier cookies return to the retry form.
- `/reset-password` validates the session, checks matching passwords, and calls `updateUser`. Successful updates sign out the local session and show a login link.
- Proxy refreshes sessions and applies private/no-store headers. Both dashboard pages independently validate the user on the server. Their logout icons now sign out.
- These checks establish authentication only. The existing dashboard data and display names are still demo content. Role-based permissions and database RLS policies must be implemented with the real data model; no tables or authorization roles are created by this change.

## Verify with a real account

1. Open either dashboard while signed out: expect `/log-in`.
2. Submit invalid credentials: expect an inline error, with no navigation.
3. Sign in with a confirmed account; reload the dashboard and verify the session remains.
4. Sign out; verify direct dashboard access requires login again.
5. Request a reset for your test account, open the delivered link in the same browser, and set a new password.
6. Confirm the old password fails and the new password succeeds.
7. Reuse the reset link: expect the invalid/expired-link retry message.

References: [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [Password authentication](https://supabase.com/docs/guides/auth/passwords), [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).
