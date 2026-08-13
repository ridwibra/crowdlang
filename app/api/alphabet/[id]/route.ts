import { NextRequest, NextResponse } from "next/server";
import db from "@/utils/db";
import Alphabet from "@/models/Alphabet";
import User from "@/models/User";
import Language from "@/models/Language";
import { getSession } from "@/lib/server";
import { UserType } from "@/utils/types";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    await db.connect();

    const alphabet = await Alphabet.findById(id)
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
      .lean();

    if (!alphabet) {
      return NextResponse.json(
        { message: "Alphabet not found." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { alphabet },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Alphabet GET error:", error);

    return NextResponse.json(
      {
        message:
          error.message ||
          "Something went wrong. Please try again.",
      },
      { status: 500 },
    );
  } 
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    await db.connect();

    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          message:
            "You must be signed in to continue.",
        },
        { status: 401 },
      );
    }

    const user = session.user as typeof session.user & UserType;
    const body = await request.json();

    if (
      !body.name ||
      typeof body.name !== "string" ||
      !body.name.trim() ||
      !body.language ||
      !Array.isArray(body.letters)
    ) {
      return NextResponse.json(
        {
          message:
            "Name, language, and letters are required.",
        },
        { status: 400 },
      );
    }

    const mongoUser = await User.findOne({
      email: user.email,
    });

    if (!mongoUser) {
      return NextResponse.json(
        { message: "User not found." },
        { status: 404 },
      );
    }

    const alphabet = await Alphabet.findById(id);

    if (!alphabet) {
      return NextResponse.json(
        { message: "Alphabet not found." },
        { status: 404 },
      );
    }

    const languageDoc = await Language.findById(body.language).select(
      "_id",
    );

    if (!languageDoc) {
      return NextResponse.json(
        { message: "Language not found." },
        { status: 404 },
      );
    }

    const rebuiltLetters = body.letters.map(
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

    alphabet.name = body.name.trim();
    alphabet.language = languageDoc._id;
    alphabet.letters = rebuiltLetters;
    alphabet.lastUpdatedBy = mongoUser._id;

    if (body.status !== undefined) {
      alphabet.status = body.status;
    }

    await alphabet.save();

    const updatedAlphabet = await Alphabet.findById(alphabet._id)
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
      .lean();

    return NextResponse.json(
      {
        message: "Alphabet updated.",
        alphabet: updatedAlphabet,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Alphabet PUT error:", error);

    return NextResponse.json(
      {
        message:
          error.message ||
          "Something went wrong. Please try again.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    await db.connect();

    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          message:
            "You must be signed in to continue.",
        },
        { status: 401 },
      );
    }

    const deletedAlphabet = await Alphabet.findByIdAndDelete(id);

    if (!deletedAlphabet) {
      return NextResponse.json(
        { message: "Alphabet not found." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: "Alphabet deleted." },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Alphabet DELETE error:", error);

    return NextResponse.json(
      {
        message:
          error.message ||
          "Something went wrong. Please try again.",
      },
      { status: 500 },
    );
  } 
}