// utils/query-normalizer.ts

export function normalizeQuery(query: string): string {
  return query
    .replace(/\u0000/g, "")
    .replace(/\s+/g, " ")
    .trim();
}