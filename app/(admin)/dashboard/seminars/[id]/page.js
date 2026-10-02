"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

export default function SeminarDetail({ params }) {
  const [id, setId] = useState("");
  const [seminar, setSeminar] = useState(null);

  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");

  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState("");

  // QR states
  const [qrCode, setQrCode] = useState("");
  const [showQR, setShowQR] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // ---------------------------------------------------------
  // GET SEMINAR ID
  // ---------------------------------------------------------

  useEffect(() => {
    async function getParams() {
      try {
        const resolvedParams = await params;

        if (!resolvedParams?.id) {
          setError("Seminar ID is missing.");
          return;
        }

        setId(resolvedParams.id);
      } catch (err) {
        console.error("PARAM ERROR:", err);
        setError("Invalid seminar URL.");
      }
    }

    getParams();
  }, [params]);

  // ---------------------------------------------------------
  // LOAD SEMINAR
  // ---------------------------------------------------------

  useEffect(() => {
    if (!id) return;

    async function loadSeminar() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`/api/seminars/${id}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        });

        const contentType = response.headers.get("content-type") || "";

        if (!response.ok) {
          const text = await response.text();

          throw new Error(
            text || `Failed to load seminar (${response.status})`,
          );
        }

        if (!contentType.includes("application/json")) {
          const text = await response.text();

          throw new Error(`Expected JSON but received: ${text.slice(0, 200)}`);
        }

        const data = await response.json();

        setSeminar(data);
      } catch (err) {
        console.error("LOAD SEMINAR ERROR:", err);

        setError(err?.message || "Failed to load seminar.");
      } finally {
        setLoading(false);
      }
    }

    loadSeminar();
  }, [id]);

  async function deleteSeminar() {
    const confirmed = window.confirm(
      "Are you sure you want to delete this seminar?\n\n" +
        "This will permanently delete:\n" +
        "• Seminar\n" +
        "• Uploaded resources\n" +
        "• Seminar registrations\n\n" +
        "Student records will NOT be deleted.\n\n" +
        "This action cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      const response = await fetch(`/api/seminars/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to delete seminar");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      console.error("DELETE SEMINAR ERROR:", error);

      setError(error?.message || "Failed to delete seminar");
    }
  }

  // ---------------------------------------------------------
  // GENERATE QR CODE
  // ---------------------------------------------------------

  async function generateQR() {
    try {
      if (!seminar?.slug) {
        setError("Seminar slug is not available.");

        return;
      }

      setQrLoading(true);
      setError("");
      setCopied(false);

      const publicUrl = `${window.location.origin}/s/${seminar.slug}`;

      const qrDataUrl = await QRCode.toDataURL(publicUrl, {
        width: 1200,
        margin: 4,

        errorCorrectionLevel: "H",

        color: {
          dark: "#111827",
          light: "#FFFFFF",
        },
      });

      setQrCode(qrDataUrl);
      setShowQR(true);
    } catch (err) {
      console.error("QR GENERATION ERROR:", err);

      setError(err?.message || "Failed to generate QR code.");
    } finally {
      setQrLoading(false);
    }
  }

  // ---------------------------------------------------------
  // DOWNLOAD QR
  // ---------------------------------------------------------

  function downloadQR() {
    if (!qrCode || !seminar?.slug) {
      return;
    }

    const link = document.createElement("a");

    link.href = qrCode;

    link.download = `${seminar.slug}-seminar-qr.png`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
  }

  // ---------------------------------------------------------
  // COPY STUDENT LINK
  // ---------------------------------------------------------

  async function copyStudentLink() {
    if (!seminar?.slug) return;

    const publicUrl = `${window.location.origin}/s/${seminar.slug}`;

    try {
      await navigator.clipboard.writeText(publicUrl);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error("COPY ERROR:", err);

      setError("Unable to copy the student link.");
    }
  }

  // ---------------------------------------------------------
  // PRINT QR
  // ---------------------------------------------------------

  function printQR() {
    if (!qrCode || !seminar) {
      return;
    }

    const publicUrl = `${window.location.origin}/s/${seminar.slug}`;

    const printWindow = window.open("", "_blank", "width=800,height=900");

    if (!printWindow) {
      setError("Please allow popups to print the QR code.");

      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${escapeHtml(seminar.title)} - QR Code</title>

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 40px;
              font-family: Arial, sans-serif;
              background: #ffffff;
              color: #111827;
              text-align: center;
            }

            .container {
              max-width: 700px;
              margin: 0 auto;
            }

            h1 {
              font-size: 30px;
              margin-bottom: 10px;
            }

            .college {
              font-size: 18px;
              color: #4b5563;
              margin-bottom: 30px;
            }

            .qr {
              width: 500px;
              max-width: 90vw;
              height: auto;
              margin: 20px auto;
            }

            .scan {
              font-size: 24px;
              font-weight: bold;
              margin-top: 20px;
            }

            .instruction {
              font-size: 16px;
              color: #4b5563;
              margin-top: 10px;
            }

            .url {
              margin-top: 25px;
              padding: 12px;
              background: #f3f4f6;
              border-radius: 8px;
              word-break: break-all;
              font-size: 13px;
            }

            @media print {
              body {
                padding: 20px;
              }
            }
          </style>
        </head>

        <body>
          <div class="container">

            <h1>
              ${escapeHtml(seminar.title)}
            </h1>

            ${
              seminar.collegeName
                ? `
                  <div class="college">
                    ${escapeHtml(seminar.collegeName)}
                  </div>
                `
                : ""
            }

            <img
              class="qr"
              src="${qrCode}"
              alt="Seminar QR Code"
            />

            <div class="scan">
              Scan to Register
            </div>

            <div class="instruction">
              Scan this QR code to register
              and access seminar resources.
            </div>

            <div class="url">
              ${escapeHtml(publicUrl)}
            </div>

          </div>
        </body>
      </html>
    `);

    printWindow.document.close();

    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 500);
  }

  // ---------------------------------------------------------
  // UPLOAD RESOURCE
  // ---------------------------------------------------------

  async function upload(event) {
    event.preventDefault();

    if (!file) {
      setError("Please select a file.");

      return;
    }

    try {
      setUploading(true);
      setError("");

      const formData = new FormData();

      formData.append("file", file);

      formData.append("title", title.trim() || file.name);

      const response = await fetch(`/api/seminars/${id}/resources`, {
        method: "POST",
        body: formData,
      });

      const contentType = response.headers.get("content-type") || "";

      let data;

      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();

        data = {
          error: text || `Upload failed (${response.status})`,
        };
      }

      if (!response.ok) {
        throw new Error(data?.error || "Upload failed");
      }

      // Reset form
      setFile(null);
      setTitle("");

      const fileInput = document.getElementById("file");

      if (fileInput) {
        fileInput.value = "";
      }

      // Refresh seminar
      const freshResponse = await fetch(`/api/seminars/${id}`, {
        headers: {
          Accept: "application/json",
        },

        cache: "no-store",
      });

      if (!freshResponse.ok) {
        throw new Error(
          "Resource uploaded, but seminar could not be refreshed.",
        );
      }

      const freshData = await freshResponse.json();

      setSeminar(freshData);
    } catch (err) {
      console.error("UPLOAD ERROR:", err);

      setError(err?.message || "Something went wrong while uploading.");
    } finally {
      setUploading(false);
    }
  }

  // ---------------------------------------------------------
  // ESCAPE HTML FOR PRINT WINDOW
  // ---------------------------------------------------------

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // ---------------------------------------------------------
  // LOADING
  // ---------------------------------------------------------

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-xl bg-white p-8 text-center shadow-sm">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />

            <p className="mt-4 text-sm text-gray-500">Loading seminar...</p>
          </div>
        </div>
      </main>
    );
  }

  // ---------------------------------------------------------
  // ERROR
  // ---------------------------------------------------------

  if (error && !seminar) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700">
            <h2 className="font-semibold">Unable to load seminar</h2>

            <p className="mt-2 text-sm">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  // ---------------------------------------------------------
  // NO SEMINAR
  // ---------------------------------------------------------

  if (!seminar) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-xl bg-white p-8 text-center shadow-sm">
            Seminar not found.
          </div>
        </div>
      </main>
    );
  }

  // ---------------------------------------------------------
  // PUBLIC URL
  // ---------------------------------------------------------

  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/s/${seminar.slug}`
      : `/s/${seminar.slug}`;

  // ---------------------------------------------------------
  // PAGE
  // ---------------------------------------------------------

  return (
    <>
      <header>
        <Header loading={loading} />
      </header>
      <main className="min-h-screen bg-gray-50 p-4 sm:p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* =====================================================
            SEMINAR HEADER
        ====================================================== */}

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-6">
              {/* TITLE */}

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                    {seminar.title}
                  </h1>

                  {seminar.status && (
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                      {seminar.status}
                    </span>
                  )}
                </div>

                {seminar.collegeName && (
                  <p className="mt-2 text-gray-600">{seminar.collegeName}</p>
                )}

                {seminar.description && (
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-500">
                    {seminar.description}
                  </p>
                )}

                {seminar.speakerName && (
                  <p className="mt-3 text-sm text-gray-600">
                    <span className="font-medium">Speaker:</span>{" "}
                    {seminar.speakerName}
                  </p>
                )}
              </div>

              {/* STUDENT LINK */}

              <div className="rounded-xl bg-gray-50 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Student Registration Link
                    </p>

                    <p className="mt-1 break-all text-sm text-blue-600">
                      {publicUrl}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={copyStudentLink}
                    className="shrink-0 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                  >
                    {copied ? "Copied!" : "Copy Link"}
                  </button>
                </div>
              </div>

              {/* QR ACTIONS */}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={generateQR}
                  disabled={qrLoading}
                  className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {qrLoading
                    ? "Generating..."
                    : qrCode
                      ? "Regenerate QR Code"
                      : "Generate QR Code"}
                </button>

                <button
                  type="button"
                  onClick={deleteSeminar}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 transition hover:border-red-300 hover:bg-red-100 focus:outline-none focus:ring-4 focus:ring-red-100"
                >
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v5" />
                    <path d="M14 11v5" />
                  </svg>
                  Delete Seminar
                </button>

                {qrCode && (
                  <>
                    <button
                      type="button"
                      onClick={downloadQR}
                      className="rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                    >
                      Download QR
                    </button>

                    <button
                      type="button"
                      onClick={printQR}
                      className="rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                    >
                      Print QR
                    </button>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* =====================================================
            ERROR
        ====================================================== */}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* =====================================================
            QR CODE
        ====================================================== */}

          {showQR && qrCode && (
            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex flex-col items-center">
                <div className="w-full">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Seminar QR Code
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Students can scan this QR code to register for the seminar
                    and access the uploaded resources.
                  </p>
                </div>

                {/* QR */}

                <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <img
                    src={qrCode}
                    alt={`QR code for ${seminar.title}`}
                    className="h-72 w-72 sm:h-96 sm:w-96"
                  />
                </div>

                {/* SCAN MESSAGE */}

                <div className="mt-5 text-center">
                  <p className="text-lg font-semibold text-gray-900">
                    Scan to Register
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    Scan this QR code with a mobile phone camera.
                  </p>
                </div>

                {/* URL */}

                <div className="mt-5 w-full max-w-2xl rounded-xl bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Student URL
                  </p>

                  <p className="mt-2 break-all text-sm text-gray-700">
                    {publicUrl}
                  </p>
                </div>

                {/* ACTIONS */}

                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    onClick={downloadQR}
                    className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    Download PNG
                  </button>

                  <button
                    type="button"
                    onClick={printQR}
                    className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    Print QR
                  </button>

                  <button
                    type="button"
                    onClick={copyStudentLink}
                    className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    {copied ? "Copied!" : "Copy Student Link"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowQR(false)}
                    className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* =====================================================
            UPLOAD RESOURCE
        ====================================================== */}

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">
              Upload Resource
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Upload presentations, PDFs, documents or other seminar material.
            </p>

            <form onSubmit={upload} className="mt-6 space-y-5">
              {/* TITLE */}

              <div>
                <label
                  htmlFor="resource-title"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Resource Title
                </label>

                <input
                  id="resource-title"
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Example: Full Stack Web Development PPT"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* FILE */}

              <div>
                <label
                  htmlFor="file"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  File
                </label>

                <input
                  id="file"
                  type="file"
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                  accept=".pdf,.ppt,.pptx,.doc,.docx"
                  className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm"
                />

                <p className="mt-2 text-xs text-gray-500">
                  Allowed: PDF, PPT, PPTX, DOC, DOCX. Maximum size: 25MB.
                </p>
              </div>

              {/* SELECTED FILE */}

              {file && (
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-sm font-medium text-gray-800">
                    Selected file
                  </p>

                  <p className="mt-1 break-all text-sm text-gray-500">
                    {file.name}
                  </p>

                  <p className="mt-1 text-xs text-gray-400">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              )}

              {/* UPLOAD */}

              <button
                type="submit"
                disabled={uploading || !file}
                className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {uploading ? "Uploading..." : "Upload Resource"}
              </button>
            </form>
          </section>

          {/* =====================================================
            RESOURCES
        ====================================================== */}

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Resources
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Files available to registered students.
                </p>
              </div>

              <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                {seminar.resources?.length || 0}{" "}
                {seminar.resources?.length === 1 ? "file" : "files"}
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {seminar.resources?.length ? (
                seminar.resources.map((resource) => (
                  <div
                    key={resource.id}
                    className="flex flex-col gap-4 rounded-xl border border-gray-200 p-4 transition hover:border-gray-300 hover:shadow-sm md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      {/* FILE ICON */}

                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-gray-100 text-xs font-bold text-gray-700">
                        {resource.fileType || "FILE"}
                      </div>

                      {/* FILE DETAILS */}

                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900">
                          {resource.title}
                        </p>

                        <p className="mt-1 truncate text-sm text-gray-500">
                          {resource.fileName || resource.title}
                        </p>

                        {resource.bytes && (
                          <p className="mt-1 text-xs text-gray-400">
                            {(resource.bytes / 1024 / 1024).toFixed(2)} MB
                          </p>
                        )}
                      </div>
                    </div>

                    {/* ADMIN VIEW */}

                    {resource.cloudinaryUrl && (
                      <a
                        href={resource.cloudinaryUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 rounded-lg bg-gray-900 px-4 py-2.5 text-center text-sm font-medium text-white transition hover:bg-gray-800"
                      >
                        View File
                      </a>
                    )}
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
                  <p className="font-medium text-gray-700">
                    No resources uploaded yet.
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    Upload a PDF, PPT or document above.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
