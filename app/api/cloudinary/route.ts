// app/api/cloudinary/route.ts

import { NextRequest, NextResponse } from "next/server";
import {
  CloudinaryUploadResult,
  deleteFromCloudinary,
  uploadToCloudinary,
} from "@/utils/files/cloudinary";
import { validateMediaFiles } from "@/utils/files/validateFileFormat";

type CloudinaryErrorResponse = {
  message: string;
};

type CloudinarySuccessResponse = {
  success: boolean;
};

export const runtime = "nodejs";

const MAX_FILES = 10;
const MAX_TOTAL_SIZE = 200 * 1024 * 1024;

export async function POST(
  request: NextRequest,
): Promise<NextResponse<CloudinaryUploadResult[] | CloudinaryErrorResponse>> {
  try {
    const formData = await request.formData();

    const files: File[] = [];
    let path: string | undefined;

    for (const [key, value] of formData.entries()) {
      if (key === "files" && value instanceof File) {
        files.push(value);
      }

      if (key === "path" && typeof value === "string") {
        path = value.trim() || undefined;
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        {
          message: "No files were provided.",
        },
        {
          status: 400,
        },
      );
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        {
          message: `Too many files. Maximum ${MAX_FILES} files allowed.`,
        },
        {
          status: 400,
        },
      );
    }

    const totalSize = files.reduce(
      (total, file) => total + file.size,
      0,
    );

    if (totalSize > MAX_TOTAL_SIZE) {
      return NextResponse.json(
        {
          message: "Total upload size exceeds 200 MB.",
        },
        {
          status: 400,
        },
      );
    }

    const validation = await validateMediaFiles(
      files.map((file) => ({
        mimetype: file.type,
        size: file.size,
        name: file.name,
      })),
    );

    if (!validation.valid) {
      return NextResponse.json(
        {
          message: validation.message || "Invalid file.",
        },
        {
          status: 400,
        },
      );
    }

    const results: CloudinaryUploadResult[] = [];

    for (const file of files) {
      const uploadedFile = await uploadToCloudinary(file, path);

      results.push(uploadedFile);
    }

    return NextResponse.json(results, {
      status: 200,
    });
  } catch (error) {
    console.error("POST /api/cloudinary error:", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Cloudinary upload failed.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(
  request: NextRequest,
): Promise<NextResponse<CloudinarySuccessResponse | CloudinaryErrorResponse>> {
  try {
    const body = await request.json();

    const publicId =
      typeof body.public_id === "string" ? body.public_id.trim() : "";

    if (!publicId) {
      return NextResponse.json(
        {
          message: "No public_id provided.",
        },
        {
          status: 400,
        },
      );
    }

    await deleteFromCloudinary(publicId);

    return NextResponse.json(
      {
        success: true,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("DELETE /api/cloudinary error:", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Cloudinary delete failed.",
      },
      {
        status: 500,
      },
    );
  }
}