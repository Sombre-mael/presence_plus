import { NextResponse } from "next/server";
import { getBusinessViewer } from "@/lib/authenticated-viewer";
import { listNotificationsForUser } from "@/lib/notifications.server";

export async function GET() {
  const viewer = await getBusinessViewer();
  if (!viewer) {
    return NextResponse.json({ message: "Non autorisé." }, {
      status: 401,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
  const data = await listNotificationsForUser(viewer.id, 8);
  return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
}
