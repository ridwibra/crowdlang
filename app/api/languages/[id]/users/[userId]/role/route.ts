// app/api/languages/[id]/users/[userId]/role/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import db from "@/utils/db";
import User from "@/models/User";
import Language from "@/models/Language";

const ALLOWED_LANGUAGE_ROLES = ["user", "editor", "expert"] as const;

type LanguageRole = (typeof ALLOWED_LANGUAGE_ROLES)[number];

const getLanguageRolesObject = (
  languageRoles: unknown,
): Record<string, LanguageRole> => {
  if (!languageRoles) {
    return {};
  }

  if (languageRoles instanceof Map) {
    return Object.fromEntries(languageRoles.entries()) as Record<
      string,
      LanguageRole
    >;
  }

  if (typeof languageRoles === "object" && !Array.isArray(languageRoles)) {
    return languageRoles as Record<string, LanguageRole>;
  }

  if (typeof languageRoles === "string") {
    try {
      const parsed = JSON.parse(languageRoles);

      if (
        parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed)
      ) {
        return parsed as Record<string, LanguageRole>;
      }
    } catch {
      return {};
    }
  }

  return {};
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; userId: string }> },
) {
  try {
    await db.connect();

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id, userId } = await context.params;

    const body = await request.json();
    const role = body.role as string;

    if (!ALLOWED_LANGUAGE_ROLES.includes(role as LanguageRole)) {
      return NextResponse.json(
        {
          error:
            "Invalid language role. Allowed values are: user, editor, expert.",
        },
        { status: 400 },
      );
    }

    const language = await Language.findById(id).lean();

    if (!language) {
      return NextResponse.json(
        { error: "Language not found" },
        { status: 404 },
      );
    }

    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 },
      );
    }

    const existingLanguageRoles = getLanguageRolesObject(user.languageRoles);

    const updatedLanguageRoles = {
      ...existingLanguageRoles,
      [language.name]: role as LanguageRole,
    };

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          languageRoles: updatedLanguageRoles,
        },
      },
      {
        returnDocument: "after",
        runValidators: true,
      },
    );

    if (!updatedUser) {
      return NextResponse.json(
        { error: "User not found after update" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        message: "Language role updated successfully.",
        user: {
          _id: updatedUser._id.toString(),
          name: updatedUser.name,
          email: updatedUser.email,
          languageRole: role,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "PATCH /api/languages/[id]/users/[userId]/role error:",
      error,
    );

    return NextResponse.json(
      { error: "Failed to update language role" },
      { status: 500 },
    );
  } 
}