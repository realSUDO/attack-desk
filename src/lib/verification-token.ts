import { prisma } from "@/lib/prisma";

export function generateVerificationToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createVerificationToken(
  identifier: string,
): Promise<string> {
  const token = generateVerificationToken();
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours

  await prisma.verificationToken.create({
    data: { identifier, token, expires },
  });

  return token;
}

export async function verifyEmailToken(
  token: string,
): Promise<string | null> {
  const record = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!record) return null;
  if (record.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { token } });
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: record.identifier },
  });
  if (!user) return null;

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: new Date() },
  });

  await prisma.verificationToken.delete({ where: { token } });

  return user.id;
}
