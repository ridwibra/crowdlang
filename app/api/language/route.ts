// app/api/language/route.ts
import { NextRequest, NextResponse } from "next/server";
import db from "@/utils/db";
import Language from "@/models/Language";
import User from "@/models/User";
import { getSession } from "@/lib/server";
import { UserType } from "@/utils/types";

export async function GET() {
  try {
    await db.connect();

    const languages = await Language.find()
      .sort({ createdAt: -1 })
      .populate({ path: "createdBy", select: "name email", model: User })
      .lean();
console.log(languages)
    return NextResponse.json({ languages }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to fetch languages" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await db.connect();

    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { field: "general", message: "You need to sign in to add a new language" },
        { status: 401 }
      );
    }

    const user = session.user as typeof session.user & UserType;
    const { name, countries } = await request.json();

    // Required fields
    if (!name || !countries || !Array.isArray(countries)) {
      return NextResponse.json(
        {
          field: !name ? "name" : "countries",
          message: "Name and country/countries are required."
        },
        { status: 400 }
      );
    }

    // Country punctuation validation
    for (const c of countries) {
      const trimmed = c.trim();
      if (/[;,/|]/.test(trimmed) || trimmed.includes(",")) {
        return NextResponse.json(
          {
            field: "countries",
            message: "Each country must be entered separately without punctuation."
          },
          { status: 400 }
        );
      }
    }

    // Duplicate name validation
    const existing = await Language.findOne({ name });
    if (existing) {
      return NextResponse.json(
        {
          field: "name",
          message: "A language with this name already exists."
        },
        { status: 400 }
      );
    }

    const mongoUser = await User.findOne({ email: user.email });
    if (!mongoUser) {
      return NextResponse.json(
        { field: "general", message: "User not found in database" },
        { status: 404 }
      );
    }

    const newLanguage = new Language({
      name,
      countries,
      createdBy: mongoUser._id,
    });

    await newLanguage.save();

    return NextResponse.json(
      { message: "Language created successfully.", language: newLanguage },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { field: "general", message: error.message || "Failed to create language" },
      { status: 500 }
    );
  }
}
