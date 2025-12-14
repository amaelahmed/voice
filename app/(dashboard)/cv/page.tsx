"use client";

import { useState, useEffect, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import clsx from "clsx";

interface CvDocument {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
}

interface ParsedCvData {
  id: string;
  headline?: string;
  summary?: string;
  parsingStatus: string;
  parsingError?: string;
  experiences: Array<{
    id: string;
    jobTitle: string;
    company: string;
    location?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    current?: boolean;
  }>;
  skills: Array<{
    id: string;
    name: string;
    proficiency?: string;
  }>;
  educations: Array<{
    id: string;
    degree: string;
    school: string;
    fieldOfStudy?: string;
  }>;
}

interface ApiResponse {
  cvDocument: CvDocument;
  parsedCv: ParsedCvData;
}

export default function CvDashboard() {
  const [cvData, setCvData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string>("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [reparseLoading, setReparseLoading] = useState(false);

  // Fetch CV data on mount
  useEffect(() => {
    fetchCvData();
  }, []);

  const fetchCvData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/cv");
      if (response.ok) {
        const data = await response.json();
        setCvData(data.cvDocument);
      }
    } catch (error) {
      console.error("Failed to fetch CV data:", error);
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) {
      setError("No valid files selected");
      return;
    }

    const file = acceptedFiles[0];
    setError("");
    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 100);

      const response = await fetch("/api/cv", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Upload failed");
        return;
      }

      setCvData(data);
      setTimeout(() => setProgress(0), 500);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Upload failed"
      );
    } finally {
      setUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
        ".docx",
      ],
    },
    disabled: uploading,
  });

  const handleDelete = async () => {
    if (!cvData?.cvDocument.id) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/cv?id=${cvData.cvDocument.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setCvData(null);
        setDeleteConfirm(false);
      } else {
        setError("Failed to delete CV");
      }
    } catch {
      setError("Failed to delete CV");
    } finally {
      setLoading(false);
    }
  };

  const handleReparse = async () => {
    if (!cvData?.cvDocument.id) return;

    try {
      setReparseLoading(true);
      const response = await fetch("/api/cv/reparse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvDocumentId: cvData.cvDocument.id }),
      });

      const data = await response.json();

      if (response.ok && cvData) {
        setCvData({
          ...cvData,
          parsedCv: data.parsedCv,
        });
      } else {
        setError(data.error || "Reparse failed");
      }
    } catch {
      setError("Reparse failed");
    } finally {
      setReparseLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Upload Section */}
      <div className="rounded-lg border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-xl font-bold text-black dark:text-white">
          Upload Your CV
        </h2>

        <div
          {...getRootProps()}
          className={clsx(
            "cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors",
            isDragActive
              ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950"
              : "border-gray-300 dark:border-gray-700",
            uploading && "pointer-events-none opacity-50"
          )}
        >
          <input {...getInputProps()} />

          <div className="space-y-2">
            <div className="text-4xl">📄</div>
            {isDragActive ? (
              <p className="text-blue-600 dark:text-blue-400">
                Drop your CV here...
              </p>
            ) : (
              <div>
                <p className="font-medium text-black dark:text-white">
                  Drag and drop your CV here
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  or click to select (PDF or DOCX, max 10MB)
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {uploading && progress > 0 && (
          <div className="mt-4 space-y-2">
            <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-full bg-blue-600 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {progress}% uploaded
            </p>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}
      </div>

      {/* CV Data Display */}
      {cvData && (
        <div className="space-y-6">
          {/* Document Info */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-zinc-900">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-black dark:text-white">
                  {cvData.cvDocument.fileName}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Uploaded on{" "}
                  {new Date(cvData.cvDocument.uploadedAt).toLocaleDateString()}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {(cvData.cvDocument.fileSize / 1024).toFixed(1)} KB
                </p>
              </div>

              <div className="flex gap-2">
                {cvData.parsedCv?.parsingStatus === "SUCCESS" && (
                  <button
                    onClick={handleReparse}
                    disabled={reparseLoading}
                    className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50 dark:bg-amber-700"
                  >
                    {reparseLoading ? "Reparsing..." : "Reparse"}
                  </button>
                )}

                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 dark:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>

          {/* Delete Confirmation */}
          {deleteConfirm && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/30 dark:bg-red-950/20">
              <p className="font-medium text-red-900 dark:text-red-100">
                Are you sure? This action cannot be undone.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? "Deleting..." : "Confirm Delete"}
                </button>
                <button
                  onClick={() => setDeleteConfirm(false)}
                  className="rounded-md bg-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-400 dark:bg-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Parsing Status */}
          {cvData.parsedCv && (
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-zinc-900">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-black dark:text-white">
                    Parsing Status
                  </h3>
                  <span
                    className={clsx(
                      "rounded-full px-3 py-1 text-xs font-medium",
                      cvData.parsedCv.parsingStatus === "SUCCESS"
                        ? "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400"
                        : cvData.parsedCv.parsingStatus === "FAILED"
                          ? "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400"
                          : "bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400"
                    )}
                  >
                    {cvData.parsedCv.parsingStatus}
                  </span>
                </div>

                {cvData.parsedCv.parsingError && (
                  <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                    <p className="font-medium">Parsing Error</p>
                    <p className="mt-1">{cvData.parsedCv.parsingError}</p>
                  </div>
                )}
              </div>

              {cvData.parsedCv.parsingStatus === "SUCCESS" && (
                <>
                  {/* Headline & Summary */}
                  {(cvData.parsedCv.headline || cvData.parsedCv.summary) && (
                    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-zinc-900">
                      {cvData.parsedCv.headline && (
                        <div>
                          <h3 className="text-lg font-semibold text-black dark:text-white">
                            {cvData.parsedCv.headline}
                          </h3>
                        </div>
                      )}

                      {cvData.parsedCv.summary && (
                        <div className="mt-3">
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {cvData.parsedCv.summary}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Experience */}
                  {cvData.parsedCv.experiences.length > 0 && (
                    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-zinc-900">
                      <h3 className="mb-4 font-semibold text-black dark:text-white">
                        Experience
                      </h3>

                      <div className="space-y-4">
                        {cvData.parsedCv.experiences.map((exp) => (
                          <div
                            key={exp.id}
                            className="border-l-4 border-blue-500 pl-4"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-black dark:text-white">
                                  {exp.jobTitle}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {exp.company}
                                  {exp.location && ` • ${exp.location}`}
                                </p>
                              </div>
                              {exp.current && (
                                <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-950/30 dark:text-green-400">
                                  Current
                                </span>
                              )}
                            </div>

                            {exp.description && (
                              <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                                {exp.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Skills */}
                  {cvData.parsedCv.skills.length > 0 && (
                    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-zinc-900">
                      <h3 className="mb-4 font-semibold text-black dark:text-white">
                        Skills
                      </h3>

                      <div className="flex flex-wrap gap-2">
                        {cvData.parsedCv.skills.map((skill) => (
                          <span
                            key={skill.id}
                            className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 dark:bg-blue-950/30 dark:text-blue-400"
                          >
                            {skill.name}
                            {skill.proficiency && (
                              <span className="ml-2 text-xs opacity-75">
                                ({skill.proficiency})
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Education */}
                  {cvData.parsedCv.educations.length > 0 && (
                    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-zinc-900">
                      <h3 className="mb-4 font-semibold text-black dark:text-white">
                        Education
                      </h3>

                      <div className="space-y-4">
                        {cvData.parsedCv.educations.map((edu) => (
                          <div key={edu.id} className="border-l-4 border-purple-500 pl-4">
                            <p className="font-medium text-black dark:text-white">
                              {edu.degree}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {edu.school}
                              {edu.fieldOfStudy && ` • ${edu.fieldOfStudy}`}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {!cvData && !loading && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-12 text-center dark:border-gray-700 dark:bg-zinc-950">
          <p className="text-gray-600 dark:text-gray-400">
            No CV uploaded yet. Upload one to get started.
          </p>
        </div>
      )}

      {loading && !cvData && (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-zinc-900">
          <div className="inline-block animate-spin">
            <div className="h-8 w-8 border-4 border-gray-300 border-t-blue-600 rounded-full"></div>
          </div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Loading your CV...
          </p>
        </div>
      )}
    </div>
  );
}
