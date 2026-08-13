import MapWorld from "@/components/MapWorld";
import Language from "@/models/Language";
import db from "@/utils/db";

export default async function MapPage() {
  await db.connect();

  const languagesRaw = await Language.find().lean();

  await db.disconnect();

  const languages = languagesRaw.map((language: any) => ({
    name: language.name,
    countries: language.countries || [],
  }));

  return (
    <main className="flex flex-col">
      <MapWorld languages={languages} />
    </main>
  );
}
