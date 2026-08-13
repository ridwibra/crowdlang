import { NextRequest, NextResponse } from "next/server";
import db from "@/utils/db";
import Alphabet from "@/models/Alphabet";
import User from "@/models/User";
import Language from "@/models/Language";
import { getSession } from "@/lib/server";
import { UserType } from "@/utils/types";

const MAX_ALPHABETS_PER_LANGUAGE = 5;

export async function GET() {
  try {
    await db.connect();

    const alphabets = await Alphabet.find()
      .populate({
        path: "createdBy",
        select: "name email",
        model: User,
      })
      .populate({
        path: "lastUpdatedBy",
        select: "name email",
        model: User,
      })
      .populate({
        path: "language",
        select: "name",
        model: Language,
      })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(
      { alphabets },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        message: error.message || "Failed to fetch alphabets.",
      },
      { status: 500 },
    );
  } 
}

export async function POST(request: NextRequest) {
  try {
    await db.connect();

    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized." },
        { status: 401 },
      );
    }

    const user = session.user as typeof session.user & UserType;

    const { name, language, letters, status } = await request.json();

    if (
      !name ||
      typeof name !== "string" ||
      !name.trim() ||
      !language ||
      !letters ||
      !Array.isArray(letters)
    ) {
      return NextResponse.json(
        {
          message:
            "Name, language, and letters are required.",
        },
        { status: 400 },
      );
    }

    const languageDoc = await Language.findById(language).select(
      "_id name",
    );

    if (!languageDoc) {
      return NextResponse.json(
        { message: "Language not found." },
        { status: 404 },
      );
    }

    const alphabetCount = await Alphabet.countDocuments({
      language: languageDoc._id,
    });

    if (alphabetCount >= MAX_ALPHABETS_PER_LANGUAGE) {
      return NextResponse.json(
        {
          message: `A language can have a maximum of ${MAX_ALPHABETS_PER_LANGUAGE} alphabets.`,
        },
        { status: 400 },
      );
    }

    const mongoUser = await User.findOne({
      email: user.email,
    });

    if (!mongoUser) {
      return NextResponse.json(
        { message: "User not found in database." },
        { status: 404 },
      );
    }

    const rebuiltLetters = letters.map(
      (letter: any, index: number) => ({
        character: String(letter.character || "").trim(),
        order: index + 1,
        ipa: String(letter.ipa || "").trim(),
        audioUrl: String(letter.audioUrl || "").trim(),
      }),
    );

    const invalidLetter = rebuiltLetters.find(
      (letter: { character: string }) => !letter.character,
    );

    if (invalidLetter) {
      return NextResponse.json(
        {
          message:
            "Every alphabet letter must include a character.",
        },
        { status: 400 },
      );
    }

    const alphabet = await Alphabet.create({
      name: name.trim(),
      language: languageDoc._id,
      letters: rebuiltLetters,
      status,
      createdBy: mongoUser._id,
    });

    return NextResponse.json(
      {
        message: "Alphabet created successfully.",
        alphabet,
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Alphabet POST error:", error);

    return NextResponse.json(
      {
        message:
          error.message || "Failed to create alphabet.",
      },
      { status: 500 },
    );
  } 
}