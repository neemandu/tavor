import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Step 1: get a signed upload URL
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const courseId = searchParams.get("courseId");
  const fileName = searchParams.get("fileName");

  if (!courseId || !fileName) {
    return NextResponse.json({ error: "חסרים פרמטרים" }, { status: 400 });
  }

  const safeName = fileName
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    || "handbook";
  const filePath = `${courseId}/${Date.now()}_${safeName}.pdf`;

  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase.storage
    .from("handbooks")
    .createSignedUploadUrl(filePath);

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "שגיאה" }, { status: 500 });
  }

  return NextResponse.json({ signedUrl: data.signedUrl, filePath });
}

// Step 2: update DB record after client has uploaded the file
export async function POST(request: NextRequest) {
  try {
    const { courseId, filePath, fileName } = await request.json() as {
      courseId: string;
      filePath: string;
      fileName: string;
    };

    if (!courseId || !filePath || !fileName) {
      return NextResponse.json({ error: "חסרים פרמטרים" }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    const { data: existing } = await adminSupabase
      .from("handbooks")
      .select("file_path")
      .eq("course_id", courseId)
      .maybeSingle();

    await adminSupabase.from("handbooks").delete().eq("course_id", courseId);
    const { error: dbError } = await adminSupabase
      .from("handbooks")
      .insert({ course_id: courseId, file_path: filePath, file_name: fileName });

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    if (existing?.file_path && existing.file_path !== filePath) {
      await adminSupabase.storage.from("handbooks").remove([existing.file_path]);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Handbook DB update error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
