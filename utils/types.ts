import { ObjectId, Types } from "mongoose";

export type MediaType = {
  image_url: string;
  public_id: string;
};



export interface UserType {
  // Core Better Auth Fields
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string;

  // Custom App Fields
  role: "user" | "staff" | "admin";
  avatar?: MediaType;
  bio:string;

  // Security & Migration
  passwordless?: boolean;
  betterAuthId?: string;

  // Login / Logout Tracking
  lastLogin?: Date;
  lastLogout?: Date;

  lastLogins?: Date[];
  lastLogouts?: Date[];

  // Language-specific roles
  languageRoles?: Record<string, string>; // e.g. { Arabic: "editor" }

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}


export interface AccountType {
  userId: Types.ObjectId;        // Reference to User (ObjectId for Mongoose)
  accountId: string;             // Email (credentials) or Provider ID (social)
  providerId: string;            // "credential", "google", etc. 
  password?: string;             // Hashed passwords belong HERE, not in UserType
  // Token Management
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  accessTokenExpiresAt?: Date;   // Corrected from generic 'expiresAt'
  refreshTokenExpiresAt?: Date;  // Corrected from generic 'expiresAt'
  scope?: string;
  passwordResetToken?: string;
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}


export interface SessionType {
  userId: Types.ObjectId;
  token: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VerificationType {
  identifier: string;
  value: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LanguageType {
  name: string;
  countries: string[];
  status: "active" | "archived";
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlphabetLetter {
  character: string;
  order: number;
  ipa?: string;
  audioUrl?: string;
}

export interface AlphabetType {
  name: string;
  language: Types.ObjectId;
  letters: AlphabetLetter[];
  createdBy: Types.ObjectId;
  lastUpdatedBy?: Types.ObjectId;
  status: "draft" | "published" | "archived";
  createdAt: Date;
  updatedAt: Date;
}

export interface EssayType {
  title: string;
  category?: string;
  body?: string;
  translationTitle?: string;
  translationBody?: string;
  images?: {
    image_url?: string;
    public_id?: string;
  }[];
  status: "draft" | "pending" | "published" | "rejected";
  level?: "beginner" | "intermediate" | "advanced";
  tags?: string[];
  moderationHistory?: Array<{
  _id?: string;
  previousStatus: "draft" | "pending" | "published" | "rejected";
  nextStatus: "draft" | "pending" | "published" | "rejected";
  comment: string;
  changedBy: string;
  changedAt: Date;
}>;
  language: Types.ObjectId;
  author: Types.ObjectId;
  editedBy?: Types.ObjectId[];
  approvedBy?: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TableType {
  text: string;
  translation: string;
  textType: "word" | "sentence" | "expression" | "passage";
  status: "pending" | "published" | "rejected";
  domain?: string;
  createdBy: Types.ObjectId;
  editedBy?: Types.ObjectId[];
  language: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommentType {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  text: string;
  status?: string;
  likes: Types.ObjectId[];
  dislikes: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ReelType {
  caption: string;
  media: MediaType;
  tags: string[];
  transcription?: string;
  translation?: string;
  author: Types.ObjectId;
type: "video" | "audio";
  approvedBy: Types.ObjectId[];
  language: Types.ObjectId;
  likes: Types.ObjectId[];
  dislikes: Types.ObjectId[];
  comments: CommentType[];
  createdAt: Date;
  updatedAt: Date;
}

export interface FrontendAuthor {
  name: string;
  avatar: string | null;
}

export interface FrontendMedia {
  image_url: string;
  public_id: string;
}

export interface FrontendComment {
  _id: string;
  text: string;
  user: {
    _id: string;
    name: string;
    avatar: string | null;
  };
  likes: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface ReelCardType {
  _id: string;
  caption: string;
  tags: string[];
  transcription: string;
  translation: string;
  language: string;
  languageId: string;
  media: {
    image_url: string;
    public_id: string;
  };
  author: {
    _id: string;
    name: string;
    avatar: string | null;
  } | null;
  likes: string[];
  comments: FrontendComment[];
  createdAt: string;
  hasLiked: boolean;
  type: "audio" | "video";
}