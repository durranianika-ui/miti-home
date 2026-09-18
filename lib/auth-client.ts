import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

// In the browser, talk to the origin the page was served from so preview
// deployments and custom domains work without per-environment config.
export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  plugins: [adminClient()],
});

// Export convenient hooks and methods
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;
