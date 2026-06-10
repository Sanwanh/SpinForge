import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { magicLink } from 'better-auth/plugins';
import { nextCookies } from 'better-auth/next-js';
import { db, schema } from './db';

// Conditionally enable providers only when their credentials exist, so the app
// runs with just email/password until OAuth / email creds are provisioned.
const socialProviders: Record<string, { clientId: string; clientSecret: string }> = {};
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  socialProviders.google = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  };
}
if (process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET) {
  socialProviders.apple = {
    clientId: process.env.APPLE_CLIENT_ID,
    clientSecret: process.env.APPLE_CLIENT_SECRET,
  };
}

// Resolve the auth base URL. Vercel injects VERCEL_PROJECT_PRODUCTION_URL (the stable
// production host, with no protocol) so production never silently falls back to
// localhost — which would issue non-Secure session cookies the HTTPS browser drops.
function resolveBaseUrl(): string {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL;
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  // Production: the stable project domain. Preview/other Vercel envs: that
  // deployment's own URL, so session cookies match the host being visited.
  if (process.env.VERCEL_ENV === 'production' && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

// Better Auth rejects credentialed requests whose Origin header is not in
// trustedOrigins ("Invalid origin", 403). Default is baseURL only, which broke
// sign-in/sign-up when the same deployment is reached through its other Vercel
// hosts (the unique deployment URL, branch URL, or team-scoped production URL
// opened from the dashboard). Trust exactly those Vercel-injected hosts.
function resolveTrustedOrigins(): string[] {
  const hosts = [
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ];
  const origins = hosts.filter((h): h is string => Boolean(h)).map((h) => `https://${h}`);
  // Escape hatch for hosts Vercel does not inject (e.g. the team-scoped
  // production alias): comma-separated full origins.
  const extra = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  return [...new Set([resolveBaseUrl(), ...origins, ...extra])];
}

export const auth = betterAuth({
  baseURL: resolveBaseUrl(),
  trustedOrigins: resolveTrustedOrigins(),
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: { enabled: true, requireEmailVerification: false },
  socialProviders,
  plugins: [
    magicLink({
      // Until an email provider is wired, the link is logged server-side so the
      // flow is testable locally; replace with Resend/SES send in production.
      sendMagicLink: async ({ email, url }) => {
        if (process.env.RESEND_API_KEY) {
          // TODO(phase 2): send via Resend
        }
        console.warn(`[magic-link] ${email} -> ${url}`);
      },
    }),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
