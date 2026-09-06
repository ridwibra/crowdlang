// app/api/crowdrag/ingest/route.ts
import { NextResponse } from "next/server";
import CrowdRAGItem from "@/models/CrowdRAGItem";
import Alphabet from "@/models/Alphabet";
import Essay from "@/models/Essay";
import Language from "@/models/Language";
import Reel from "@/models/Reel";
import Table from "@/models/Table";
import db from "@/utils/db";
import { getSession } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const allowedRoles = ["admin", "staff"];
const EMBEDDING_DIMENSION = 384;
const MAX_ITEMS_PER_SAVE = 2_000;

const allowedSourceTypes = new Set([
  "alphabet",
  "essay",
  "language",
  "language-fallback",
  "reel",
  "table",
  "table-reverse",
]);

type SourceType =
  | "alphabet"
  | "essay"
  | "language"
  | "language-fallback"
  | "reel"
  | "table"
  | "table-reverse";

type RAGDocument = {
  sourceType: SourceType;
  sourceId: string;
  text: string;
  language: string;
};

type RAGItem = RAGDocument & {
  embedding: number[];
};

function getCountries(value: unknown): string {
  if (!Array.isArray(value)) {
    return "";
  }

  return value
    .filter((country): country is string => typeof country === "string")
    .join(", ");
}

function getAlphabetLetters(value: unknown): string {
  if (!Array.isArray(value)) {
    return "";
  }

  return value
    .map((letter: { character?: unknown }) => letter?.character)
    .filter((character): character is string => typeof character === "string")
    .join(", ");
}

async function requireAllowedSession() {
  const session = await getSession();

  if (!session) {
    return {
      error: NextResponse.json(
        { message: "You must be signed in." },
        { status: 401 },
      ),
    };
  }

  if (!allowedRoles.includes(session.user.role)) {
    return {
      error: NextResponse.json(
        { message: "You do not have permission to rebuild the chatbot index." },
        { status: 403 },
      ),
    };
  }

  return { session };
}

async function prepareDocuments(): Promise<RAGDocument[]> {
  const [alphabets, essays, languages, reels, tables] = await Promise.all([
    Alphabet.find({}).lean(),
    Essay.find({}).lean(),
    Language.find({}).lean(),
    Reel.find({}).lean(),
    Table.find({}).lean(),
  ]);

  const documents: RAGDocument[] = [];

  for (const alphabet of alphabets as any[]) {
    documents.push({
      sourceType: "alphabet",
      sourceId: alphabet._id.toString(),
      text: `Alphabet (${alphabet.name ?? "Untitled"}): ${getAlphabetLetters(
        alphabet.letters,
      )}`,
      language: alphabet.language?.toString() ?? "",
    });
  }

  for (const essay of essays as any[]) {
    documents.push({
      sourceType: "essay",
      sourceId: essay._id.toString(),
      text: `Essay: ${essay.title ?? "Untitled"}. ${essay.body ?? ""}`,
      language: essay.language?.toString() ?? "",
    });
  }

  for (const language of languages as any[]) {
    documents.push({
      sourceType: "language",
      sourceId: language._id.toString(),
      text: `Language: ${language.name ?? "Unnamed language"}. Countries: ${getCountries(
        language.countries,
      )}`,
      language: language.name ?? "",
    });
  }

  for (const reel of reels as any[]) {
    documents.push({
      sourceType: "reel",
      sourceId: reel._id.toString(),
      text: `Reel (${reel.language ?? ""}): ${reel.caption ?? ""}. Transcription: ${
        reel.transcription ?? ""
      }`,
      language: reel.language?.toString() ?? "",
    });
  }

  for (const table of tables as any[]) {
    documents.push({
      sourceType: "table",
      sourceId: table._id.toString(),
      text: `Table (${table.textType ?? "entry"}): ${table.text ?? ""} => ${
        table.translation ?? ""
      }`,
      language: table.language?.toString() ?? "",
    });

    if (table.text && table.translation) {
      documents.push({
        sourceType: "table-reverse",
        sourceId: table._id.toString(),
        text: `Reverse (${table.textType ?? "entry"}): ${table.translation} => ${
          table.text
        }`,
        language: table.language?.toString() ?? "",
      });
    }
  }

  for (const language of languages as any[]) {
    const languageId = language._id.toString();

    const hasContent =
      alphabets.some(
        (alphabet: any) =>
          alphabet.language?.toString() === languageId,
      ) ||
      essays.some(
        (essay: any) => essay.language?.toString() === languageId,
      ) ||
      reels.some(
        (reel: any) => reel.language?.toString() === languageId,
      ) ||
      tables.some(
        (table: any) => table.language?.toString() === languageId,
      );

    if (!hasContent) {
      documents.push({
        sourceType: "language-fallback",
        sourceId: languageId,
        text: `Basic information about ${
          language.name ?? "this language"
        }. Countries or territories: ${getCountries(language.countries)}.`,
        language: language.name ?? "",
      });
    }
  }

  return documents.filter((document) => document.text.trim().length > 0);
}

function validateRAGItems(value: unknown): RAGItem[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("No RAG index items were provided.");
  }

  if (value.length > MAX_ITEMS_PER_SAVE) {
    throw new Error(
      `Too many RAG index items. Maximum allowed is ${MAX_ITEMS_PER_SAVE}.`,
    );
  }

  return value.map((item: any) => {
    if (
      !allowedSourceTypes.has(item?.sourceType) ||
      typeof item?.sourceId !== "string" ||
      typeof item?.text !== "string" ||
      typeof item?.language !== "string" ||
      !Array.isArray(item?.embedding) ||
      item.embedding.length !== EMBEDDING_DIMENSION ||
      !item.embedding.every(
        (number: unknown) =>
          typeof number === "number" && Number.isFinite(number),
      )
    ) {
      throw new Error("One or more RAG index items are invalid.");
    }

    return {
      sourceType: item.sourceType,
      sourceId: item.sourceId,
      text: item.text.trim(),
      language: item.language,
      embedding: item.embedding,
    } as RAGItem;
  });
}

export async function POST(request: Request) {
  try {
    const permission = await requireAllowedSession();

    if ("error" in permission) {
      return permission.error;
    }

    const body = await request.json().catch(() => null);
    const action = body?.action;

    await db.connect();

    if (action === "prepare") {
      const documents = await prepareDocuments();

      return NextResponse.json({
        ok: true,
        documents,
        count: documents.length,
      });
    }

    if (action === "save") {
      const items = validateRAGItems(body?.items);

      // Validate every item before deleting the old working index.
      await CrowdRAGItem.deleteMany({});

      await CrowdRAGItem.insertMany(items, {
        ordered: true,
      });

      return NextResponse.json({
        ok: true,
        indexedCount: items.length,
      });
    }

    return NextResponse.json(
      { message: 'Invalid action. Use "prepare" or "save".' },
      { status: 400 },
    );
  } catch (error) {
    console.error("RAG ingest failed:", error);

    const message =
      error instanceof Error ? error.message : "Unknown server error.";

    return NextResponse.json(
      { message: `RAG ingest failed: ${message}` },
      { status: 500 },
    );
  }
}