import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PreferencesForm } from "./_components/preferences-form";

export const dynamic = 'force-dynamic';

export default async function PreferencesPage() {
  const user = await getCurrentUser();
  
  const preferences = await prisma.userPreference.findUnique({
    where: { userId: user.id },
  });

  const initialValues = preferences ? {
    ...preferences,
    salaryMin: preferences.salaryMin ?? undefined,
    salaryMax: preferences.salaryMax ?? undefined,
    salaryCurrency: preferences.salaryCurrency ?? undefined,
  } : undefined;

  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-8">Preferences</h1>
      <PreferencesForm initialValues={initialValues} />
    </div>
  );
}
