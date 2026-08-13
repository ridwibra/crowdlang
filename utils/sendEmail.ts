import nodemailer from "nodemailer";
import { google } from "googleapis";

const { OAuth2 } = google.auth;
const OAUTH_PLAYGROUND = "https://developers.google.com/oauthplayground/";

// Runtime environment variable validation
function getRequiredEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const MAILING_SERVICE_CLIENT_ID = getRequiredEnvVar(
  "MAILING_SERVICE_CLIENT_ID"
);
const MAILING_SERVICE_CLIENT_SECRET = getRequiredEnvVar(
  "MAILING_SERVICE_CLIENT_SECRET"
);
const MAILING_SERVICE_CLIENT_REFRESH_TOKEN = getRequiredEnvVar(
  "MAILING_SERVICE_CLIENT_REFRESH_TOKEN"
);
const SENDER_EMAIL_ADDRESS = getRequiredEnvVar("SENDER_EMAIL_ADDRESS");

// Type definitions
type EmailTemplate = (to: string, url: string) => string;

interface MailOptions {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Initialize OAuth2 client with correct parameters
const oauth2Client = new OAuth2(
  MAILING_SERVICE_CLIENT_ID,
  MAILING_SERVICE_CLIENT_SECRET,
  OAUTH_PLAYGROUND
);

/**
 * Send email using Gmail OAuth2
 */
export const sendEmail = async (
  to: string,
  url: string,
  txt: string,
  subject: string,
  template: EmailTemplate
): Promise<nodemailer.SentMessageInfo> => {
  try {
    // Set OAuth2 credentials including refresh token
    oauth2Client.setCredentials({
      refresh_token: MAILING_SERVICE_CLIENT_REFRESH_TOKEN,
    });

    const { token: accessToken } = await oauth2Client.getAccessToken();
    if (!accessToken) {
      throw new Error("Failed to obtain access token");
    }

    // // Disable certificate verification (not recommended for production)
    // process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    // Create Nodemailer transport
    const smtpTransport = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: SENDER_EMAIL_ADDRESS,
        clientId: MAILING_SERVICE_CLIENT_ID,
        clientSecret: MAILING_SERVICE_CLIENT_SECRET,
        refreshToken: MAILING_SERVICE_CLIENT_REFRESH_TOKEN,
        accessToken,
      },
    });

    // Prepare mail options
    const mailOptions: MailOptions = {
      from: SENDER_EMAIL_ADDRESS,
      to,
      subject,
      html: template(to, url),
      ...(txt && { text: txt }),
    };

    console.log("Mail options:", {
      ...mailOptions,
      html: `${mailOptions.html.substring(0, 50)}...`,
    });

    // Send email
    const result = await new Promise<nodemailer.SentMessageInfo>(
      (resolve, reject) => {
        smtpTransport.sendMail(
          mailOptions,
          (err: Error | null, info: nodemailer.SentMessageInfo) => {
            if (err) {
              console.error("Error sending email:", err);
              reject(new Error(`Email failed to send: ${err.message}`));
            } else {
              console.log("Email sent successfully:", {
                messageId: info.messageId,
                response: info.response,
              });
              resolve(info);
            }
          }
        );
      }
    );

    return result;
  } catch (error) {
    console.error(
      "Email sending error:",
      error instanceof Error ? error.message : error
    );
    throw error;
  }
};
