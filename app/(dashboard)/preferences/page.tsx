import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PreferencesForm } from "./_components/preferences-form";
import { CompanySize, EmploymentType, WorkType } from "@prisma/client";

export const dynamic = "force-dynamic";

function jsonToStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

export default async function PreferencesPage() {
  const user = await getCurrentUser();

  const preferences = await prisma.userPreference.findUnique({
    where: { userId: user.id },
  });

  const initialValues = preferences
    ? {
        targetRoles: jsonToStringArray(preferences.targetRoles),
        targetLocations: jsonToStringArray(preferences.targetLocations),
        experienceLevel: preferences.experienceLevel,
        workTypes: jsonToStringArray(preferences.workTypes).filter((v): v is WorkType =>
          Object.values(WorkType).includes(v as WorkType),
        ),
        employmentTypes: jsonToStringArray(preferences.employmentTypes).filter(
          (v): v is EmploymentType => Object.values(EmploymentType).includes(v as EmploymentType),
        ),
        companySizes: jsonToStringArray(preferences.companySizes).filter((v): v is CompanySize =>
          Object.values(CompanySize).includes(v as CompanySize),
        ),
        salaryMin: preferences.salaryMin ?? undefined,
        salaryMax: preferences.salaryMax ?? undefined,
        salaryCurrency: preferences.salaryCurrency ?? undefined,
      }
    : undefined;

  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-8">Preferences</h1>
      <PreferencesForm initialValues={initialValues} />
    </div>
  );
}
