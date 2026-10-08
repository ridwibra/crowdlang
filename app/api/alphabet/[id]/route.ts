// app/api/alphabet/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import db from "@/utils/db";
import Alphabet from "@/models/Alphabet";
import User from "@/models/User";
import Language from "@/models/Language";
import { getSession } from "@/lib/server";

const MAX_ALPHABETS_PER_LANGUAGE = 5;
const ALPHABET_STATUSES = ["draft", "published", "archived"];

type RouteContext = {
  params: Promise<{ id: string }>;
};

const hasAlphabetManagementPermission = (
  currentUserId: Types.ObjectId,
  currentUserRole: string,
  createdBy: Types.ObjectId | string | null | undefined,
): boolean => {
  if (currentUserRole === "admin" || currentUserRole === "root") {
    return true;
  }

  if (createdBy === null || createdBy === undefined) {
    return false;
  }

  return currentUserId.toString() === createdBy.toString();
};

function errorResponse(error: unknown, fallback: string) {
  const name = error instanceof Error ? error.name : "";

  const status =
    error instanceof SyntaxError ||
    name === "ValidationError" ||
    name === "CastError"
      ? 400
      : 500;

  return NextResponse.json(
    {
      message: status === 400 && error instanceof Error
        ? error.message
        : fallback,
    },
    { status },
  );
}

export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid alphabet ID." },
        { status: 400 },
      );
    }

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

    return NextResponse.json({ alphabet }, { status: 200 });
  } catch (error: unknown) {
    console.error("Alphabet GET error:", error);
    return errorResponse(error, "Failed to fetch alphabet.");
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const session = await getSession();

    if (!session?.user?.email) {
      return NextResponse.json(
        { message: "Please sign in to edit an alphabet." },
        { status: 401 },
      );
    }

    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid alphabet ID." },
        { status: 400 },
      );
    }

    await db.connect();

    const mongoUser = await User.findOne({
      email: session.user.email,
    }).select("_id role");

    if (!mongoUser) {
      return NextResponse.json(
        { message: "User not found in database." },
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

    if (
      !hasAlphabetManagementPermission(
        mongoUser._id,
        mongoUser.role,
        alphabet.createdBy,
      )
    ) {
      return NextResponse.json(
        {
          message:
            "Only this alphabet's creator, an admin, or root can edit it.",
        },
        { status: 403 },
      );
    }

    const body = await request.json();

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      typeof body.language !== "string" ||
      !Types.ObjectId.isValid(body.language) ||
      !Array.isArray(body.letters) ||
      body.letters.length === 0
    ) {
      return NextResponse.json(
        {
          message:
            "A valid language and at least one alphabet letter are required.",
        },
        { status: 400 },
      );
    }

    if (
      body.status !== undefined &&
      !ALPHABET_STATUSES.includes(body.status)
    ) {
      return NextResponse.json(
        { message: "Invalid alphabet status." },
        { status: 400 },
      );
    }

    const hasInvalidLetter = body.letters.some(
      (letter: any) =>
        !letter ||
        typeof letter !== "object" ||
        typeof letter.character !== "string" ||
        !letter.character.trim() ||
        (letter.ipa !== undefined && typeof letter.ipa !== "string") ||
        (letter.audioUrl !== undefined &&
          typeof letter.audioUrl !== "string"),
    );

    if (hasInvalidLetter) {
      return NextResponse.json(
        {
          message:
            "Every letter must include a character. IPA and audio URL must be strings when supplied.",
        },
        { status: 400 },
      );
    }

    const languageDoc = await Language.findById(body.language).select("_id");

    if (!languageDoc) {
      return NextResponse.json(
        { message: "Language not found." },
        { status: 404 },
      );
    }

    // Moving an alphabet must respect the destination language's limit.
    if (alphabet.language.toString() !== languageDoc._id.toString()) {
      const alphabetCount = await Alphabet.countDocuments({
        language: languageDoc._id,
        _id: { $ne: alphabet._id },
      });

      if (alphabetCount >= MAX_ALPHABETS_PER_LANGUAGE) {
        return NextResponse.json(
          {
            message:
              `A language can have a maximum of ${MAX_ALPHABETS_PER_LANGUAGE} alphabets.`,
          },
          { status: 400 },
        );
      }
    }

    const rebuiltLetters = body.letters.map(
      (letter: {
        character: string;
        ipa?: string;
        audioUrl?: string;
      }, index: number) => ({
        character: letter.character.trim(),
        order: index + 1,
        ipa: (letter.ipa ?? "").trim(),
        audioUrl: (letter.audioUrl ?? "").trim(),
      }),
    );

    if (body.name !== undefined) {
      alphabet.name =
        typeof body.name === "string" ? body.name.trim() : "";
    }

    alphabet.language = languageDoc._id;
    alphabet.letters = rebuiltLetters;
    alphabet.lastUpdatedBy = mongoUser._id;

    if (body.status !== undefined) {
      alphabet.status = body.status;
    }

    // createdBy is intentionally never changed.
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
        message: "Alphabet updated successfully.",
        alphabet: updatedAlphabet,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("Alphabet PUT error:", error);
    return errorResponse(error, "Failed to update alphabet.");
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const session = await getSession();

    if (!session?.user?.email) {
      return NextResponse.json(
        { message: "Please sign in to delete an alphabet." },
        { status: 401 },
      );
    }

    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid alphabet ID." },
        { status: 400 },
      );
    }

    await db.connect();

    const mongoUser = await User.findOne({
      email: session.user.email,
    }).select("_id role");

    if (!mongoUser) {
      return NextResponse.json(
        { message: "User not found in database." },
        { status: 404 },
      );
    }

    const alphabet = await Alphabet.findById(id).select("createdBy");

    if (!alphabet) {
      return NextResponse.json(
        { message: "Alphabet not found." },
        { status: 404 },
      );
    }

    if (
      !hasAlphabetManagementPermission(
        mongoUser._id,
        mongoUser.role,
        alphabet.createdBy,
      )
    ) {
      return NextResponse.json(
        {
          message:
            "Only this alphabet's creator, an admin, or root can delete it.",
        },
        { status: 403 },
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
      { message: "Alphabet deleted successfully." },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("Alphabet DELETE error:", error);
    return errorResponse(error, "Failed to delete alphabet.");
  }
}