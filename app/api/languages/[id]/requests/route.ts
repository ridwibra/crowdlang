import "@/models/User";

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import db from "@/utils/db";
import User from "@/models/User";
import Language from "@/models/Language";
import LanguageRoleRequest from "@/models/LanguageRoleRequest";

const ALLOWED_REQUESTED_ROLES = ["editor", "expert"] as const;
const MAX_PENDING_REQUESTS = 3;

type RequestedRole = (typeof ALLOWED_REQUESTED_ROLES)[number];

const getLanguageRolesObject = (
  languageRoles: unknown,
): Record<string, string> => {
  if (!languageRoles) return {};

  if (languageRoles instanceof Map) {
    return Object.fromEntries(languageRoles.entries()) as Record<string, string>;
  }

  if (typeof languageRoles === "object" && !Array.isArray(languageRoles)) {
    return languageRoles as Record<string, string>;
  }

  if (typeof languageRoles === "string") {
    try {
      const parsed = JSON.parse(languageRoles);

      if (
        parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed)
      ) {
        return parsed as Record<string, string>;
      }
    } catch {
      return {};
    }
  }

  return {};
};

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await db.connect();

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "You must be signed in to submit a request." },
        { status: 401 },
      );
    }

    const { id } = await context.params;

    const body = await request.json();

    const requestedRole =
      typeof body.requestedRole === "string"
        ? body.requestedRole.trim()
        : "";

    const justification =
      typeof body.justification === "string"
        ? body.justification.trim()
        : "";

    if (
      !ALLOWED_REQUESTED_ROLES.includes(requestedRole as RequestedRole)
    ) {
      return NextResponse.json(
        { error: "Requested role must be editor or expert." },
        { status: 400 },
      );
    }

    if (justification.length < 20) {
      return NextResponse.json(
        {
          error:
            "Please provide a justification with at least 20 characters.",
        },
        { status: 400 },
      );
    }

    if (justification.length > 2000) {
      return NextResponse.json(
        {
          error:
            "Justification must not be longer than 2,000 characters.",
        },
        { status: 400 },
      );
    }

    const [mongoUser, language] = await Promise.all([
      User.findOne({ email: session.user.email }),
      Language.findById(id),
    ]);

    if (!mongoUser) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 },
      );
    }

    if (!language) {
      return NextResponse.json(
        { error: "Language not found." },
        { status: 404 },
      );
    }

    if (language.status !== "active") {
      return NextResponse.json(
        {
          error:
            "This language is currently archived and cannot accept role requests.",
        },
        { status: 400 },
      );
    }

    const languageRoles = getLanguageRolesObject(mongoUser.languageRoles);

    const currentRole =
      languageRoles[language.name] === "editor" ||
      languageRoles[language.name] === "expert"
        ? languageRoles[language.name]
        : "user";

    if (currentRole === requestedRole) {
      return NextResponse.json(
        {
          error: `You already have the ${requestedRole} role for ${language.name}.`,
        },
        { status: 400 },
      );
    }

    const existingPendingRequest = await LanguageRoleRequest.findOne({
      user: mongoUser._id,
      language: language._id,
      status: "pending",
    });

    if (existingPendingRequest) {
      return NextResponse.json(
        {
          error:
            "You already have a pending role request for this language.",
        },
        { status: 400 },
      );
    }

    const pendingRequestsCount = await LanguageRoleRequest.countDocuments({
      user: mongoUser._id,
      status: "pending",
    });

    if (pendingRequestsCount >= MAX_PENDING_REQUESTS) {
      return NextResponse.json(
        {
          error:
            "You already have 3 pending language-role requests. Please wait for one to be reviewed before submitting another request.",
        },
        { status: 400 },
      );
    }

    const roleRequest = await LanguageRoleRequest.create({
      user: mongoUser._id,
      language: language._id,
      currentRole,
      requestedRole,
      justification,
      status: "pending",
    });

    return NextResponse.json(
      {
        message: "Language role request submitted successfully.",
        request: {
          _id: roleRequest._id.toString(),
          language: language.name,
          currentRole: roleRequest.currentRole,
          requestedRole: roleRequest.requestedRole,
          justification: roleRequest.justification,
          status: roleRequest.status,
          createdAt: roleRequest.createdAt,
        },
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("POST /api/languages/[id]/requests error:", error);

    if (error?.code === 11000) {
      return NextResponse.json(
        {
          error:
            "You already have a pending role request for this language.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to submit language role request." },
      { status: 500 },
    );
  } 
}