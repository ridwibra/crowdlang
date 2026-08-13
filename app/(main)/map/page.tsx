import MapWorld from "@/components/MapWorld";
import Language from "@/models/Language";
import db from "@/utils/db";

export default async function MapPage() {
  await db.connect();

  const languagesRaw = await Language.find().lean();

  const languages = languagesRaw.map((language: any) => ({
    name: language.name,
    countries: language.countries || [],
  }));

  return (
    <main className="min-w-0 w-full max-w-full">
      <MapWorld languages={languages} />
    </main>
  );
}
