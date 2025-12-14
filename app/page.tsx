"use client";

import { useState, useRef } from "react";

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [shareableLink, setShareableLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
      setAudioBlob(null);
      setAudioUrl(null);
      setShareableLink(null);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setError("Could not access microphone. Please ensure you have granted permission.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const uploadRecording = async () => {
    if (!audioBlob) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    // Append the file. We name it "recording.webm" but server will rename it.
    // Important: pass the blob and a filename so backend sees it as a file.
    formData.append("file", audioBlob, "recording.webm");

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      const { id } = data;
      
      // Construct the shareable link
      // We'll point to a page that plays the audio
      const link = `${window.location.origin}/recording/${id}`;
      setShareableLink(link);
    } catch (err) {
      console.error("Upload error:", err);
      setError("Failed to upload recording.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-4 text-zinc-900 dark:bg-black dark:text-zinc-50 font-sans">
      <main className="flex w-full max-w-md flex-col items-center gap-8 rounded-2xl bg-white p-8 shadow-xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        <h1 className="text-3xl font-bold tracking-tight">Voice Recorder</h1>
        
        <div className="flex flex-col items-center gap-4 w-full">
          {!isRecording ? (
             <button
              onClick={startRecording}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500 hover:bg-red-600 transition-all focus:outline-none focus:ring-4 focus:ring-red-300 dark:focus:ring-red-900 shadow-lg"
              title="Start Recording"
            >
              <div className="h-8 w-8 rounded-full bg-white"></div>
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600 transition-all focus:outline-none focus:ring-4 focus:ring-zinc-300 dark:focus:ring-zinc-800 shadow-lg animate-pulse"
              title="Stop Recording"
            >
              <div className="h-8 w-8 rounded bg-white"></div>
            </button>
          )}
          
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {isRecording ? "Recording..." : audioBlob ? "Recording finished" : "Tap to record"}
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400 w-full text-center">
            {error}
          </div>
        )}

        {audioUrl && !isRecording && (
          <div className="flex flex-col gap-4 w-full">
            <audio src={audioUrl} controls className="w-full" />
            
            {!shareableLink && (
              <button
                onClick={uploadRecording}
                disabled={uploading}
                className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? "Generating Link..." : "Create Shareable Link"}
              </button>
            )}
          </div>
        )}

        {shareableLink && (
          <div className="w-full rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Shareable Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={shareableLink}
                className="flex-1 rounded-md border-0 bg-white px-3 py-1.5 text-sm text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-zinc-700"
              />
              <button
                onClick={() => {
                    navigator.clipboard.writeText(shareableLink);
                    alert("Copied to clipboard!");
                }}
                className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-300 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700 dark:hover:bg-zinc-700"
              >
                Copy
              </button>
            </div>
             <a href={shareableLink} target="_blank" className="mt-3 block text-center text-sm text-blue-600 hover:underline dark:text-blue-400">
                Open Link
             </a>
          </div>
        )}
      </main>
    </div>
  );
}
