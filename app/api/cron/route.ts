// app/api/cron/route.ts
import { NextResponse } from "next/server";
import User from "@/models/User";
import { deleteMedia } from "@/utils/files/requests";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    // Match your 48-hour Better Auth verification-token expiry.
    const fortyEightHoursAgo = new Date(
      Date.now() - 48 * 60 * 60 * 1000,
    );

    const expiredUsers = await User.find({
      emailVerified: false,
      createdAt: { $lt: fortyEightHoursAgo },
    });

    const cleanupPromises = expiredUsers.map(async (user) => {
      // Delete the user's Cloudinary avatar, if present.
      if (user.avatar?.public_id) {
        try {
          await deleteMedia(user.avatar.public_id);
        } catch (cloudinaryError) {
          console.error(
            `Cloudinary deletion failed for ${user.email}:`,
            cloudinaryError,
          );
        }
      }

      // Delete the unverified user's MongoDB document.
      return User.deleteOne({ _id: user._id });
    });

    await Promise.all(cleanupPromises);

    return NextResponse.json({
      success: true,
      deletedCount: expiredUsers.length,
    });
  } catch (error) {
    console.error("User cleanup task failed:", error);

    return NextResponse.json(
      { error: "Cleanup failed" },
      { status: 500 },
    );
  }
}