// app/api/structure/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
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

const MAX_STRUCTURES_PER_LANGUAGE = 5;

const STRUCTURE_STATUSES = [
  "draft",
  "publish",
 
] as const;

const writingDirectionSet = new Set<string>(WRITING_DIRECTIONS);
const constituentSet = new Set<string>(CONSTITUENT_TYPES);
const structureStatusSet = new Set<string>(STRUCTURE_STATUSES);

type RouteContext = {
  params: Promise<{ id: string }>;
};

type SanitizedWordOrder = {
  label: string;
  constituents: string[];
  notes: string;
};

const hasStructureManagementPermission = (
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

function sanitizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

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
  if (!Array.isArray(value)) {
    return [];
  }

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
): string | null {
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
      wordOrder.constituents.length > MAX_CONSTITUENTS_PER_WORD_ORDER
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

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Error) {
    return error.message || fallbackMessage;
  }

  return fallbackMessage;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid language structure ID." },
        { status: 400 },
      );
    }

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
        { message: "Language structure details not found." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { languageStructure },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("Language structure GET by ID error:", error);

    return NextResponse.json(
      {
        message: getErrorMessage(
          error,
          "Failed to fetch language structure details.",
        ),
      },
      { status: 500 },
    );
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
        { message: "Please sign in to edit language structure details." },
        { status: 401 },
      );
    }

    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid language structure ID." },
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

    const languageStructure = await LanguageStructure.findById(id);

    if (!languageStructure) {
      return NextResponse.json(
        { message: "Language structure details not found." },
        { status: 404 },
      );
    }

    const canEdit = hasStructureManagementPermission(
      mongoUser._id,
      mongoUser.role,
      languageStructure.createdBy,
    );

    if (!canEdit) {
      return NextResponse.json(
        {
          message:
            "Only this language structure's creator, an admin, or root can edit it.",
        },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { message: "A valid request body is required." },
        { status: 400 },
      );
    }

    const language =
      typeof body.language === "string" ? body.language.trim() : "";

    const writingDirections = sanitizeStringArray(body.writingDirections);
    const wordOrders = sanitizeWordOrders(body.wordOrders);

    const status =
      typeof body.status === "string" && body.status.trim()
        ? body.status.trim()
        : languageStructure.status;

    if (!language || !Types.ObjectId.isValid(language)) {
      return NextResponse.json(
        { message: "A valid language is required." },
        { status: 400 },
      );
    }

    const validationMessage = getValidationMessage(
      writingDirections,
      wordOrders,
      status,
    );

    if (validationMessage) {
      return NextResponse.json(
        { message: validationMessage },
        { status: 400 },
      );
    }

    const languageDoc = await Language.findById(language).select("_id name");

    if (!languageDoc) {
      return NextResponse.json(
        { message: "Language not found." },
        { status: 404 },
      );
    }

    // Moving this record to another language must not exceed that language's limit.
    if (
      languageStructure.language.toString() !== languageDoc._id.toString()
    ) {
      const destinationCount = await LanguageStructure.countDocuments({
        language: languageDoc._id,
        _id: { $ne: languageStructure._id },
      });

      if (destinationCount >= MAX_STRUCTURES_PER_LANGUAGE) {
        return NextResponse.json(
          {
            message:
              `A language can have a maximum of ${MAX_STRUCTURES_PER_LANGUAGE} structure records.`,
          },
          { status: 409 },
        );
      }
    }

    languageStructure.language = languageDoc._id;
    languageStructure.writingDirections = writingDirections;
    languageStructure.wordOrders = wordOrders;
    languageStructure.status = status;
    languageStructure.lastUpdatedBy = mongoUser._id;

    // Do not modify createdBy; it is the ownership field.
    await languageStructure.save();

    const updatedLanguageStructure = await LanguageStructure.findById(
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
        message: "Language structure details updated successfully.",
        languageStructure: updatedLanguageStructure,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("Language structure PUT error:", error);

    return NextResponse.json(
      {
        message: getErrorMessage(
          error,
          "Failed to update language structure details.",
        ),
      },
      { status: 500 },
    );
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
        { message: "Please sign in to delete language structure details." },
        { status: 401 },
      );
    }

    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid language structure ID." },
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

    const languageStructure = await LanguageStructure.findById(id).select(
      "createdBy",
    );

    if (!languageStructure) {
      return NextResponse.json(
        { message: "Language structure details not found." },
        { status: 404 },
      );
    }

    const canDelete = hasStructureManagementPermission(
      mongoUser._id,
      mongoUser.role,
      languageStructure.createdBy,
    );

    if (!canDelete) {
      return NextResponse.json(
        {
          message:
            "Only this language structure's creator, an admin, or root can delete it.",
        },
        { status: 403 },
      );
    }

    await LanguageStructure.findByIdAndDelete(id);

    return NextResponse.json(
      { message: "Language structure details deleted successfully." },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("Language structure DELETE error:", error);

    return NextResponse.json(
      {
        message: getErrorMessage(
          error,
          "Failed to delete language structure details.",
        ),
      },
      { status: 500 },
    );
  }
}