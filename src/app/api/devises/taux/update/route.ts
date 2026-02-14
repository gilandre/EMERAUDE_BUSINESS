import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { conversionService } from "@/services/devises/conversion.service";

export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canUpdate = await hasPermission(session.user.id, "config:update");
  if (!canUpdate) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await conversionService.mettreAJourTauxAPI();

    return NextResponse.json({
      success: true,
      message: "Taux de change mis à jour",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Erreur mise à jour taux" },
      { status: 500 }
    );
  }
}
