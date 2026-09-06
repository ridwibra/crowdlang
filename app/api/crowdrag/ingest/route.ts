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
  "marquee",
  "reel",
  "table",
  "table-reverse",
]);

type SourceType =
  | "alphabet"
  | "essay"
  | "language"
  | "language-fallback"
  | "marquee"
  | "reel"
  | "table"
  | "table-reverse";

type RAGDocument = {
  sourceType: SourceType;
  sourceId: string;
  text: string;
  language: string;
  title: string;
  keywords: string[];
  category: string;
  level: string;
  domain: string;
};

type RAGItem = RAGDocument & {
  embedding: number[];
};

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getStringArray(value: unknown): string[] {
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

function getCountries(value: unknown): string {
  return getStringArray(value).join(", ");
}

function getAlphabetLetters(value: unknown): string {
  if (!Array.isArray(value)) {
    return "";
  }

  return value
    .map((letter: { character?: unknown }) => letter?.character)
    .filter((character): character is string => typeof character === "string")
    .map((character) => character.trim())
    .filter(Boolean)
    .join(", ");
}

function createKeywords(
  ...values: Array<string | string[] | undefined>
): string[] {
  const rawKeywords = values.flatMap((value) => {
    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === "string") {
      return value.split(/[\s,;|/]+/);
    }

    return [];
  });

  return [
    ...new Set(
      rawKeywords
        .map((keyword) => keyword.trim().toLowerCase())
        .filter((keyword) => keyword.length >= 2),
    ),
  ].slice(0, 40);
}

function chunkText(
  value: string,
  chunkSize = 850,
  overlap = 150,
): string[] {
  const text = value.replace(/\s+/g, " ").trim();

  if (!text) {
    return [];
  }

  if (text.length <= chunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length);

    if (end < text.length) {
      const sentenceEnd = text.lastIndexOf(". ", end);

      if (sentenceEnd > start + Math.floor(chunkSize * 0.6)) {
        end = sentenceEnd + 1;
      }
    }

    const chunk = text.slice(start, end).trim();

    if (chunk) {
      chunks.push(chunk);
    }

    if (end >= text.length) {
      break;
    }

    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
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
    Alphabet.find({ status: "published" }).lean(),
    Essay.find({ status: "published" }).lean(),
    Language.find({ status: "active" }).lean(),

    // The current Reel schema has no status field.
    // Only index a reel when it has at least one approval record.
    // Approval identity is never copied to RAG data.
    Reel.find({ "approvedBy.0": { $exists: true } }).lean(),

    Table.find({ status: "published" }).lean(),
  ]);

  const languageNameById = new Map(
    (languages as any[]).map((language) => [
      language._id.toString(),
      asString(language.name),
    ]),
  );

  const resolveLanguageName = (value: unknown) => {
    const id = value?.toString?.() ?? "";
    return languageNameById.get(id) ?? "";
  };

  const documents: RAGDocument[] = [];

  for (const language of languages as any[]) {
    const sourceId = language._id?.toString() ?? "";
    const name = asString(language.name);
    const countries = getCountries(language.countries);

    if (!sourceId || !name) {
      continue;
    }

    documents.push({
      sourceType: "language",
      sourceId,
      title: name,
      text: [
        `Language: ${name}.`,
        countries ? `Countries or regions: ${countries}.` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      language: name,
      keywords: createKeywords(name, countries, "language", "countries"),
      category: "language",
      level: "",
      domain: "general",
    });
  }

  for (const alphabet of alphabets as any[]) {
    const sourceId = alphabet._id?.toString() ?? "";
    const name = asString(alphabet.name);
    const languageName = resolveLanguageName(alphabet.language);
    const letters = getAlphabetLetters(alphabet.letters);

    if (!sourceId || !name) {
      continue;
    }

    documents.push({
      sourceType: "alphabet",
      sourceId,
      title: name,
      text: [
        `Alphabet: ${name}.`,
        languageName ? `Language: ${languageName}.` : "",
        letters ? `Letters: ${letters}.` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      language: languageName,
      keywords: createKeywords(
        name,
        languageName,
        letters,
        "alphabet",
        "letters",
        "writing",
        "ipa",
      ),
      category: "alphabet",
      level: "",
      domain: "writing",
    });
  }

  for (const essay of essays as any[]) {
    const sourceId = essay._id?.toString() ?? "";
    const title = asString(essay.title) || "Untitled essay";
    const languageName = resolveLanguageName(essay.language);
    const category = asString(essay.category);
    const level = asString(essay.level);
    const tags = getStringArray(essay.tags);
    const body = asString(essay.body);
    const translationTitle = asString(essay.translationTitle);
    const translationBody = asString(essay.translationBody);

    if (!sourceId || !body) {
      continue;
    }

    const fullText = [
      `Essay title: ${title}.`,
      languageName ? `Language: ${languageName}.` : "",
      category ? `Category: ${category}.` : "",
      level ? `Level: ${level}.` : "",
      tags.length ? `Tags: ${tags.join(", ")}.` : "",
      `Content: ${body}`,
      translationTitle ? `Translation title: ${translationTitle}.` : "",
      translationBody ? `Translation: ${translationBody}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const chunks = chunkText(fullText);

    for (let index = 0; index < chunks.length; index += 1) {
      documents.push({
        sourceType: "essay",
        sourceId: `${sourceId}:chunk:${index + 1}`,
        title,
        text: chunks[index],
        language: languageName,
        keywords: createKeywords(
          title,
          languageName,
          category,
          level,
          tags,
          "essay",
        ),
        category,
        level,
        domain: "learning",
      });
    }
  }

  for (const table of tables as any[]) {
    const sourceId = table._id?.toString() ?? "";
    const text = asString(table.text);
    const translation = asString(table.translation);
    const textType = asString(table.textType) || "entry";
    const domain = asString(table.domain);
    const languageName = resolveLanguageName(table.language);

    if (!sourceId || !text || !translation) {
      continue;
    }

    documents.push({
      sourceType: "table",
      sourceId,
      title: text,
      text: [
        "Translation entry.",
        languageName ? `Language: ${languageName}.` : "",
        `Type: ${textType}.`,
        domain ? `Domain: ${domain}.` : "",
        `Original: ${text}.`,
        `Translation: ${translation}.`,
      ]
        .filter(Boolean)
        .join("\n"),
      language: languageName,
      keywords: createKeywords(
        text,
        translation,
        languageName,
        textType,
        domain,
        "translation",
      ),
      category: "translation",
      level: "",
      domain,
    });

    documents.push({
      sourceType: "table-reverse",
      sourceId: `${sourceId}:reverse`,
      title: translation,
      text: [
        "Reverse translation entry.",
        languageName ? `Language: ${languageName}.` : "",
        `Type: ${textType}.`,
        domain ? `Domain: ${domain}.` : "",
        `Original: ${translation}.`,
        `Translation: ${text}.`,
      ]
        .filter(Boolean)
        .join("\n"),
      language: languageName,
      keywords: createKeywords(
        translation,
        text,
        languageName,
        textType,
        domain,
        "translation",
      ),
      category: "translation",
      level: "",
      domain,
    });
  }

  for (const reel of reels as any[]) {
    const sourceId = reel._id?.toString() ?? "";
    const caption = asString(reel.caption);
    const transcription = asString(reel.transcription);
    const translation = asString(reel.translation);
    const tags = getStringArray(reel.tags);
    const languageName = resolveLanguageName(reel.language);
    const mediaType = asString(reel.type) || "media";

    if (!sourceId || (!caption && !transcription && !translation)) {
      continue;
    }

    documents.push({
      sourceType: "reel",
      sourceId,
      title: caption || "CrowdLang reel",
      text: [
        "CrowdLang reel.",
        languageName ? `Language: ${languageName}.` : "",
        `Media type: ${mediaType}.`,
        caption ? `Caption: ${caption}.` : "",
        tags.length ? `Tags: ${tags.join(", ")}.` : "",
        transcription ? `Transcription: ${transcription}` : "",
        translation ? `Translation: ${translation}` : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
      language: languageName,
      keywords: createKeywords(
        caption,
        languageName,
        tags,
        mediaType,
        "reel",
        "audio",
        "video",
      ),
      category: "reel",
      level: "",
      domain: "media",
    });
  }

  for (const language of languages as any[]) {
    const languageId = language._id?.toString() ?? "";
    const languageName = asString(language.name);

    if (!languageId || !languageName) {
      continue;
    }

    const hasSpecificContent =
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

    if (!hasSpecificContent) {
      documents.push({
        sourceType: "language-fallback",
        sourceId: `${languageId}:fallback`,
        title: languageName,
        text: [
          `Basic information about ${languageName}.`,
          `Countries or territories: ${getCountries(language.countries)}.`,
        ].join("\n"),
        language: languageName,
        keywords: createKeywords(
          languageName,
          getCountries(language.countries),
          "language",
        ),
        category: "language",
        level: "",
        domain: "general",
      });
    }
  }

  return documents.filter(
    (document) =>
      document.sourceId.trim().length > 0 &&
      document.text.trim().length > 0,
  );
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

  return value.map((item: any, index: number) => {
    const sourceType = item?.sourceType;
    const sourceId = asString(item?.sourceId);
    const text = asString(item?.text);
    const language = asString(item?.language);
    const title = asString(item?.title);
    const keywords = getStringArray(item?.keywords);
    const category = asString(item?.category);
    const level = asString(item?.level);
    const domain = asString(item?.domain);

    const embedding = Array.isArray(item?.embedding)
      ? item.embedding.map(Number)
      : [];

    if (!allowedSourceTypes.has(sourceType)) {
      throw new Error(
        `Invalid source type at item ${index + 1}: ${String(sourceType)}.`,
      );
    }

    if (!sourceId) {
      throw new Error(`Missing source ID at item ${index + 1}.`);
    }

    if (!text) {
      throw new Error(`Missing text at item ${index + 1}.`);
    }

    if (embedding.length !== EMBEDDING_DIMENSION) {
      throw new Error(
        `Invalid embedding length at item ${index + 1}. Got ${
          embedding.length
        }; expected ${EMBEDDING_DIMENSION}.`,
      );
    }

    if (!embedding.every(Number.isFinite)) {
      throw new Error(
        `Embedding contains invalid numeric values at item ${index + 1}.`,
      );
    }

    return {
      sourceType: sourceType as SourceType,
      sourceId,
      text,
      language,
      title,
      keywords,
      category,
      level,
      domain,
      embedding,
    };
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

    if (action !== "prepare" && action !== "save") {
      return NextResponse.json(
        { message: 'Invalid action. Use "prepare" or "save".' },
        { status: 400 },
      );
    }

    await db.connect();

    if (action === "prepare") {
      const documents = await prepareDocuments();

      return NextResponse.json({
        ok: true,
        documents,
        count: documents.length,
      });
    }

    const items = validateRAGItems(body?.items);

    // Validate every client-created embedding before removing the prior index.
    await CrowdRAGItem.deleteMany({});

    await CrowdRAGItem.insertMany(items, {
      ordered: true,
    });

    return NextResponse.json({
      ok: true,
      indexedCount: items.length,
    });
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