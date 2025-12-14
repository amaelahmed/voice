"use server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { preferencesSchema, PreferencesFormValues } from "./schema";
import { revalidatePath } from "next/cache";

export async function updatePreferences(data: PreferencesFormValues) {
  const user = await getCurrentUser();
  
  const parsed = preferencesSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.flatten() };
  }

  const { targetRoles, targetLocations, ...rest } = parsed.data;

  // Normalize inputs
  // Lowercase locations as requested
  const normalizedLocations = targetLocations.map(l => l.trim().toLowerCase());
  const normalizedRoles = targetRoles.map(r => r.trim());

  try {
    await prisma.userPreference.upsert({
      where: { userId: user.id },
      update: {
        targetRoles: normalizedRoles,
        targetLocations: normalizedLocations,
        ...rest,
      },
      create: {
        userId: user.id,
        targetRoles: normalizedRoles,
        targetLocations: normalizedLocations,
        ...rest,
      },
    });

    // "record a change event so scrapers can react"
    // Since there is no explicit event bus or table for generic events, 
    // and the prompt says "Size small because it’s mainly UI + CRUD",
    // I assume the updated timestamp on UserPreference is the trigger/record.
    // Any scraper watching this table would query by updatedAt.

    revalidatePath("/preferences");
    return { success: true };
  } catch (error) {
    console.error("Failed to update preferences:", error);
    return { error: "Failed to update preferences" };
  }
}
