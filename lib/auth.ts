import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { db } from "./db";
import * as schema from "./db/schema";
import { sendResetPasswordEmail, sendVerificationEmail, sendWelcomeEmail } from "./email";

const authBaseUrl =
  process.env.BETTER_AUTH_URL ||
  process.env.BETTER_AUTH_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000";

const authSecret = process.env.BETTER_AUTH_SECRET;

if (!authSecret) {
  throw new Error("CRITICAL VULNERABILITY: BETTER_AUTH_SECRET environment variable is missing. Application cannot start securely.");
}

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const hasGoogleOAuth = Boolean(googleClientId && googleClientSecret);

export const auth = betterAuth({
  baseURL: authBaseUrl,
  secret: authSecret,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      try {
        await sendResetPasswordEmail(user, url);
      } catch {
        throw new Error("Failed to send password reset email");
      }
    },
  },

  emailVerification: {
    // Verification is offered, not required, so checkout is never blocked by
    // email deliverability. Sending is skipped when Resend is not configured.
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      try {
        await sendVerificationEmail(user, url);
      } catch (error) {
        console.error("Verification email failed:", error instanceof Error ? error.message : error);
      }
    },
  },

  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          sendWelcomeEmail({ email: user.email, name: user.name }).catch((error) => {
            console.error("Welcome email failed:", error instanceof Error ? error.message : error);
          });
        },
      },
    },
  },

  socialProviders: hasGoogleOAuth
    ? {
        google: {
          clientId: googleClientId!,
          clientSecret: googleClientSecret!,
        },
      }
    : {},

  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: hasGoogleOAuth ? ["email-password", "google"] : ["email-password"],
      updateUserInfoOnLink: true,
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "user",
        input: false, // Don't allow setting via signup
      },
      phone: {
        type: "string",
        required: false,
      },
    },
  },

  plugins: [
    admin({
      defaultRole: "user",
      adminRole: "admin",
    }),
  ],

  trustedOrigins: [
    "http://localhost:3000",
    authBaseUrl,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    process.env.VERCEL_BRANCH_URL ? `https://${process.env.VERCEL_BRANCH_URL}` : undefined,
  ].filter((origin): origin is string => Boolean(origin)),
});

// Export types
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
