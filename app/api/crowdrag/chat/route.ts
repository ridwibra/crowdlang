// app/api/crowdrag/chat/route.ts
import { NextResponse } from "next/server";

import CrowdRAGItem from "@/models/CrowdRAGItem";
import db from "@/utils/db";

import {
embedText,
EMBEDDING_DIMENSION,
} from "@/utils/embeddings";
import { generateAnswer } from "@/utils/local-llm";
import { normalizeQuery } from "@/utils/query-normalizer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_MESSAGE_LENGTH = 1000;
const MAX_CONTEXT_ITEMS = 6;
const MAX_ITEM_TEXT_LENGTH = 900;

function cosineSimilarity(
a: number[],
b: number[],
): number {
if (
a.length !== b.length ||
a.length === 0
) {
return 0;
}

let dot = 0;
let normASquared = 0;
let normBSquared = 0;

for (let index = 0; index < a.length; index += 1) {
const valueA = a[index];
const valueB = b[index];

if (
  !Number.isFinite(valueA) ||
  !Number.isFinite(valueB)
) {
  return 0;
}

dot += valueA * valueB;
normASquared += valueA * valueA;
normBSquared += valueB * valueB;


}

const normA = Math.sqrt(normASquared);
const normB = Math.sqrt(normBSquared);

if (
!Number.isFinite(normA) ||
!Number.isFinite(normB) ||
normA === 0 ||
normB === 0
) {
return 0;
}

return dot / (normA * normB);
}

function keywordScore(
query: string,
text: string,
): number {
const uniqueWords = [
...new Set(
query
.toLowerCase()
.split(/\s+/)
.map((word) =>
word.replace(
/[^\p{L}\p{N}]/gu,
"",
),
)
.filter(
(word) => word.length >= 3,
),
),
];

if (uniqueWords.length === 0) {
return 0;
}

const normalizedText =
text.toLowerCase();

return uniqueWords.reduce(
(score, word) =>
score +
(normalizedText.includes(word)
? 1
: 0),
0,
);
}

function sanitizeContextText(
value: string,
): string {
return value
.replace(/\u0000/g, "")
.replace(/\s+/g, " ")
.trim()
.slice(
0,
MAX_ITEM_TEXT_LENGTH,
);
}

export async function POST(
request: Request,
) {
try {
const body =
await request
.json()
.catch(() => null);

const rawMessage =
  typeof body?.message === "string"
    ? body.message
    : "";

const message =
  rawMessage.trim();

if (!message) {
  return NextResponse.json(
    {
      message:
        "Please enter a question.",
    },
    {
      status: 400,
    },
  );
}

if (
  message.length >
  MAX_MESSAGE_LENGTH
) {
  return NextResponse.json(
    {
      message: `Questions must be ${MAX_MESSAGE_LENGTH} characters or fewer.`,
    },
    {
      status: 400,
    },
  );
}

const cleanedQuery =
  normalizeQuery(message);

if (!cleanedQuery) {
  return NextResponse.json(
    {
      message:
        "Please enter a valid question.",
    },
    {
      status: 400,
    },
  );
}

/*
 * Generate the query embedding on the SERVER.
 *
 * The browser does not need to send an embedding.
 */
const queryEmbedding =
  await embedText(cleanedQuery);

if (
  queryEmbedding.length !==
  EMBEDDING_DIMENSION
) {
  throw new Error(
    `Invalid query embedding dimension: ${queryEmbedding.length}. Expected ${EMBEDDING_DIMENSION}.`,
  );
}

await db.connect();

const items =
  await CrowdRAGItem.find({})
    .select(
      "sourceType sourceId text language embedding",
    )
    .lean();

if (items.length === 0) {
  return NextResponse.json({
    answer:
      "No information is available yet. CrowdLang content needs to be indexed before Parrot can answer questions.",
    sources: [],
  });
}

const scoredItems = items
  .filter(
    (item: any) =>
      Array.isArray(item.embedding) &&
      item.embedding.length ===
        EMBEDDING_DIMENSION &&
      item.embedding.every(
        (value: unknown) =>
          typeof value === "number" &&
          Number.isFinite(value),
      ) &&
      typeof item.text === "string" &&
      item.text.trim().length > 0,
  )
  .map((item: any) => {
    const semanticScore =
      cosineSimilarity(
        queryEmbedding,
        item.embedding,
      );

    const lexicalScore =
      keywordScore(
        cleanedQuery,
        item.text,
      );

    /*
     * Semantic similarity is the primary signal.
     * Keyword matching gives an additional boost
     * for exact names, translations, etc.
     */
    const normalizedKeywordScore =
      Math.min(
        lexicalScore / 5,
        1,
      );

    const score =
      semanticScore * 0.8 +
      normalizedKeywordScore * 0.2;

    return {
      item,
      semanticScore,
      lexicalScore,
      score,
    };
  })
  .sort(
    (first, second) =>
      second.score -
      first.score,
  )
  .slice(
    0,
    MAX_CONTEXT_ITEMS,
  );

if (
  scoredItems.length === 0
) {
  return NextResponse.json({
    answer:
      "No relevant information is available.",
    sources: [],
  });
}

const context =
  scoredItems
    .map(
      ({ item }) =>
        `[SOURCE TYPE: ${item.sourceType}]\n${sanitizeContextText(
          item.text,
        )}`,
    )
    .join("\n\n");

const answer =
  await generateAnswer({
    question: message,
    context,
  });

return NextResponse.json({
  answer,
  sources:
    scoredItems.map(
      ({ item }) => ({
        type: item.sourceType,
        language:
          item.language ||
          null,
      }),
    ),
});


} catch (error) {
console.error(
"CrowdLang chat error:",
error,
);

return NextResponse.json(
  {
    message:
      "Parrot could not answer right now. Please try again.",
  },
  {
    status: 500,
  },
);


}
}