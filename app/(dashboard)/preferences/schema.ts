import { z } from "zod";
import { ExperienceLevel, WorkType, EmploymentType, CompanySize } from "@prisma/client";

export const preferencesSchema = z.object({
  targetRoles: z.array(z.string()).min(1, "At least one target role is required"),
  targetLocations: z.array(z.string()).min(1, "At least one location is required"),
  experienceLevel: z.nativeEnum(ExperienceLevel),
  workTypes: z.array(z.nativeEnum(WorkType)).min(1, "At least one work type is required"),
  employmentTypes: z.array(z.nativeEnum(EmploymentType)).default([]),
  companySizes: z.array(z.nativeEnum(CompanySize)).default([]),
  salaryMin: z.coerce.number().min(0).optional(),
  salaryMax: z.coerce.number().min(0).optional(),
  salaryCurrency: z.string().default("USD"),
}).refine((data) => {
  if (data.salaryMin !== undefined && data.salaryMax !== undefined && data.salaryMin !== null && data.salaryMax !== null) {
    return data.salaryMin <= data.salaryMax;
  }
  return true;
}, {
  message: "Minimum salary cannot be greater than maximum salary",
  path: ["salaryMin"], 
});

export type PreferencesFormValues = z.infer<typeof preferencesSchema>;
