// lib/auth-client.ts
import { createAuthClient } from "better-auth/react";


export const authClient = createAuthClient({
  // Use public env variable for client-side access
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
});