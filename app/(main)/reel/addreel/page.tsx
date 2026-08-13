import db from "@/utils/db";
import Language from "@/models/Language";
import AddReelForm from "@/components/AddReelForm";

export default async function AddReelPage() {
  await db.connect();
  const languagesRaw = await Language.find().lean();

  const languages = languagesRaw.map((lang: any) => ({
    _id: lang._id.toString(),
    name: lang.name,
  }));

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-semibold">Upload a Reel</h1>
      <AddReelForm languages={languages} />
    </div>
  );
}
