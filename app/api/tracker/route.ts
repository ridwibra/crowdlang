import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { auth } from "@/lib/auth";
import Tracker from "@/models/Tracker";
import db from "@/utils/db";

export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 32 * 1024;
const MAX_METADATA_CHARACTERS = 8000;

class InvalidActivityError extends Error {}

function readString(
  body: Record<string, unknown>,
  field: string,
  maximum: number,
  required = false,
): string | undefined {
  const value = body[field];

  if (value === undefined || value === null) {
    if (required) {
      throw new InvalidActivityError(`${field} is required.`);
    }

    return undefined;
  }

  if (typeof value !== "string") {
    throw new InvalidActivityError(`${field} must be text.`);
  }

  const cleaned = value.trim();

  if (cleaned.length > maximum) {
    throw new InvalidActivityError(`${field} is too long.`);
  }

  if (!cleaned) {
    if (required) {
      throw new InvalidActivityError(`${field} is required.`);
    }

    return undefined;
  }

  return cleaned;
}

function readNumber(
  body: Record<string, unknown>,
  field: string,
  minimum?: number,
): number | undefined {
  const value = body[field];

  if (value === undefined || value === null) {
    return undefined;
  }

  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    (minimum !== undefined && value < minimum)
  ) {
    throw new InvalidActivityError(`${field} is invalid.`);
  }

  return value;
}

function readDate(
  body: Record<string, unknown>,
  field: string,
): Date | undefined {
  const value = body[field];

  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new InvalidActivityError(`${field} must be a date string.`);
  }

  // Require a timezone to avoid interpreting naive dates differently
  // on different servers.
  if (!/(Z|[+-]\d{2}:\d{2})$/i.test(value)) {
    throw new InvalidActivityError(
      `${field} must include a time zone. Use an ISO timestamp.`,
    );
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new InvalidActivityError(`${field} is invalid.`);
  }

  return date;
}

function readObjectId(
  body: Record<string, unknown>,
  field: string,
): Types.ObjectId | undefined {
  const value = body[field];

  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (
    typeof value !== "string" ||
    !/^[a-f\d]{24}$/i.test(value)
  ) {
    throw new InvalidActivityError(`${field} is invalid.`);
  }

  return new Types.ObjectId(value);
}

function decodeHeader(value: string | null): string {
  if (!value) return "";

  try {
    return decodeURIComponent(value).slice(0, 200);
  } catch {
    return value.slice(0, 200);
  }
}

function getCountryName(code: string): string {
  if (!code) return "";

  try {
    return (
      new Intl.DisplayNames(["en"], {
        type: "region",
      }).of(code) || code
    );
  } catch {
    return code;
  }
}

export async function POST(req: Request) {
  try {
    // Reject browser requests explicitly originating from another site.
    // This is not a replacement for rate limiting or anti-bot controls.
    const fetchSite = req.headers.get("sec-fetch-site");

    if (fetchSite === "cross-site") {
      return NextResponse.json(
        { message: "Cross-site activity submissions are not allowed." },
        { status: 403 },
      );
    }

    const declaredLength = Number(
      req.headers.get("content-length") || 0,
    );

    if (
      Number.isFinite(declaredLength) &&
      declaredLength > MAX_REQUEST_BYTES
    ) {
      return NextResponse.json(
        { message: "The activity request is too large." },
        { status: 413 },
      );
    }

    const text = await req.text();

    if (new TextEncoder().encode(text).byteLength > MAX_REQUEST_BYTES) {
      return NextResponse.json(
        { message: "The activity request is too large." },
        { status: 413 },
      );
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { message: "A valid JSON activity request is required." },
        { status: 400 },
      );
    }

    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return NextResponse.json(
        { message: "A valid activity request is required." },
        { status: 400 },
      );
    }

    const body = parsed as Record<string, unknown>;

    const sessionId = readString(body, "sessionId", 200, true);
    const actionType = readString(body, "actionType", 100, true);
    const pathname = readString(body, "pathname", 2048, true);

    if (!pathname?.startsWith("/")) {
      throw new InvalidActivityError(
        "pathname must be an application path.",
      );
    }

    const event: Record<string, unknown> = {
      sessionId,
      actionType,
      pathname,
    };

    const stringFields: Array<[string, number]> = [
      ["mediaType", 100],
      ["interactionType", 100],
      ["selectedLanguage", 200],
      ["region", 200],
      ["mapMode", 100],
      ["language", 200],
      ["device", 200],
      ["browser", 200],
      ["os", 200],
    ];

    for (const [field, maximum] of stringFields) {
      const value = readString(body, field, maximum);

      if (value !== undefined) {
        event[field] = value;
      }
    }

    for (const field of [
      "duration",
      "playDuration",
      "completionRate",
    ]) {
      const value = readNumber(body, field, 0);

      if (value !== undefined) {
        event[field] = value;
      }
    }

    const zoomLevel = readNumber(body, "zoomLevel");

    if (zoomLevel !== undefined) {
      event.zoomLevel = zoomLevel;
    }

    for (const field of ["reelId", "resourceId"]) {
      const value = readObjectId(body, field);

      if (value !== undefined) {
        event[field] = value;
      }
    }

    const startTime = readDate(body, "startTime");
    const endTime = readDate(body, "endTime");

    if (startTime && endTime && endTime < startTime) {
      throw new InvalidActivityError(
        "endTime cannot be earlier than startTime.",
      );
    }

    if (startTime) event.startTime = startTime;
    if (endTime) event.endTime = endTime;

    const resourceType = readString(body, "resourceType", 30);

    if (resourceType) {
      if (
        !["language", "alphabet", "essay", "table"].includes(
          resourceType,
        )
      ) {
        throw new InvalidActivityError("resourceType is invalid.");
      }

      event.resourceType = resourceType;
    }

    if (body.derivedCountries !== undefined) {
      if (
        !Array.isArray(body.derivedCountries) ||
        body.derivedCountries.length > 300 ||
        !body.derivedCountries.every(
          (value) =>
            typeof value === "string" && value.length <= 200,
        )
      ) {
        throw new InvalidActivityError(
          "derivedCountries is invalid.",
        );
      }

      event.derivedCountries = [
        ...new Set(
          body.derivedCountries
            .map((value: string) => value.trim())
            .filter(Boolean),
        ),
      ];
    }

    if (body.interactionMetadata !== undefined) {
      const metadata = body.interactionMetadata;

      if (
        metadata === null ||
        typeof metadata !== "object" ||
        Array.isArray(metadata)
      ) {
        throw new InvalidActivityError(
          "interactionMetadata must be an object.",
        );
      }

      if (
        JSON.stringify(metadata).length >
        MAX_METADATA_CHARACTERS
      ) {
        throw new InvalidActivityError(
          "interactionMetadata is too large.",
        );
      }

      event.interactionMetadata = metadata;
    }

    const session = await auth.api.getSession({
      headers: req.headers,
    });

    const userId = session?.user?.id;

    if (userId && !/^[a-f\d]{24}$/i.test(userId)) {
      console.error(
        "Tracker received a non-ObjectId authenticated user ID.",
      );

      return NextResponse.json(
        { message: "The account could not be linked to this activity." },
        { status: 500 },
      );
    }

    // This assumes Better Auth and User use the same MongoDB user IDs,
    // as your existing tracker route does.
    event.userId = userId ? new Types.ObjectId(userId) : null;
    event.isAuthenticated = Boolean(userId);

    event.userAgent = (
      req.headers.get("user-agent") || ""
    ).slice(0, 2000);

    const isVercel = process.env.VERCEL === "1";

    const rawCountryCode = isVercel
      ? (req.headers.get("x-vercel-ip-country") || "").toUpperCase()
      : "";

    const countryCode = /^[A-Z]{2}$/.test(rawCountryCode)
      ? rawCountryCode
      : "";

    event.countryCode = countryCode;
    event.country = getCountryName(countryCode);
    event.city = isVercel
      ? decodeHeader(req.headers.get("x-vercel-ip-city"))
      : "";

    await db.connect();
    await Tracker.create(event);

    return NextResponse.json(
      { success: true },
      { status: 201 },
    );
  } catch (error) {
    const validationFailure =
      error instanceof InvalidActivityError ||
      (error instanceof Error &&
        ["ValidationError", "CastError"].includes(error.name));

    if (validationFailure) {
      return NextResponse.json(
        {
          message:
            error instanceof InvalidActivityError
              ? error.message
              : "Some activity fields are invalid.",
        },
        { status: 400 },
      );
    }

    console.error("POST /api/tracker error:", error);

    return NextResponse.json(
      { message: "The activity could not be recorded." },
      { status: 500 },
    );
  }
}