"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { preferencesSchema, PreferencesFormValues } from "../schema";
import { updatePreferences } from "../actions";
import { ExperienceLevel, WorkType, EmploymentType, CompanySize } from "@prisma/client";
import { useState } from "react";

const formatEnum = (str: string) => str.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, l => l.toUpperCase());

type Props = {
  initialValues?: Partial<PreferencesFormValues>;
};

export function PreferencesForm({ initialValues }: Props) {
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Local state for text inputs to allow comfortable typing (e.g. trailing commas)
  const [rolesInput, setRolesInput] = useState(initialValues?.targetRoles?.join(", ") || "");
  const [locationsInput, setLocationsInput] = useState(initialValues?.targetLocations?.join(", ") || "");

  const form = useForm<PreferencesFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(preferencesSchema) as any,
    defaultValues: {
      targetRoles: initialValues?.targetRoles || [],
      targetLocations: initialValues?.targetLocations || [],
      experienceLevel: initialValues?.experienceLevel || ExperienceLevel.MID,
      workTypes: initialValues?.workTypes || [],
      employmentTypes: initialValues?.employmentTypes || [],
      companySizes: initialValues?.companySizes || [],
      salaryMin: initialValues?.salaryMin,
      salaryMax: initialValues?.salaryMax,
      salaryCurrency: initialValues?.salaryCurrency || "USD",
    },
  });

  const onSubmit = async (data: PreferencesFormValues) => {
    setIsPending(true);
    setMessage(null);
    try {
      const result = await updatePreferences(data);
      if (result.error) {
         // Handle error object from server (flattened Zod error or string)
         const errorText = typeof result.error === 'string' 
           ? result.error 
           : "Please check the form for errors.";
         setMessage({ type: 'error', text: errorText });
         
         if (typeof result.error !== 'string') {
             // We could manually set errors here if we wanted to
         }
      } else {
         setMessage({ type: 'success', text: 'Preferences saved successfully. Scrapers will use these settings for your next job search.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-2xl bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800">
      
      <div className="space-y-1 border-b border-zinc-200 dark:border-zinc-800 pb-4 mb-4">
          <h2 className="text-xl font-semibold">Job Search Intent</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Configure your preferences to help our scrapers find the best matches for you.
            These settings directly influence the job matching algorithm.
          </p>
      </div>

      {message && (
        <div className={`p-4 rounded border ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {message.text}
        </div>
      )}

      {/* Target Roles */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Target Roles (comma separated)</label>
        <Controller
          name="targetRoles"
          control={form.control}
          render={({ field }) => (
            <input
              type="text"
              className="w-full p-2 border rounded bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700"
              placeholder="e.g. Frontend Engineer, Full Stack Developer"
              value={rolesInput}
              onChange={(e) => setRolesInput(e.target.value)}
              onBlur={() => {
                const roles = rolesInput.split(",").map(s => s.trim()).filter(Boolean);
                field.onChange(roles);
                field.onBlur();
              }}
            />
          )}
        />
        {form.formState.errors.targetRoles && <p className="text-red-500 text-sm">{form.formState.errors.targetRoles.message}</p>}
      </div>

      {/* Target Locations */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Target Locations (comma separated)</label>
         <Controller
          name="targetLocations"
          control={form.control}
          render={({ field }) => (
            <input
              type="text"
              className="w-full p-2 border rounded bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700"
              placeholder="e.g. New York, London, Berlin"
              value={locationsInput}
              onChange={(e) => setLocationsInput(e.target.value)}
              onBlur={() => {
                const locs = locationsInput.split(",").map(s => s.trim()).filter(Boolean);
                field.onChange(locs);
                field.onBlur();
              }}
            />
          )}
        />
        {form.formState.errors.targetLocations && <p className="text-red-500 text-sm">{form.formState.errors.targetLocations.message}</p>}
      </div>

      {/* Work Types */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Work Types</label>
        <div className="flex gap-4">
          {Object.values(WorkType).map((type) => (
             <label key={type} className="flex items-center gap-2 cursor-pointer">
               <input
                 type="checkbox"
                 value={type}
                 checked={form.watch("workTypes").includes(type)}
                 onChange={(e) => {
                   const checked = e.target.checked;
                   const current = form.getValues("workTypes");
                   if (checked) {
                     form.setValue("workTypes", [...current, type], { shouldValidate: true });
                   } else {
                     form.setValue("workTypes", current.filter(t => t !== type), { shouldValidate: true });
                   }
                 }}
                 className="rounded border-gray-300"
               />
               <span>{formatEnum(type)}</span>
             </label>
          ))}
        </div>
        {form.formState.errors.workTypes && <p className="text-red-500 text-sm">{form.formState.errors.workTypes.message}</p>}
      </div>

      {/* Experience Level */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Experience Level</label>
        <select 
          {...form.register("experienceLevel")} 
          className="w-full p-2 border rounded bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700"
        >
          {Object.values(ExperienceLevel).map((level) => (
            <option key={level} value={level}>{formatEnum(level)}</option>
          ))}
        </select>
        {form.formState.errors.experienceLevel && <p className="text-red-500 text-sm">{form.formState.errors.experienceLevel.message}</p>}
      </div>

      {/* Salary Range */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
           <label className="block text-sm font-medium">Min Salary ({form.watch("salaryCurrency")})</label>
           <input
             type="number"
             {...form.register("salaryMin")}
             placeholder="0"
             className="w-full p-2 border rounded bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700"
           />
           {form.formState.errors.salaryMin && <p className="text-red-500 text-sm">{form.formState.errors.salaryMin.message}</p>}
        </div>
         <div className="space-y-2">
           <label className="block text-sm font-medium">Max Salary</label>
           <input
             type="number"
             {...form.register("salaryMax")}
             placeholder="e.g. 150000"
             className="w-full p-2 border rounded bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700"
           />
           {form.formState.errors.salaryMax && <p className="text-red-500 text-sm">{form.formState.errors.salaryMax.message}</p>}
        </div>
      </div>

      {/* Employment Types */}
       <div className="space-y-2">
        <label className="block text-sm font-medium">Employment Types</label>
        <div className="flex flex-wrap gap-4">
          {Object.values(EmploymentType).map((type) => (
             <label key={type} className="flex items-center gap-2 cursor-pointer">
               <input
                 type="checkbox"
                 value={type}
                 checked={form.watch("employmentTypes")?.includes(type)}
                 onChange={(e) => {
                   const checked = e.target.checked;
                   const current = form.getValues("employmentTypes") || [];
                   if (checked) {
                     form.setValue("employmentTypes", [...current, type], { shouldValidate: true });
                   } else {
                     form.setValue("employmentTypes", current.filter(t => t !== type), { shouldValidate: true });
                   }
                 }}
                 className="rounded border-gray-300"
               />
               <span>{formatEnum(type)}</span>
             </label>
          ))}
        </div>
      </div>

      {/* Company Sizes */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Company Sizes</label>
        <div className="flex flex-wrap gap-4">
          {Object.values(CompanySize).map((size) => (
             <label key={size} className="flex items-center gap-2 cursor-pointer">
               <input
                 type="checkbox"
                 value={size}
                 checked={form.watch("companySizes")?.includes(size)}
                 onChange={(e) => {
                   const checked = e.target.checked;
                   const current = form.getValues("companySizes") || [];
                   if (checked) {
                     form.setValue("companySizes", [...current, size], { shouldValidate: true });
                   } else {
                     form.setValue("companySizes", current.filter(t => t !== size), { shouldValidate: true });
                   }
                 }}
                 className="rounded border-gray-300"
               />
               <span>{formatEnum(size)}</span>
             </label>
          ))}
        </div>
      </div>
      
      <div className="pt-4 flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="bg-black dark:bg-white text-white dark:text-black px-6 py-2 rounded font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {isPending ? "Saving..." : "Save Preferences"}
        </button>
      </div>
    </form>
  );
}
