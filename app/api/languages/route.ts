// app/api/languages/route.ts
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getSession } from "@/lib/server";
import db from "@/utils/db";
import Language from "@/models/Language";
import User from "@/models/User";
import { UserType } from "@/utils/types";

type GlobalRole = "user" | "staff" | "admin";

type LanguageStatus = "active" | "archived" | "pending_deletion";

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
  status?: LanguageStatus;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  createdBy?: PopulatedUser | null;
};

function getSafeLanguageStatus(status?: LanguageStatus): LanguageStatus {
  if (
    status === "active" ||
    status === "archived" ||
    status === "pending_deletion"
  ) {
    return status;
  }

  return "active";
}

export async function GET(request: NextRequest) {
  try {
    const scope = request.nextUrl.searchParams.get("scope");

    await db.connect();

    if (scope !== "admin") {
      const languages = await Language.find()
        .sort({ createdAt: -1 })
        .populate({
          path: "createdBy",
          select: "name email",
          model: User,
        })
        .lean();

      return NextResponse.json({ languages }, { status: 200 });
    }

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const role = (session?.user as { role?: GlobalRole } | undefined)?.role;

    if (!session?.user) {
      return NextResponse.json(
        { error: "You must be signed in." },
        { status: 401 },
      );
    }

    if (role !== "admin" && role !== "staff") {
      return NextResponse.json(
        { error: "Admin or staff access is required." },
        { status: 403 },
      );
    }

    const languageDocuments = (await Language.find()
      .sort({ createdAt: -1 })
      .populate("createdBy", "name email")
      .lean()) as unknown as LanguageDocument[];

    const languages = languageDocuments.map((language) => ({
      _id: language._id.toString(),
      name: language.name || "Unnamed language",
      countries: Array.isArray(language.countries) ? language.countries : [],
      status: getSafeLanguageStatus(language.status),
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

    return NextResponse.json({ languages }, { status: 200 });
  } catch (error) {
    console.error("GET /api/languages error:", error);

    return NextResponse.json(
      { error: "Failed to fetch languages." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await db.connect();

    const session = await getSession();

    if (!session?.user?.email) {
      return NextResponse.json(
        {
          field: "general",
          message: "You need to sign in to add a new language.",
        },
        { status: 401 },
      );
    }

    const user = session.user as typeof session.user & UserType;
    const body = await request.json();

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const countries = Array.isArray(body.countries)
      ? body.countries
      : null;

    if (!name || !countries) {
      return NextResponse.json(
        {
          field: !name ? "name" : "countries",
          message: "Name and country/countries are required.",
        },
        { status: 400 },
      );
    }

    const cleanedCountries = countries
      .filter((country: unknown) => typeof country === "string")
      .map((country: string) => country.trim())
      .filter(Boolean);

    if (cleanedCountries.length === 0) {
      return NextResponse.json(
        {
          field: "countries",
          message: "At least one country is required.",
        },
        { status: 400 },
      );
    }

    for (const country of cleanedCountries) {
      if (/[;,/|]/.test(country) || country.includes(",")) {
        return NextResponse.json(
          {
            field: "countries",
            message:
              "Each country must be entered separately without punctuation.",
          },
          { status: 400 },
        );
      }
    }

    const existing = await Language.findOne({ name });

    if (existing) {
      return NextResponse.json(
        {
          field: "name",
          message: "A language with this name already exists.",
        },
        { status: 400 },
      );
    }

    const mongoUser = await User.findOne({
      email: user.email,
    }).select("_id");

    if (!mongoUser) {
      return NextResponse.json(
        {
          field: "general",
          message: "User not found in database.",
        },
        { status: 404 },
      );
    }

    const newLanguage = new Language({
      name,
      countries: cleanedCountries,
      createdBy: mongoUser._id,
    });

    await newLanguage.save();

    return NextResponse.json(
      {
        message: "Language created successfully.",
        language: newLanguage,
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("POST /api/languages error:", error);

    return NextResponse.json(
      {
        field: "general",
        message: error.message || "Failed to create language.",
      },
      { status: 500 },
    );
  }
}
