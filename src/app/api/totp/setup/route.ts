import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateSecret, generateQrCode, generateBackupCodes, hashBackupCode } from "@/lib/totp";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, totpEnabled: true },
  });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  if (user.totpEnabled) {
    return NextResponse.json({ error: "2FA déjà activé" }, { status: 400 });
  }

  const { secret, otpauthUrl } = generateSecret(user.email ?? session.user.email ?? "");
  const qrDataUrl = await generateQrCode(otpauthUrl);
  const backupCodes = generateBackupCodes(10);
  const hashedBackupCodes = backupCodes.map((c) => hashBackupCode(c));

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      totpSecret: secret,
      totpEnabled: false,
      backupCodes: hashedBackupCodes,
    },
  });

  return NextResponse.json({
    secret,
    qrCode: qrDataUrl,
    backupCodes,
    message: "Configurez votre application 2FA et sauvegardez les codes de secours",
  });
}
