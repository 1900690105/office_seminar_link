import { prisma } from "@/lib/prisma";

export async function generateCertificateNumber() {
  const year = new Date().getFullYear().toString().slice(-2);

  const count = await prisma.registration.count({
    where: {
      certificateNumber: {
        not: null,
      },
    },
  });

  const number = String(count + 1).padStart(5, "0");

  return `ES${year}/INT/${number}`;
}
