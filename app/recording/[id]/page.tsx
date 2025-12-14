import Link from "next/link";

export default async function RecordingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const audioUrl = `/api/audio/${id}`;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-4 text-zinc-900 dark:bg-black dark:text-zinc-50 font-sans">
      <main className="flex w-full max-w-md flex-col items-center gap-8 rounded-2xl bg-white p-8 shadow-xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        <h1 className="text-2xl font-bold tracking-tight">Shared Recording</h1>
        
        <div className="w-full flex flex-col items-center gap-6">
          <div className="w-full rounded-lg bg-zinc-100 p-6 dark:bg-zinc-800 flex flex-col items-center justify-center gap-4">
             <div className="text-6xl">🎧</div>
             <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Recording ID: <span className="font-mono text-zinc-700 dark:text-zinc-300">{id}</span>
             </p>
          </div>

          <audio src={audioUrl} controls className="w-full" autoPlay />
          
          <div className="w-full border-t border-zinc-200 dark:border-zinc-800 pt-6">
            <Link
              href="/"
              className="flex w-full items-center justify-center rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:bg-zinc-700 dark:hover:bg-zinc-600"
            >
              Record your own
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
