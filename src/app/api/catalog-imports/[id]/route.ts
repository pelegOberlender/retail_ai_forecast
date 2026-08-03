import { getCatalogPreviewPage } from "@/lib/catalogImports";
import { getUser } from "@/lib/supabase/server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;
  const url = new URL(request.url);
  const page = Number.parseInt(url.searchParams.get("page") ?? "1", 10);
  const pageSize = Number.parseInt(url.searchParams.get("pageSize") ?? "12", 10);
  const previewPage = await getCatalogPreviewPage(id, { page, pageSize });
  if (!previewPage) return Response.json({ error: "Catalog import not found." }, { status: 404 });
  return Response.json(
    { previewPage },
    { headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=300" } }
  );
}
