// app/api/language-structure/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import db from "@/utils/db";
import LanguageStructure, {
  CONSTITUENT_TYPES,
  MAX_CONSTITUENTS_PER_WORD_ORDER,
  MAX_WORD_ORDERS_PER_LANGUAGE,
  WRITING_DIRECTIONS,
} from "@/models/LanguageStructure";
import User from "@/models/User";
import Language from "@/models/Language";
import { getSession } from "@/lib/server";
import { UserType } from "@/utils/types";

const writingDirectionSet = new Set<string>(WRITING_DIRECTIONS);
const constituentSet = new Set<string>(CONSTITUENT_TYPES);

type SanitizedWordOrder = {
  label: string;
  constituents: string[];
  notes: string;
};

function sanitizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];

  return [
    ...new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

function sanitizeWordOrders(value: unknown): SanitizedWordOrder[] {
  if (!Array.isArray(value)) return [];

  return value.map((item) => {
    const pattern =
      item && typeof item === "object"
        ? (item as Record<string, unknown>)
        : {};

    const constituents = Array.isArray(pattern.constituents)
      ? pattern.constituents
          .filter((part): part is string => typeof part === "string")
          .map((part) => part.trim())
          .filter(Boolean)
      : [];

    return {
      label:
        typeof pattern.label === "string"
          ? pattern.label.trim().slice(0, 100)
          : "",
      constituents,
      notes:
        typeof pattern.notes === "string"
          ? pattern.notes.trim().slice(0, 500)
          : "",
    };
  });
}

function getValidationMessage(
  writingDirections: string[],
  wordOrders: SanitizedWordOrder[],
) {
  const invalidWritingDirection = writingDirections.find(
    (direction) => !writingDirectionSet.has(direction),
  );

  if (invalidWritingDirection) {
    return "One or more writing directions are invalid.";
  }

  if (wordOrders.length > MAX_WORD_ORDERS_PER_LANGUAGE) {
    return `A language can have a maximum of ${MAX_WORD_ORDERS_PER_LANGUAGE} word-order patterns.`;
  }

  for (const wordOrder of wordOrders) {
    if (wordOrder.constituents.length === 0) {
      return "Every word-order pattern must include at least one constituent.";
    }

    if (
      wordOrder.constituents.length >
      MAX_CONSTITUENTS_PER_WORD_ORDER
    ) {
      return `Each word-order pattern can contain a maximum of ${MAX_CONSTITUENTS_PER_WORD_ORDER} constituents.`;
    }

    const invalidConstituent = wordOrder.constituents.find(
      (constituent) => !constituentSet.has(constituent),
    );

    if (invalidConstituent) {
      return "One or more sentence constituents are invalid.";
    }
  }

  return null;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    await db.connect();

    const languageStructure = await LanguageStructure.findById(id)
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

    if (!languageStructure) {
      return NextResponse.json(
        {
          message: "Language structure details not found.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json(
      {
        languageStructure,
      },
      {
        status: 200,
      },
    );
  } catch (error: any) {
    console.error("Language structure GET by ID error:", error);

    return NextResponse.json(
      {
        message:
          error.message ||
          "Something went wrong. Please try again.",
      },
      {
        status: 500,
      },
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
          message: "You must be signed in to continue.",
        },
        {
          status: 401,
        },
      );
    }

    const user = session.user as typeof session.user & UserType;
    const body = await request.json();

    const language =
      typeof body.language === "string" ? body.language.trim() : "";

    const writingDirections = sanitizeStringArray(
      body.writingDirections,
    );

    const wordOrders = sanitizeWordOrders(body.wordOrders);

    if (!language) {
      return NextResponse.json(
        {
          message: "Language is required.",
        },
        {
          status: 400,
        },
      );
    }

    const validationMessage = getValidationMessage(
      writingDirections,
      wordOrders,
    );

    if (validationMessage) {
      return NextResponse.json(
        {
          message: validationMessage,
        },
        {
          status: 400,
        },
      );
    }

    const mongoUser = await User.findOne({
      email: user.email,
    });

    if (!mongoUser) {
      return NextResponse.json(
        {
          message: "User not found.",
        },
        {
          status: 404,
        },
      );
    }

    const languageStructure =
      await LanguageStructure.findById(id);

    if (!languageStructure) {
      return NextResponse.json(
        {
          message: "Language structure details not found.",
        },
        {
          status: 404,
        },
      );
    }

    const languageDoc = await Language.findById(language).select(
      "_id name",
    );

    if (!languageDoc) {
      return NextResponse.json(
        {
          message: "Language not found.",
        },
        {
          status: 404,
        },
      );
    }


    languageStructure.language = languageDoc._id;
    languageStructure.writingDirections = writingDirections;
    languageStructure.wordOrders = wordOrders;
    languageStructure.lastUpdatedBy = mongoUser._id;

    if (body.status !== undefined) {
      languageStructure.status = body.status;
    }

    await languageStructure.save();

    const updatedLanguageStructure =
      await LanguageStructure.findById(
        languageStructure._id,
      )
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
        message: "Language structure details updated.",
        languageStructure: updatedLanguageStructure,
      },
      {
        status: 200,
      },
    );
  } catch (error: any) {
    console.error("Language structure PUT error:", error);

    return NextResponse.json(
      {
        message:
          error.message ||
          "Something went wrong. Please try again.",
      },
      {
        status: 500,
      },
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
          message: "You must be signed in to continue.",
        },
        {
          status: 401,
        },
      );
    }

    const deletedLanguageStructure =
      await LanguageStructure.findByIdAndDelete(id);

    if (!deletedLanguageStructure) {
      return NextResponse.json(
        {
          message: "Language structure details not found.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json(
      {
        message: "Language structure details deleted.",
      },
      {
        status: 200,
      },
    );
  } catch (error: any) {
    console.error("Language structure DELETE error:", error);

    return NextResponse.json(
      {
        message:
          error.message ||
          "Something went wrong. Please try again.",
      },
      {
        status: 500,
      },
    );
  }
}