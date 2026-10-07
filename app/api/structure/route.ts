// app/api/structure/route.ts

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

const MAX_STRUCTURES_PER_LANGUAGE = 5;

const STRUCTURE_STATUSES = ["draft", "published", "archived"] as const;

const writingDirectionSet = new Set<string>(WRITING_DIRECTIONS);
const constituentSet = new Set<string>(CONSTITUENT_TYPES);
const structureStatusSet = new Set<string>(STRUCTURE_STATUSES);

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
  status: string,
) {
  if (!structureStatusSet.has(status)) {
    return "Structure status is invalid.";
  }

  const invalidWritingDirection = writingDirections.find(
    (direction) => !writingDirectionSet.has(direction),
  );

  if (invalidWritingDirection) {
    return "One or more writing directions are invalid.";
  }

  if (wordOrders.length > MAX_WORD_ORDERS_PER_LANGUAGE) {
    return `A structure can have a maximum of ${MAX_WORD_ORDERS_PER_LANGUAGE} word-order patterns.`;
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

export async function GET() {
  try {
    await db.connect();

    const languageStructures = await LanguageStructure.find()
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
      {
        languageStructures,
      },
      {
        status: 200,
      },
    );
  } catch (error: any) {
    console.error("Language structure GET error:", error);

    return NextResponse.json(
      {
        message:
          error.message || "Failed to fetch language structure details.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await db.connect();

    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        {
          message:
            "You need to log in to add language structure details.",
        },
        {
          status: 401,
        },
      );
    }

    const user = session.user as typeof session.user & UserType;

    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          message: "A valid request body is required.",
        },
        {
          status: 400,
        },
      );
    }

    const language =
      typeof body.language === "string" ? body.language.trim() : "";

    const writingDirections = sanitizeStringArray(
      body.writingDirections,
    );

    const wordOrders = sanitizeWordOrders(body.wordOrders);

    const status =
      typeof body.status === "string" && body.status.trim()
        ? body.status.trim()
        : "published";

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
      status,
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

    const structureCount = await LanguageStructure.countDocuments({
      language: languageDoc._id,
    });

    if (structureCount >= MAX_STRUCTURES_PER_LANGUAGE) {
      return NextResponse.json(
        {
          message: `A language can have a maximum of ${MAX_STRUCTURES_PER_LANGUAGE} structure records.`,
        },
        {
          status: 409,
        },
      );
    }

    const mongoUser = await User.findOne({
      email: user.email,
    });

    if (!mongoUser) {
      return NextResponse.json(
        {
          message: "User not found in database.",
        },
        {
          status: 404,
        },
      );
    }

    const languageStructure = await LanguageStructure.create({
      language: languageDoc._id,
      writingDirections,
      wordOrders,
      status,
      createdBy: mongoUser._id,
    });

    return NextResponse.json(
      {
        message: "Language structure details created successfully.",
        languageStructure,
      },
      {
        status: 201,
      },
    );
  } catch (error: any) {
    console.error("Language structure POST error:", error);

    return NextResponse.json(
      {
        message:
          error.message ||
          "Failed to create language structure details.",
      },
      {
        status: 500,
      },
    );
  }
}