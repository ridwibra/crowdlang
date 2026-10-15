import MapWorld from "@/components/MapWorld";
import Language from "@/models/Language";
import db from "@/utils/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MapPage() {
  await db.connect();

  const languagesRaw = await Language.find({
    status: { $ne: "pending_deletion" },
  })
    .select("name countries status")
    .sort({ name: 1 })
    .lean();

  const languages = languagesRaw.map((language: any) => ({
    name: language.name,
    countries: Array.isArray(language.countries) ? language.countries : [],
  }));

  return (
    <main className="min-w-0 w-full max-w-full">
      <MapWorld languages={languages} />
    </main>
  );
}
