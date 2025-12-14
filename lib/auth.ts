import { prisma } from "@/lib/db";

export async function getCurrentUser() {
  // Mock authentication for development
  // In a real app, this would use session/token validation
  
  // Try to find the mock user
  let user = await prisma.user.findFirst({
    where: { email: "test@example.com" },
  });

  // If not found, create one (auto-provisioning for dev)
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: "test@example.com",
      },
    });
  }

  return user;
}
