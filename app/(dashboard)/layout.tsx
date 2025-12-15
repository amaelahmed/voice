import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { clearSession, getSession } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <nav className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-black dark:text-white">
              Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {session.email}
            </span>
            <LogoutButton />
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}

function LogoutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await clearSession();
        redirect("/auth/login");
      }}
    >
      <button
        type="submit"
        className="rounded-md bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700"
      >
        Logout
      </button>
    </form>
  );
}
