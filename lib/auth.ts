// lib/auth.ts
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient } from "mongodb";
import { sendEmail } from "@/utils/sendEmail";
import { activateEmailTemplate } from "@/utils/emails/activateEmailTemplate";
import { resetEmailTemplate } from "@/utils/emails/resetEmailTemplate";
import { admin } from "better-auth/plugins"; 
const client = new MongoClient(process.env.MONGODB_URI!);
const dbMongo = client.db();

export const auth = betterAuth({
  appName: "CrowdLang",
  baseURL: process.env.BETTER_AUTH_URL,
 trustedOrigins: [
  
  "https://crowdlang.org",
  "https://www.crowdlang.org",
  "http://localhost:3000",
  ],

  database: mongodbAdapter(dbMongo, { client }),

   
  emailVerification: {
        // 60 seconds * 60 minutes * 48 hours = 172,800 seconds
    expiresIn: 60 * 60 * 48, 
    sendVerificationEmail: async ({ user, url, token }, request) => {
        const base = process.env.BETTER_AUTH_URL?.trim().replace(/\/+$/, "");
  const customVerifyUrl = `${base}/verify/${token}`;
      const emailPromise = sendEmail(
        user.email,
        customVerifyUrl,
        "",
        "Verify Your Email Address",
        activateEmailTemplate
      );

      if (request && "waitUntil" in request) {
        (request as any).waitUntil(emailPromise);
      } else {
        await emailPromise;
      }
    },
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    // 60 seconds * 60 minutes * 3 hours = 10,800 seconds
  resetPasswordTokenExpiresIn: 60 * 60 * 3,
    sendResetPassword: async ({ user, url }, request) => {
      const emailPromise = sendEmail(
        user.email,
        url, 
        "",
        "Reset Your Password",
        resetEmailTemplate 
      );

      if (request && "waitUntil" in request) {
        (request as any).waitUntil(emailPromise);
      } else {
        await emailPromise;
      }
    },
    revokeSessionsOnPasswordReset: true,
  },

  // CUSTOM USER FIELDS
  user: {
    deleteUser: {
      enabled: true, 
    },
    additionalFields: {
      role: { type: "string", defaultValue: "user" },
      
      avatar: { 
   type: "json", 
        defaultValue: null
},
      
      lastLogin: { type: "date" },
    },
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  plugins: [
    admin(), // Enables auth.api.listUsers and role management
  ],
});