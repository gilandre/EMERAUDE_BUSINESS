import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, verifyBackupCode, hashBackupCode } from "@/lib/totp";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { userId, token, backupCode } = body;
  if (!userId) {
    return NextResponse.json({ error: "userId requis" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totpSecret: true, totpEnabled: true, backupCodes: true },
  });
  if (!user || !user.totpEnabled) {
    return NextResponse.json({ error: "2FA non configuré" }, { status: 400 });
  }

  if (backupCode) {
    const codeNormalized = backupCode.replace(/\s/g, "").replace(/-/g, "").toUpperCase();
    const valid = verifyBackupCode(user.backupCodes, codeNormalized);
    if (!valid) {
      return NextResponse.json({ error: "Code de secours invalide" }, { status: 400 });
    }
    // Retirer le code utilisé pour éviter la réutilisation
    const hash = hashBackupCode(codeNormalized);
    const newCodes = user.backupCodes.filter((h) => h !== hash);
    await prisma.user.update({
      where: { id: userId },
      data: { backupCodes: newCodes },
    });
    return NextResponse.json({ success: true, method: "backup" });
  }

  if (!token) {
    return NextResponse.json({ error: "Code TOTP requis" }, { status: 400 });
  }
  const valid = verifyToken(user.totpSecret!, token.replace(/\s/g, ""));
  if (!valid) {
    return NextResponse.json({ error: "Code invalide" }, { status: 400 });
  }
  return NextResponse.json({ success: true, method: "totp" });
}
