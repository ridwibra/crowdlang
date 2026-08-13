// app/api/languages/route.ts
import { auth } from "@/lib/auth";
import Language from "@/models/Language";
import "@/models/User";
import db from "@/utils/db";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

type GlobalRole = "user" | "staff" | "admin";

type PopulatedUser = {
  _id?: {
    toString(): string;
  };
  name?: string;
  email?: string;
};

type LanguageDocument = {
  _id: {
    toString(): string;
  };
  name?: string;
  countries?: string[];
  status?: "active" | "archived";
  createdAt?: Date | string;
  updatedAt?: Date | string;
  createdBy?: PopulatedUser | null;
};

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const role = (session?.user as { role?: GlobalRole } | undefined)?.role;

    if (!session?.user) {
      return NextResponse.json(
        {
          error: "You must be signed in.",
        },
        {
          status: 401,
        },
      );
    }

    if (role !== "admin" && role !== "staff") {
      return NextResponse.json(
        {
          error: "Admin or staff access is required.",
        },
        {
          status: 403,
        },
      );
    }

    await db.connect();

    const languageDocuments = (await Language.find()
      .sort({ createdAt: -1 })
      .populate("createdBy", "name email")
      .lean()) as unknown as LanguageDocument[];

    const languages = languageDocuments.map((language) => ({
      _id: language._id.toString(),
      name: language.name || "Unnamed language",
      countries: Array.isArray(language.countries) ? language.countries : [],
      status: language.status === "archived" ? "archived" : "active",
      createdAt: language.createdAt || null,
      updatedAt: language.updatedAt || null,
      createdBy: language.createdBy
        ? {
            _id: language.createdBy._id?.toString() || "",
            name: language.createdBy.name || "Unknown",
            email: language.createdBy.email || "",
          }
        : null,
    }));

    return NextResponse.json(
      {
        languages,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("GET /api/languages error:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch languages.",
      },
      {
        status: 500,
      },
    );
  }
}