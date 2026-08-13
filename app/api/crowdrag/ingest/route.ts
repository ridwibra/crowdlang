// app/api/crowdrag/ingest/route.ts
import { NextResponse } from "next/server";
import CrowdRAGItem from "@/models/CrowdRAGItem";
import Alphabet from "@/models/Alphabet";
import Essay from "@/models/Essay";
import Language from "@/models/Language";
import Reel from "@/models/Reel";
import Table from "@/models/Table";
import { embedText } from "@/utils/embeddings";
import db from "@/utils/db";
import { getSession } from "@/lib/server";

export async function POST() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { message: "You must be signed in." },
      { status: 401 },
    );
  }

  const allowedRoles = ["admin", "staff"];

  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json(
      { message: "You do not have permission to rebuild the chatbot index." },
      { status: 403 },
    );
  }

  await db.connect();

  await CrowdRAGItem.deleteMany({});

  // Alphabet
  const alphabets = await Alphabet.find({});
  for (const a of alphabets) {
    const text = `Alphabet (${a.name}): ${a.letters
      .map((l: { character: string }) => l.character)
      .join(", ")}`;

    const embedding = await embedText(text);

    await CrowdRAGItem.create({
      sourceType: "alphabet",
      sourceId: a._id.toString(),
      text,
      language: a.language?.toString() ?? "",
      embedding,
    });
  }

  // Essay
  const essays = await Essay.find({});
  for (const e of essays) {
    const text = `Essay: ${e.title}. ${e.body ?? ""}`;
    const embedding = await embedText(text);

    await CrowdRAGItem.create({
      sourceType: "essay",
      sourceId: e._id.toString(),
      text,
      language: e.language?.toString() ?? "",
      embedding,
    });
  }

  // Language
  const languages = await Language.find({});
  for (const lang of languages) {
    const text = `Language: ${lang.name}. Countries: ${lang.countries.join(", ")}`;
    const embedding = await embedText(text);

    await CrowdRAGItem.create({
      sourceType: "language",
      sourceId: lang._id.toString(),
      text,
      language: lang.name,
      embedding,
    });
  }

  // Reel
const reels = await Reel.find({});
for (const r of reels) {
  const text = `Reel (${r.language}): ${r.caption}. Transcription: ${r.transcription ?? ""}`;
  const embedding = await embedText(text);
  await CrowdRAGItem.create({
    sourceType: "reel",
    sourceId: r._id.toString(),
    text,
    language: r.language?.toString() ?? "",
    embedding,
  });
}


  // Table
  const tables = await Table.find({});
  for (const t of tables) {
    const text = `Table (${t.textType}): ${t.text} => ${t.translation}`;
    const embedding = await embedText(text);

    await CrowdRAGItem.create({
      sourceType: "table",
      sourceId: t._id.toString(),
      text,
      language: t.language?.toString() ?? "",
      embedding,
    });

    // ⭐ Reverse translation (critical fix)
    if (t.translation) {
      const reverseText = `Reverse (${t.textType}): ${t.translation} => ${t.text}`;
      const reverseEmbedding = await embedText(reverseText);

      await CrowdRAGItem.create({
        sourceType: "table-reverse",
        sourceId: t._id.toString(),
        text: reverseText,
        language: t.language?.toString() ?? "",
        embedding: reverseEmbedding,
      });
    }
  }

  // Coverage checks
  const missingTypes: string[] = [];

  if (alphabets.length === 0) missingTypes.push("alphabets");
  if (essays.length === 0) missingTypes.push("essays");
  if (languages.length === 0) missingTypes.push("languages");
  if (reels.length === 0) missingTypes.push("reels");
  if (tables.length === 0) missingTypes.push("tables");

  if (missingTypes.length > 0) {
    console.warn("Missing content types:", missingTypes);
  }

  //  Language fallback items
for (const lang of languages) {
  const languageId = lang._id.toString();

  const hasContent =
    alphabets.some(
      (alphabet) => alphabet.language?.toString() === languageId,
    ) ||
    essays.some((essay) => essay.language?.toString() === languageId) ||
    reels.some((reel) => reel.language?.toString() === languageId) ||
    tables.some((table) => table.language?.toString() === languageId);

  if (!hasContent) {
    const fallbackText = `Basic information about ${lang.name}. Countries or territories: ${lang.countries.join(
      ", ",
    )}.`;

    const embedding = await embedText(fallbackText);

    await CrowdRAGItem.create({
      sourceType: "language-fallback",
      sourceId: languageId,
      text: fallbackText,
      language: lang.name,
      embedding,
    });

    console.warn(`Created fallback item for language: ${lang.name}`);
  }
}
  return NextResponse.json({ ok: true });
}
