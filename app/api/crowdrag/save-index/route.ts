// app/api/crowdrag/save-index/route.ts
import { NextResponse } from "next/server";
import CrowdRAGItem from "@/models/CrowdRAGItem";
import db from "@/utils/db";
import { getSession } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedRoles = ["admin", "staff"];
const EMBEDDING_DIMENSION = 384;

const allowedSourceTypes = new Set([
  "alphabet",
  "essay",
  "language",
  "language-fallback",
  "reel",
  "table",
  "table-reverse",
]);

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { message: "You must be signed in." },
        { status: 401 },
      );
    }

    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json(
        { message: "You do not have permission to save the chatbot index." },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => null);

    if (!Array.isArray(body?.items) || body.items.length === 0) {
      return NextResponse.json(
        { message: "No RAG index items were provided." },
        { status: 400 },
      );
    }

    const items = body.items.map((item: any) => {
      if (
        !allowedSourceTypes.has(item.sourceType) ||
        typeof item.sourceId !== "string" ||
        typeof item.text !== "string" ||
        typeof item.language !== "string" ||
        !Array.isArray(item.embedding) ||
        item.embedding.length !== EMBEDDING_DIMENSION ||
        !item.embedding.every((value: unknown) => typeof value === "number")
      ) {
        throw new Error("Invalid RAG index item received.");
      }

      return {
        sourceType: item.sourceType,
        sourceId: item.sourceId,
        text: item.text.trim(),
        language: item.language,
        embedding: item.embedding,
      };
    });

    await db.connect();

    await CrowdRAGItem.deleteMany({});
    await CrowdRAGItem.insertMany(items, { ordered: true });

    return NextResponse.json({
      ok: true,
      indexedCount: items.length,
    });
  } catch (error) {
    console.error("Could not save RAG index:", error);

    const message =
      error instanceof Error ? error.message : "Could not save RAG index.";

    return NextResponse.json(
      { message },
      { status: 500 },
    );
  }
}