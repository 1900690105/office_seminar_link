"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const INITIAL_FORM = {
  title: "",
  collegeName: "",
  speakerName: "",
  seminarDate: "",
  description: "",
};

export default function NewSeminarPage() {
  const router = useRouter();

  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  // ---------------------------------------------------------
  // FORM CHANGE
  // ---------------------------------------------------------

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (error) {
      setError("");
    }
  }

  // ---------------------------------------------------------
  // VALIDATION
  // ---------------------------------------------------------

  function validateForm() {
    const title = form.title.trim();
    const collegeName = form.collegeName.trim();
    const speakerName = form.speakerName.trim();
    const description = form.description.trim();

    if (!title) {
      return "Please enter the seminar title.";
    }

    if (title.length < 3) {
      return "Seminar title must contain at least 3 characters.";
    }

    if (title.length > 150) {
      return "Seminar title cannot exceed 150 characters.";
    }

    if (!collegeName) {
      return "Please enter the college name.";
    }

    if (collegeName.length < 2) {
      return "Please enter a valid college name.";
    }

    if (collegeName.length > 200) {
      return "College name cannot exceed 200 characters.";
    }

    if (speakerName.length > 150) {
      return "Speaker name cannot exceed 150 characters.";
    }

    if (!form.seminarDate) {
      return "Please select the seminar date.";
    }

    if (description.length > 2000) {
      return "Description cannot exceed 2000 characters.";
    }

    return null;
  }

  // ---------------------------------------------------------
  // CREATE SEMINAR
  // ---------------------------------------------------------

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) return;

    setError("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);

      const payload = {
        title: form.title.trim(),
        collegeName: form.collegeName.trim(),
        speakerName: form.speakerName.trim(),
        seminarDate: form.seminarDate,
        description: form.description.trim(),
      };

      const response = await fetch("/api/seminars", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const contentType = response.headers.get("content-type") || "";

      let data;

      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();

        data = {
          error: text || `Server returned status ${response.status}`,
        };
      }

      if (!response.ok) {
        throw new Error(data?.error || "Unable to create seminar.");
      }

      if (!data?.id) {
        throw new Error(
          "Seminar was created, but the server did not return a seminar ID.",
        );
      }

      router.push(`/dashboard/seminars/${data.id}`);
      router.refresh();
    } catch (error) {
      console.error("CREATE SEMINAR ERROR:", error);

      setError(
        error?.message || "Something went wrong while creating the seminar.",
      );
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------------------------
  // CANCEL
  // ---------------------------------------------------------

  function handleCancel() {
    if (loading) return;

    router.push("/dashboard");
  }

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------

  return (
    <main className="min-h-screen bg-slate-50">
      {/* =====================================================
          TOP NAVIGATION
      ====================================================== */}

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* BRAND */}

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white shadow-sm">
              ES
            </div>

            <div className="hidden sm:block">
              <p className="text-sm font-bold tracking-tight text-slate-950">
                ELECTROSOFT SYSTEM
              </p>

              <p className="text-[11px] font-medium text-slate-500">
                Seminar Management Platform
              </p>
            </div>
          </div>

          {/* BACK */}

          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>

            <span>Back</span>
          </button>
        </div>
      </header>

      {/* =====================================================
          PAGE CONTENT
      ====================================================== */}

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        {/* PAGE HEADING */}

        <div className="mb-8">
          <div className="mb-4 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-600" />

            <span className="text-xs font-bold uppercase tracking-[0.15em] text-blue-600">
              Seminar Management
            </span>
          </div>

          <div className="max-w-3xl">
            <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Create a new seminar
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
              Create your seminar first, then upload presentation files,
              generate a QR code, and share the registration page with students.
            </p>
          </div>
        </div>

        {/* =====================================================
            MAIN CARD
        ====================================================== */}

        <form
          onSubmit={handleSubmit}
          noValidate
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_40px_rgba(15,23,42,0.06)]"
        >
          {/* CARD HEADER */}

          <div className="border-b border-slate-200 bg-linear-to-r from-slate-50 to-white px-5 py-6 sm:px-8">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-600/20">
                <svg
                  width="21"
                  height="21"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="4" width="18" height="17" rx="2" />

                  <path d="M16 2v4" />
                  <path d="M8 2v4" />
                  <path d="M3 10h18" />
                  <path d="M8 14h.01" />
                  <path d="M12 14h.01" />
                  <path d="M16 14h.01" />
                  <path d="M8 18h.01" />
                  <path d="M12 18h.01" />
                </svg>
              </div>

              <div>
                <h2 className="font-bold text-slate-950">
                  Seminar Information
                </h2>

                <p className="mt-1 text-sm leading-5 text-slate-500">
                  Enter the basic information for your seminar.
                </p>
              </div>
            </div>
          </div>

          {/* FORM BODY */}

          <div className="space-y-8 p-5 sm:p-8">
            {/* =================================================
                ERROR MESSAGE
            ================================================== */}

            {error && (
              <div
                role="alert"
                className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-sm font-bold text-red-600">
                  !
                </div>

                <div>
                  <p className="text-sm font-bold text-red-900">
                    Unable to create seminar
                  </p>

                  <p className="mt-1 text-sm leading-5 text-red-700">{error}</p>
                </div>
              </div>
            )}

            {/* =================================================
                TITLE
            ================================================== */}

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label
                  htmlFor="title"
                  className="text-sm font-bold text-slate-800"
                >
                  Seminar Title
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <span className="text-xs text-slate-400">
                  {form.title.length}/150
                </span>
              </div>

              <input
                id="title"
                name="title"
                type="text"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g. Full Stack Web Development Seminar"
                maxLength={150}
                autoComplete="off"
                required
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
              />

              <p className="mt-2 text-xs text-slate-400">
                Use a short and descriptive title that students can easily
                understand.
              </p>
            </div>

            {/* =================================================
                COLLEGE + SPEAKER
            ================================================== */}

            <div className="grid gap-6 md:grid-cols-2">
              {/* COLLEGE */}

              <div>
                <label
                  htmlFor="collegeName"
                  className="mb-2 block text-sm font-bold text-slate-800"
                >
                  College Name
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <input
                  id="collegeName"
                  name="collegeName"
                  type="text"
                  value={form.collegeName}
                  onChange={handleChange}
                  placeholder="e.g. Government Polytechnic Pune"
                  maxLength={200}
                  autoComplete="organization"
                  required
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                />
              </div>

              {/* SPEAKER */}

              <div>
                <label
                  htmlFor="speakerName"
                  className="mb-2 block text-sm font-bold text-slate-800"
                >
                  Speaker Name
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    Optional
                  </span>
                </label>

                <input
                  id="speakerName"
                  name="speakerName"
                  type="text"
                  value={form.speakerName}
                  onChange={handleChange}
                  placeholder="e.g. Nikhil Kandhare"
                  maxLength={150}
                  autoComplete="name"
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                />
              </div>
            </div>

            {/* =================================================
                DATE
            ================================================== */}

            <div className="max-w-md">
              <label
                htmlFor="seminarDate"
                className="mb-2 block text-sm font-bold text-slate-800"
              >
                Seminar Date
                <span className="ml-1 text-red-500">*</span>
              </label>

              <div className="relative">
                <input
                  id="seminarDate"
                  name="seminarDate"
                  type="date"
                  value={form.seminarDate}
                  onChange={handleChange}
                  min={today}
                  required
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                />
              </div>

              <p className="mt-2 text-xs text-slate-400">
                Select the scheduled date of the seminar.
              </p>
            </div>

            {/* =================================================
                DESCRIPTION
            ================================================== */}

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label
                  htmlFor="description"
                  className="text-sm font-bold text-slate-800"
                >
                  Description
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    Optional
                  </span>
                </label>

                <span className="text-xs text-slate-400">
                  {form.description.length}/2000
                </span>
              </div>

              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={6}
                maxLength={2000}
                placeholder="Describe the seminar, topics covered, learning objectives, or additional information..."
                className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
              />

              <p className="mt-2 text-xs text-slate-400">
                This information can be displayed to students on the public
                seminar page.
              </p>
            </div>

            {/* =================================================
                NEXT STEPS
            ================================================== */}

            <div className="overflow-hidden rounded-2xl border border-blue-100 bg-blue-50/70">
              <div className="border-b border-blue-100 px-5 py-4">
                <h3 className="text-sm font-bold text-blue-950">
                  What happens next?
                </h3>

                <p className="mt-1 text-xs leading-5 text-blue-700">
                  After creating the seminar, you will be able to prepare
                  everything students need.
                </p>
              </div>

              <div className="grid gap-px bg-blue-100 sm:grid-cols-3">
                <div className="bg-blue-50/70 p-5">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white text-sm font-bold text-blue-600 shadow-sm">
                    01
                  </div>

                  <p className="text-sm font-bold text-blue-950">
                    Upload Resources
                  </p>

                  <p className="mt-1 text-xs leading-5 text-blue-700">
                    Upload PDF, PPT, PPTX, DOC or DOCX files.
                  </p>
                </div>

                <div className="bg-blue-50/70 p-5">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white text-sm font-bold text-blue-600 shadow-sm">
                    02
                  </div>

                  <p className="text-sm font-bold text-blue-950">Generate QR</p>

                  <p className="mt-1 text-xs leading-5 text-blue-700">
                    Generate a unique QR code for the seminar.
                  </p>
                </div>

                <div className="bg-blue-50/70 p-5">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white text-sm font-bold text-blue-600 shadow-sm">
                    03
                  </div>

                  <p className="text-sm font-bold text-blue-950">
                    Students Register
                  </p>

                  <p className="mt-1 text-xs leading-5 text-blue-700">
                    Students scan the QR and access your resources after
                    registration.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* =================================================
              FOOTER ACTIONS
          ================================================== */}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50/70 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950 focus:outline-none focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-900/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Creating Seminar...
                </>
              ) : (
                <>
                  Create Seminar
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 12h14" />
                    <path d="m13 6 6 6-6 6" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </form>

        {/* FOOTER */}

        <div className="mt-8 text-center">
          <p className="text-xs font-medium text-slate-400">
            ELECTROSOFT SYSTEM
          </p>

          <p className="mt-1 text-[11px] text-slate-400">
            Seminar Management Platform
          </p>
        </div>
      </div>
    </main>
  );
}
