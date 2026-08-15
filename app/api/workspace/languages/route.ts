// app/api/workspace/languages/route.ts

import { auth } from "@/lib/auth";
import Language from "@/models/Language";
import User from "@/models/User";
import db from "@/utils/db";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

type LanguageRole = "editor" | "expert";

function isLanguageRole(value: unknown): value is LanguageRole {
  return value === "editor" || value === "expert";
}

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "You must be signed in." },
        { status: 401 },
      );
    }

    await db.connect();

    const user = await User.findOne({
      email: session.user.email,
    }).lean();

    if (!user) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 },
      );
    }

    const languageRoles = (user.languageRoles || {}) as Record<
      string,
      unknown
    >;

    const assignments = Object.entries(languageRoles)
      .filter(([, role]) => isLanguageRole(role))
      .map(([languageId, role]) => ({
        languageId,
        role,
      }));

    const languageIds = assignments.map((assignment) => assignment.languageId);

    const languages = await Language.find({
      _id: {
        $in: languageIds,
      },
      status: "active",
    })
      .select("name countries status")
      .sort({ name: 1 })
      .lean();

    const roleByLanguageId = new Map(
      assignments.map((assignment) => [
        assignment.languageId,
        assignment.role,
      ]),
    );

    return NextResponse.json({
      languages: languages.map((language) => ({
        _id: language._id.toString(),
        name: language.name,
        countries: Array.isArray(language.countries)
          ? language.countries
          : [],
        role: roleByLanguageId.get(language._id.toString()),
      })),
    });
  } catch (error) {
    console.error("GET /api/workspace/languages error:", error);

    return NextResponse.json(
      { error: "Failed to load assigned languages." },
      { status: 500 },
    );
  }
}