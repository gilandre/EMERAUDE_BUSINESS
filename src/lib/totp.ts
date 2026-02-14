/**
 * 2FA TOTP avec speakeasy.
 */

import speakeasy from "speakeasy";
import QRCode from "qrcode";
import crypto from "crypto";

const APP_NAME = "Emeraude Business";

export function generateSecret(email: string): { secret: string; otpauthUrl: string } {
  const secret = speakeasy.generateSecret({
    name: `${APP_NAME} (${email})`,
    length: 32,
  });
  return {
    secret: secret.base32,
    otpauthUrl: secret.otpauth_url ?? "",
  };
}

export function verifyToken(secret: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token,
    window: 1,
  });
}

export async function generateQrCode(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl);
}

export function generateBackupCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
}

export function hashBackupCode(code: string): string {
  return crypto.createHash("sha256").update(code.replace(/-/g, "").toLowerCase()).digest("hex");
}

export function verifyBackupCode(hashedCodes: string[], code: string): boolean {
  const hash = hashBackupCode(code);
  return hashedCodes.includes(hash);
}
