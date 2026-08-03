import { downloadCatalogImage } from "@/lib/catalogStorage";
import { getUser } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });

  const path = new URL(request.url).searchParams.get("path");
  if (!path) return Response.json({ error: "Image path is required." }, { status: 400 });

  try {
    const image = await downloadCatalogImage(path);
    return new Response(image.body, {
      headers: {
        "Content-Type": image.contentType,
        "Cache-Control": "private, max-age=3600, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return Response.json({ error: "Image not found." }, { status: 404 });
  }
}
