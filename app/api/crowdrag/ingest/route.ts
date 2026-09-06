// app/api/crowdrag/ingest/route.ts
import { NextResponse } from "next/server";

import Alphabet from "@/models/Alphabet";
import Essay from "@/models/Essay";
import Language from "@/models/Language";
import Reel from "@/models/Reel";
import Table from "@/models/Table";
import CrowdRAGItem from "@/models/CrowdRAGItem";

import db from "@/utils/db";
import { embedText, EMBEDDING_DIMENSION } from "@/utils/embeddings";
import { getSession } from "@/lib/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const allowedRoles = ["admin", "staff"];

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

type IndexedRAGDocument = RAGDocument & {
embedding: number[];
};

function cleanText(value: unknown): string {
if (typeof value !== "string") {
return "";
}

return value
.replace(/\u0000/g, "")
.replace(/\s+/g, " ")
.trim();
}

function getLanguageId(value: unknown): string {
if (
value &&
typeof value === "object" &&
"_id" in value
) {
return String(
(value as { _id: unknown })._id,
);
}

return value ? String(value) : "";
}

function getLanguageName(value: unknown): string {
return cleanText(value);
}

export async function POST() {
try {
const session = await getSession();

if (!session) {
  return NextResponse.json(
    {
      message: "You must be signed in.",
    },
    {
      status: 401,
    },
  );
}

if (!allowedRoles.includes(session.user.role)) {
  return NextResponse.json(
    {
      message:
        "You do not have permission to rebuild the chatbot index.",
    },
    {
      status: 403,
    },
  );
}

await db.connect();

const [
  alphabets,
  essays,
  languages,
  reels,
  tables,
] = await Promise.all([
  Alphabet.find({}).lean(),
  Essay.find({}).lean(),
  Language.find({}).lean(),
  Reel.find({}).lean(),
  Table.find({}).lean(),
]);

const documents: RAGDocument[] = [];

/*
 * ALPHABETS
 */
for (const alphabet of alphabets as any[]) {
  const letters = Array.isArray(alphabet.letters)
    ? alphabet.letters
        .map((letter: { character?: unknown }) =>
          cleanText(letter?.character),
        )
        .filter(Boolean)
        .join(", ")
    : "";

  const name =
    cleanText(alphabet.name) || "Untitled";

  const text = cleanText(
    `Alphabet (${name}): ${letters}`,
  );

  if (!text) {
    continue;
  }

  documents.push({
    sourceType: "alphabet",
    sourceId: String(alphabet._id),
    text,
    language: getLanguageId(alphabet.language),
  });
}

/*
 * ESSAYS
 */
for (const essay of essays as any[]) {
  const title =
    cleanText(essay.title) || "Untitled";

  const body = cleanText(essay.body);

  const text = cleanText(
    `Essay: ${title}. ${body}`,
  );

  if (!text) {
    continue;
  }

  documents.push({
    sourceType: "essay",
    sourceId: String(essay._id),
    text,
    language: getLanguageId(essay.language),
  });
}

/*
 * LANGUAGES
 */
for (const language of languages as any[]) {
  const name =
    cleanText(language.name) ||
    "Unnamed language";

  const countries = Array.isArray(
    language.countries,
  )
    ? language.countries
        .map((country: unknown) =>
          cleanText(country),
        )
        .filter(Boolean)
        .join(", ")
    : "";

  const text = cleanText(
    `Language: ${name}. Countries or territories: ${countries}.`,
  );

  if (!text) {
    continue;
  }

  documents.push({
    sourceType: "language",
    sourceId: String(language._id),
    text,
    language: getLanguageName(language.name),
  });
}

/*
 * REELS
 */
for (const reel of reels as any[]) {
  const language = cleanText(reel.language);
  const caption = cleanText(reel.caption);
  const transcription = cleanText(
    reel.transcription,
  );

  const text = cleanText(
    `Reel (${language}): ${caption}. Transcription: ${transcription}`,
  );

  if (!text) {
    continue;
  }

  documents.push({
    sourceType: "reel",
    sourceId: String(reel._id),
    text,
    language,
  });
}

/*
 * TABLES
 */
for (const table of tables as any[]) {
  const textType =
    cleanText(table.textType) || "entry";

  const sourceText = cleanText(table.text);
  const translation = cleanText(
    table.translation,
  );

  const language = getLanguageId(
    table.language,
  );

  const forwardText = cleanText(
    `Table (${textType}): ${sourceText} => ${translation}`,
  );

  if (forwardText) {
    documents.push({
      sourceType: "table",
      sourceId: String(table._id),
      text: forwardText,
      language,
    });
  }

  /*
   * Reverse translation
   */
  if (sourceText && translation) {
    const reverseText = cleanText(
      `Reverse (${textType}): ${translation} => ${sourceText}`,
    );

    documents.push({
      sourceType: "table-reverse",
      sourceId: String(table._id),
      text: reverseText,
      language,
    });
  }
}

/*
 * LANGUAGES WITHOUT OTHER CONTENT
 *
 * Add a fallback document so the chatbot
 * can still answer basic questions about
 * languages that do not yet have other content.
 */
for (const language of languages as any[]) {
  const languageId = String(language._id);

  const hasContent =
    alphabets.some(
      (alphabet: any) =>
        getLanguageId(alphabet.language) ===
        languageId,
    ) ||
    essays.some(
      (essay: any) =>
        getLanguageId(essay.language) ===
        languageId,
    ) ||
    reels.some(
      (reel: any) =>
        getLanguageId(reel.language) ===
        languageId,
    ) ||
    tables.some(
      (table: any) =>
        getLanguageId(table.language) ===
        languageId,
    );

  if (!hasContent) {
    const name =
      cleanText(language.name) ||
      "this language";

    const countries = Array.isArray(
      language.countries,
    )
      ? language.countries
          .map((country: unknown) =>
            cleanText(country),
          )
          .filter(Boolean)
          .join(", ")
      : "";

    const text = cleanText(
      `Basic information about ${name}. Countries or territories: ${countries}.`,
    );

    if (text) {
      documents.push({
        sourceType: "language-fallback",
        sourceId: languageId,
        text,
        language: name,
      });
    }
  }
}

if (documents.length === 0) {
  return NextResponse.json(
    {
      message:
        "There is no CrowdLang content available to index.",
    },
    {
      status: 400,
    },
  );
}

/*
 * Generate all embeddings BEFORE deleting the
 * existing index.
 *
 * This is important: if embedding generation
 * fails halfway through, the existing working
 * index remains untouched.
 */
const indexedItems: IndexedRAGDocument[] = [];

for (
  let index = 0;
  index < documents.length;
  index += 1
) {
  const document = documents[index];

  console.log(
    `Generating RAG embedding ${index + 1}/${documents.length}: ${document.sourceType}/${document.sourceId}`,
  );

  const embedding = await embedText(
    document.text,
  );

  if (
    embedding.length !==
    EMBEDDING_DIMENSION
  ) {
    throw new Error(
      `Invalid embedding dimension for ${document.sourceType}/${document.sourceId}: ${embedding.length}. Expected ${EMBEDDING_DIMENSION}.`,
    );
  }

  indexedItems.push({
    ...document,
    embedding,
  });
}

/*
 * Replace the old index only after every document
 * has been successfully embedded.
 */
await CrowdRAGItem.deleteMany({});

await CrowdRAGItem.insertMany(
  indexedItems,
  {
    ordered: true,
  },
);

return NextResponse.json({
  ok: true,
  indexedCount: indexedItems.length,
  message: `RAG index rebuilt successfully! ${indexedItems.length} items indexed.`,
});


} catch (error) {
console.error(
"Could not rebuild CrowdLang RAG index:",
error,
);

const message =
  error instanceof Error
    ? error.message
    : "Unknown server error.";

return NextResponse.json(
  {
    message: `Could not rebuild RAG index: ${message}`,
  },
  {
    status: 500,
  },
);


}
}