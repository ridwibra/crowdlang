// app/api/languages/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import db from "@/utils/db";
import Language from "@/models/Language";
import User from "@/models/User";
import { getSession } from "@/lib/server";

type EditableLanguageStatus = "active" | "archived";

type ProposedLanguageChanges = {
  name?: string;
  countries?: string[];
  status?: EditableLanguageStatus;
};

type LanguageRolesValue =
  | Map<string, string>
  | Record<string, string>
  | {
      get?: (key: string) => string | undefined;
      entries?: () => IterableIterator<[string, string]>;
    }
  | undefined;

type EditAction = "approve_edit" | "refuse_edit";

function getLanguageRole(
  languageRoles: LanguageRolesValue,
  languageName: string,
) {
  if (!languageRoles) {
    return undefined;
  }

  if (
    typeof languageRoles === "object" &&
    "get" in languageRoles &&
    typeof languageRoles.get === "function"
  ) {
    return languageRoles.get(languageName);
  }

  return (languageRoles as Record<string, string>)[languageName];
}

function getLanguageRolesObject(
  languageRoles: LanguageRolesValue,
): Record<string, string> {
  if (!languageRoles) {
    return {};
  }

  if (
    typeof languageRoles === "object" &&
    "entries" in languageRoles &&
    typeof languageRoles.entries === "function"
  ) {
    return Object.fromEntries(languageRoles.entries());
  }

  return { ...(languageRoles as Record<string, string>) };
}

function getRequestNote(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await db.connect();

    const { id } = await context.params;
    const scope = request.nextUrl.searchParams.get("scope");

    if (scope !== "workspace") {
      const language = await Language.findById(id)
        .select("-editRequest -deletionRequest")
        .populate({
          path: "createdBy",
          select: "name email",
          model: User,
        })
        .lean();

      if (!language) {
        return NextResponse.json(
          { field: "general", message: "Language not found" },
          { status: 404 },
        );
      }

      return NextResponse.json({ language }, { status: 200 });
    }

    const session = await getSession();

    if (!session?.user?.email) {
      return NextResponse.json(
        {
          error: "You must be signed in to access the language workspace.",
        },
        { status: 401 },
      );
    }

    const [mongoUser, language] = await Promise.all([
      User.findOne({ email: session.user.email }).select(
        "_id languageRoles",
      ),
      Language.findById(id)
        .populate({
          path: "createdBy",
          select: "name email",
          model: User,
        })
        .populate({
          path: "editRequest.requestedBy",
          select: "name email",
          model: User,
        }),
    ]);

    if (!mongoUser) {
      return NextResponse.json(
        { error: "User not found in database." },
        { status: 404 },
      );
    }

    if (!language) {
      return NextResponse.json(
        { error: "Language not found." },
        { status: 404 },
      );
    }

    const currentUserId = mongoUser._id.toString();

    const creatorId =
      language.createdBy &&
      typeof language.createdBy === "object" &&
      "_id" in language.createdBy
        ? language.createdBy._id?.toString()
        : language.createdBy?.toString();

    const languageRole = getLanguageRole(
      mongoUser.languageRoles as LanguageRolesValue,
      language.name,
    );

    const isCreator = currentUserId === creatorId;
    const isEditor = languageRole === "editor";
    const isExpert = languageRole === "expert";

    const canAccessWorkspace = isCreator || isEditor || isExpert;

    if (!canAccessWorkspace) {
      return NextResponse.json(
        {
          error:
            "You do not have authority to access this language workspace.",
        },
        { status: 403 },
      );
    }

    const currentUserRole = isCreator
      ? "creator"
      : isExpert
        ? "expert"
        : "editor";

    return NextResponse.json(
      {
        language,
        currentUserRole,
        canReviewEdit: canAccessWorkspace,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("GET /api/languages/[id] error:", error);

    return NextResponse.json(
      {
        error:
          error.message || "Failed to fetch language workspace information.",
      },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await db.connect();

    const session = await getSession();

    if (!session?.user?.email) {
      return NextResponse.json(
        {
          field: "general",
          message: "You are not signed in. Sign in and try again.",
        },
        { status: 401 },
      );
    }

    const { id } = await context.params;
    const body = await request.json();

    const mongoUser = await User.findOne({
      email: session.user.email,
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

    const language = await Language.findById(id);

    if (!language) {
      return NextResponse.json(
        {
          field: "general",
          message: "Language not found.",
        },
        { status: 404 },
      );
    }

    if (language.status === "pending_deletion") {
      return NextResponse.json(
        {
          field: "general",
          message:
            "This language is pending deletion and cannot receive edit requests until the deletion request is resolved.",
        },
        { status: 409 },
      );
    }

    const currentUserId = mongoUser._id.toString();

    const existingEditRequesterId =
      language.editRequest?.requestedBy?.toString();

    const isUpdatingOwnEditRequest =
      Boolean(existingEditRequesterId) &&
      existingEditRequesterId === currentUserId;

    if (
      existingEditRequesterId &&
      existingEditRequesterId !== currentUserId
    ) {
      return NextResponse.json(
        {
          field: "general",
          message:
            "This language already has a pending edit request from another user. It must be approved or refused before you can submit an edit request.",
        },
        { status: 409 },
      );
    }

    const proposedChanges: ProposedLanguageChanges = {};

    if (typeof body.name === "string") {
      const name = body.name.trim();

      if (!name) {
        return NextResponse.json(
          {
            field: "name",
            message: "Language name cannot be empty.",
          },
          { status: 400 },
        );
      }

      proposedChanges.name = name;
    }

    if (Array.isArray(body.countries)) {
      const countries = body.countries
        .filter((country: unknown) => typeof country === "string")
        .map((country: string) => country.trim())
        .filter(Boolean);

      if (countries.length === 0) {
        return NextResponse.json(
          {
            field: "countries",
            message: "At least one country is required.",
          },
          { status: 400 },
        );
      }

      for (const country of countries) {
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

      proposedChanges.countries = countries;
    }

    if (body.status === "active" || body.status === "archived") {
      proposedChanges.status = body.status;
    }

    if (Object.keys(proposedChanges).length === 0) {
      return NextResponse.json(
        {
          field: "general",
          message:
            "Provide at least one valid editable field: name, countries, or status.",
        },
        { status: 400 },
      );
    }

    const requestNote = getRequestNote(body.requestNote);

    if (requestNote.length > 1000) {
      return NextResponse.json(
        {
          field: "requestNote",
          message: "Edit request note cannot exceed 1000 characters.",
        },
        { status: 400 },
      );
    }

    /*
     * Important:
     * Keep prior pending changes from the same requester.
     *
     * Example:
     * Existing: { countries: ["France", "Belgium"] }
     * New:      { name: "French" }
     * Saved:    { countries: ["France", "Belgium"], name: "French" }
     */
    const existingProposedChanges: ProposedLanguageChanges =
      language.editRequest?.proposedChanges || {};

    const mergedProposedChanges: ProposedLanguageChanges = {
      ...existingProposedChanges,
      ...proposedChanges,
    };

    if (
      mergedProposedChanges.name &&
      mergedProposedChanges.name.toLowerCase() !== language.name.toLowerCase()
    ) {
      const existingLanguage = await Language.findOne({
        _id: { $ne: language._id },
        name: mergedProposedChanges.name,
      });

      if (existingLanguage) {
        return NextResponse.json(
          {
            field: "name",
            message: "A language with this name already exists.",
          },
          { status: 400 },
        );
      }
    }

    const updatedLanguage = await Language.findOneAndUpdate(
      {
        _id: language._id,
        status: { $in: ["active", "archived"] },
        $or: [
          {
            "editRequest.requestedBy": {
              $exists: false,
            },
          },
          {
            "editRequest.requestedBy": mongoUser._id,
          },
        ],
      },
      {
        $set: {
          editRequest: {
            requestedBy: mongoUser._id,

            /*
             * Do not reset the request's starting date every time
             * the same requester adds another proposed change.
             */
            requestedAt: language.editRequest?.requestedAt || new Date(),

            /*
             * This is the actual fix:
             * save the merged collection rather than only the newest edit.
             */
            proposedChanges: mergedProposedChanges,

            /*
             * Preserve the existing note unless the requester provides
             * a new non-empty note.
             */
            requestNote:
              requestNote || language.editRequest?.requestNote || undefined,
          },
        },
      },
      {
        new: true,
        runValidators: true,
      },
    )
      .populate({
        path: "createdBy",
        select: "name email",
        model: User,
      })
      .populate({
        path: "editRequest.requestedBy",
        select: "name email",
        model: User,
      })
      .lean();

    if (!updatedLanguage) {
      return NextResponse.json(
        {
          field: "general",
          message:
            "The language changed or another user submitted an edit request before your request could be saved. Refresh and try again.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        message: isUpdatingOwnEditRequest
          ? "Your pending language edit request was updated. All proposed changes are saved and awaiting approval."
          : "Language edit request submitted. The language will not change until the request is approved.",
        language: updatedLanguage,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("PUT /api/languages/[id] error:", error);

    return NextResponse.json(
      {
        field: "general",
        message:
          error.message || "Failed to submit the language edit request.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await db.connect();

    const session = await getSession();

    if (!session?.user?.email) {
      return NextResponse.json(
        {
          field: "general",
          message: "You are not signed in. Sign in and try again.",
        },
        { status: 401 },
      );
    }

    const { id } = await context.params;
    const body = await request.json();

    const action =
      typeof body.action === "string" ? body.action.trim() : "";

    if (action !== "approve_edit" && action !== "refuse_edit") {
      return NextResponse.json(
        {
          field: "action",
          message:
            'Action must be either "approve_edit" or "refuse_edit".',
        },
        { status: 400 },
      );
    }

    const [mongoUser, language] = await Promise.all([
      User.findOne({ email: session.user.email }).select(
        "_id languageRoles",
      ),
      Language.findById(id),
    ]);

    if (!mongoUser) {
      return NextResponse.json(
        {
          field: "general",
          message: "User not found in database.",
        },
        { status: 404 },
      );
    }

    if (!language) {
      return NextResponse.json(
        {
          field: "general",
          message: "Language not found.",
        },
        { status: 404 },
      );
    }

    if (!language.editRequest?.requestedBy) {
      return NextResponse.json(
        {
          field: "general",
          message: "This language does not have a pending edit request.",
        },
        { status: 409 },
      );
    }

    if (language.status === "pending_deletion") {
      return NextResponse.json(
        {
          field: "general",
          message:
            "This language is pending deletion and its edit request cannot be reviewed.",
        },
        { status: 409 },
      );
    }

    const reviewerId = mongoUser._id.toString();
    const requesterId = language.editRequest.requestedBy.toString();

    if (reviewerId === requesterId) {
      return NextResponse.json(
        {
          field: "general",
          message: "You cannot approve or refuse your own edit request.",
        },
        { status: 403 },
      );
    }

    const creatorId = language.createdBy.toString();

    const languageRole = getLanguageRole(
      mongoUser.languageRoles as LanguageRolesValue,
      language.name,
    );

    const isCreator = reviewerId === creatorId;
    const isEditor = languageRole === "editor";
    const isExpert = languageRole === "expert";

    const canReviewEdit = isCreator || isEditor || isExpert;

    if (!canReviewEdit) {
      return NextResponse.json(
        {
          field: "general",
          message:
            "Only the language creator, a language editor, or a language expert can review this edit request.",
        },
        { status: 403 },
      );
    }

    if (action === "refuse_edit") {
      const refusedLanguage = await Language.findOneAndUpdate(
        {
          _id: language._id,
          "editRequest.requestedBy": language.editRequest.requestedBy,
        },
        {
          $unset: {
            editRequest: 1,
          },
        },
        {
          new: true,
        },
      ).lean();

      if (!refusedLanguage) {
        return NextResponse.json(
          {
            field: "general",
            message:
              "The edit request changed before it could be refused. Refresh and try again.",
          },
          { status: 409 },
        );
      }

      return NextResponse.json(
        {
          message:
            "Language edit request refused. The language was not changed.",
          language: refusedLanguage,
        },
        { status: 200 },
      );
    }

    const proposedChanges = language.editRequest.proposedChanges || {};

    if (Object.keys(proposedChanges).length === 0) {
      return NextResponse.json(
        {
          field: "general",
          message:
            "This edit request has no proposed changes and cannot be approved.",
        },
        { status: 409 },
      );
    }

    const oldLanguageName = language.name;
    const proposedLanguageName = proposedChanges.name?.trim();

    if (
      proposedLanguageName &&
      proposedLanguageName.toLowerCase() !== oldLanguageName.toLowerCase()
    ) {
      const duplicateLanguage = await Language.findOne({
        _id: { $ne: language._id },
        name: proposedLanguageName,
      });

      if (duplicateLanguage) {
        return NextResponse.json(
          {
            field: "name",
            message:
              "This edit request cannot be approved because a language with the proposed name already exists.",
          },
          { status: 409 },
        );
      }
    }

    const approvedLanguage = await Language.findOneAndUpdate(
      {
        _id: language._id,
        status: { $in: ["active", "archived"] },
        "editRequest.requestedBy": language.editRequest.requestedBy,
      },
      {
        $set: proposedChanges,
        $unset: {
          editRequest: 1,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    )
      .populate({
        path: "createdBy",
        select: "name email",
        model: User,
      })
      .lean();

    if (!approvedLanguage) {
      return NextResponse.json(
        {
          field: "general",
          message:
            "The language or edit request changed before approval. Refresh and try again.",
        },
        { status: 409 },
      );
    }

    if (
      proposedLanguageName &&
      proposedLanguageName !== oldLanguageName
    ) {
      const usersWithOldLanguageRole = await User.find({
        [`languageRoles.${oldLanguageName}`]: {
          $in: ["editor", "expert"],
        },
      }).select("_id languageRoles");

      await Promise.all(
        usersWithOldLanguageRole.map(async (user) => {
          const languageRoles = getLanguageRolesObject(
            user.languageRoles as LanguageRolesValue,
          );

          const oldRole = languageRoles[oldLanguageName];

          if (oldRole !== "editor" && oldRole !== "expert") {
            return;
          }

          languageRoles[proposedLanguageName] = oldRole;
          delete languageRoles[oldLanguageName];

          await User.findByIdAndUpdate(
            user._id,
            {
              $set: {
                languageRoles,
              },
            },
            {
              runValidators: true,
            },
          );
        }),
      );
    }

    return NextResponse.json(
      {
        message: "Language edit request approved. Changes are now live.",
        language: approvedLanguage,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("PATCH /api/languages/[id] error:", error);

    return NextResponse.json(
      {
        field: "general",
        message:
          error.message || "Failed to process the language edit request.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await db.connect();

    const session = await getSession();

    if (!session?.user?.email) {
      return NextResponse.json(
        {
          field: "general",
          message: "You are not signed in. Sign in and try again.",
        },
        { status: 401 },
      );
    }

    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));

    const requestNote = getRequestNote(body.requestNote);

    if (requestNote.length > 1000) {
      return NextResponse.json(
        {
          field: "requestNote",
          message: "Deletion request note cannot exceed 1000 characters.",
        },
        { status: 400 },
      );
    }

    const mongoUser = await User.findOne({
      email: session.user.email,
    }).select("_id languageRoles");

    if (!mongoUser) {
      return NextResponse.json(
        {
          field: "general",
          message: "User not found in database.",
        },
        { status: 404 },
      );
    }

    const language = await Language.findById(id);

    if (!language) {
      return NextResponse.json(
        {
          field: "general",
          message: "Language not found.",
        },
        { status: 404 },
      );
    }

    if (language.status === "pending_deletion") {
      return NextResponse.json(
        {
          field: "general",
          message: "This language already has a pending deletion request.",
        },
        { status: 409 },
      );
    }

    if (language.editRequest?.requestedBy) {
      return NextResponse.json(
        {
          field: "general",
          message:
            "This language has a pending edit request. Resolve that edit request before requesting deletion.",
        },
        { status: 409 },
      );
    }

    const requesterId = mongoUser._id.toString();
    const creatorId = language.createdBy.toString();

    const languageRole = getLanguageRole(
      mongoUser.languageRoles as LanguageRolesValue,
      language.name,
    );

    const isLanguageCreator = requesterId === creatorId;
    const isLanguageExpert = languageRole === "expert";

    if (!isLanguageCreator && !isLanguageExpert) {
      return NextResponse.json(
        {
          field: "general",
          message:
            "Only the language creator or a language expert can request deletion of this language.",
        },
        { status: 403 },
      );
    }

    if (language.status !== "active" && language.status !== "archived") {
      return NextResponse.json(
        {
          field: "general",
          message:
            "This language cannot be marked for deletion from its current status.",
        },
        { status: 400 },
      );
    }

    const previousStatus = language.status;

    const updatedLanguage = await Language.findOneAndUpdate(
      {
        _id: language._id,
        status: previousStatus,
        "editRequest.requestedBy": { $exists: false },
      },
      {
        $set: {
          status: "pending_deletion",
          deletionRequest: {
            requestedBy: mongoUser._id,
            requestedAt: new Date(),
            previousStatus,
            requestNote: requestNote || undefined,
          },
        },
      },
      {
        new: true,
        runValidators: true,
      },
    )
      .populate({
        path: "createdBy",
        select: "name email",
        model: User,
      })
      .populate({
        path: "deletionRequest.requestedBy",
        select: "name email",
        model: User,
      })
      .lean();

    if (!updatedLanguage) {
      return NextResponse.json(
        {
          field: "general",
          message:
            "The language changed before the deletion request could be saved. Refresh and try again.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        message:
          "Language marked for deletion. A global admin must approve or refuse the deletion request.",
        language: updatedLanguage,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("DELETE /api/languages/[id] error:", error);

    return NextResponse.json(
      {
        field: "general",
        message:
          error.message ||
          "Failed to submit the language deletion request.",
      },
      { status: 500 },
    );
  }
}