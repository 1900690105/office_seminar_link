"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/Header";

const INITIAL_FORM = {
  title: "",
  collegeName: "",
  speakerName: "",
  seminarDate: "",
  description: "",
  status: "DRAFT",
};

const STATUS_OPTIONS = [
  {
    value: "DRAFT",
    label: "Draft",
    description: "Not publicly available",
  },
  {
    value: "PUBLISHED",
    label: "Published",
    description: "Available to students",
  },
  {
    value: "ARCHIVED",
    label: "Archived",
    description: "No longer active",
  },
];

function getLocalToday() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateForInput(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getErrorMessage(error) {
  if (!error) {
    return "Something went wrong. Please try again.";
  }

  if (error.name === "AbortError") {
    return "The request timed out. Please check your connection and try again.";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

async function parseJsonResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();

  return {
    error: text || `Server returned status ${response.status}.`,
  };
}

function validateDate(value) {
  if (!value) {
    return "Please select the seminar date.";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "Please select a valid seminar date.";
  }

  return null;
}

export default function EditSeminarPage() {
  const router = useRouter();
  const params = useParams();

  const seminarId = params?.id;

  const [form, setForm] = useState(INITIAL_FORM);
  const [seminar, setSeminar] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const today = useMemo(() => getLocalToday(), []);

  // =========================================================
  // FORM CHANGE
  // =========================================================

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (error) {
      setError("");
    }

    if (success) {
      setSuccess("");
    }
  }

  // =========================================================
  // LOAD SEMINAR
  // =========================================================

  const loadSeminar = useCallback(
    async ({ signal } = {}) => {
      if (!seminarId) {
        setError("Seminar ID is missing.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/seminars/${encodeURIComponent(seminarId)}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
            cache: "no-store",
            credentials: "same-origin",
            signal,
          },
        );

        const data = await parseJsonResponse(response);

        if (!response.ok) {
          throw new Error(
            data?.error ||
              data?.message ||
              `Unable to load seminar (${response.status}).`,
          );
        }

        /*
         * Your API returns:
         *
         * {
         *   success: true,
         *   seminar: {...}
         * }
         *
         * Also support direct seminar responses so this page
         * remains compatible with older API responses.
         */
        const loadedSeminar = data?.seminar || data;

        if (!loadedSeminar?.id) {
          throw new Error(
            "Seminar information was not returned by the server.",
          );
        }

        setSeminar(loadedSeminar);

        setForm({
          title: loadedSeminar.title || "",
          collegeName: loadedSeminar.collegeName || "",
          speakerName: loadedSeminar.speakerName || "",
          seminarDate: formatDateForInput(loadedSeminar.seminarDate),
          description: loadedSeminar.description || "",
          status: loadedSeminar.status || "DRAFT",
        });
      } catch (error) {
        if (error?.name === "AbortError") {
          return;
        }

        console.error("LOAD SEMINAR ERROR:", error);

        setError(getErrorMessage(error));
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [seminarId],
  );

  useEffect(() => {
    const controller = new AbortController();

    loadSeminar({
      signal: controller.signal,
    });

    return () => {
      controller.abort();
    };
  }, [loadSeminar]);

  // =========================================================
  // VALIDATION
  // =========================================================

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

    const dateError = validateDate(form.seminarDate);

    if (dateError) {
      return dateError;
    }

    if (description.length > 2000) {
      return "Description cannot exceed 2000 characters.";
    }

    const validStatuses = ["DRAFT", "PUBLISHED", "ARCHIVED"];

    if (!validStatuses.includes(form.status)) {
      return "Please select a valid seminar status.";
    }

    return null;
  }

  // =========================================================
  // SAVE
  // =========================================================

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) return;

    setError("");
    setSuccess("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    if (!seminarId) {
      setError("Seminar ID is missing.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        title: form.title.trim(),
        collegeName: form.collegeName.trim(),
        speakerName: form.speakerName.trim() || null,
        seminarDate: form.seminarDate,
        description: form.description.trim() || null,
        status: form.status,
      };

      const response = await fetch(
        `/api/seminars/${encodeURIComponent(seminarId)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify(payload),
        },
      );

      const data = await parseJsonResponse(response);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            `Unable to update seminar (${response.status}).`,
        );
      }

      const updatedSeminar = data?.seminar || data;

      if (!updatedSeminar?.id) {
        throw new Error(
          "Seminar was updated, but the server did not return the updated seminar.",
        );
      }

      setSeminar(updatedSeminar);

      setForm({
        title: updatedSeminar.title || "",
        collegeName: updatedSeminar.collegeName || "",
        speakerName: updatedSeminar.speakerName || "",
        seminarDate: formatDateForInput(updatedSeminar.seminarDate),
        description: updatedSeminar.description || "",
        status: updatedSeminar.status || "DRAFT",
      });

      setSuccess("Seminar updated successfully.");

      /*
       * Navigate after a short delay so the admin can actually
       * see the success state.
       */
      window.setTimeout(() => {
        router.push(`/dashboard/seminars/${seminarId}`);
        router.refresh();
      }, 800);
    } catch (error) {
      console.error("UPDATE SEMINAR ERROR:", error);

      setError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  // =========================================================
  // LOADING UI
  // =========================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Header loading />

        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
          <div className="animate-pulse">
            <div className="h-4 w-40 rounded bg-slate-200" />

            <div className="mt-5 h-10 w-80 max-w-full rounded-lg bg-slate-200" />

            <div className="mt-3 h-5 w-full max-w-2xl rounded bg-slate-200" />

            <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="border-b p-6">
                <div className="h-6 w-48 rounded bg-slate-200" />
                <div className="mt-2 h-4 w-72 max-w-full rounded bg-slate-200" />
              </div>

              <div className="space-y-7 p-6 sm:p-8">
                <div>
                  <div className="h-4 w-32 rounded bg-slate-200" />
                  <div className="mt-3 h-12 rounded-xl bg-slate-100" />
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <div className="h-4 w-32 rounded bg-slate-200" />
                    <div className="mt-3 h-12 rounded-xl bg-slate-100" />
                  </div>

                  <div>
                    <div className="h-4 w-32 rounded bg-slate-200" />
                    <div className="mt-3 h-12 rounded-xl bg-slate-100" />
                  </div>
                </div>

                <div>
                  <div className="h-4 w-32 rounded bg-slate-200" />
                  <div className="mt-3 h-12 rounded-xl bg-slate-100" />
                </div>

                <div>
                  <div className="h-4 w-32 rounded bg-slate-200" />
                  <div className="mt-3 h-32 rounded-xl bg-slate-100" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // =========================================================
  // ERROR UI
  // =========================================================

  if (error && !seminar) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Header loading={false} />

        <div className="mx-auto flex min-h-[calc(100vh-72px)] max-w-2xl items-center px-4 py-10 sm:px-6">
          <div className="w-full rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm sm:p-10">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-red-100 text-xl font-black text-red-600">
              !
            </div>

            <h1 className="mt-5 text-2xl font-black text-slate-950">
              Unable to load seminar
            </h1>

            <p className="mx-auto mt-3 max-w-md wrap-break-word text-sm leading-6 text-slate-500">
              {error}
            </p>

            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  const controller = new AbortController();

                  loadSeminar({
                    signal: controller.signal,
                  });
                }}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-900/10"
              >
                Try Again
              </button>

              <Link
                href="/dashboard/seminars"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Back to Seminars
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // =========================================================
  // MAIN UI
  // =========================================================

  return (
    <main className="min-h-screen bg-slate-50">
      <Header loading={saving} />

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-12">
        {/* BREADCRUMB */}

        <nav
          aria-label="Breadcrumb"
          className="mb-6 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 sm:text-sm"
        >
          <Link href="/dashboard" className="transition hover:text-slate-900">
            Dashboard
          </Link>

          <span aria-hidden="true">/</span>

          <Link
            href="/dashboard/seminars"
            className="transition hover:text-slate-900"
          >
            Seminars
          </Link>

          <span aria-hidden="true">/</span>

          <Link
            href={`/dashboard/seminars/${seminarId}`}
            className="max-w-45 truncate transition hover:text-slate-900 sm:max-w-xs"
          >
            {seminar?.title || "Seminar"}
          </Link>

          <span aria-hidden="true">/</span>

          <span className="text-slate-900">Edit</span>
        </nav>

        {/* HEADER */}

        <div className="mb-7 flex flex-col gap-5 sm:mb-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-600" />

              <span className="text-xs font-bold uppercase tracking-[0.15em] text-blue-600">
                Seminar Management
              </span>
            </div>

            <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Edit Seminar
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              Update seminar information without deleting existing students,
              registrations, resources, or Cloudinary files.
            </p>
          </div>

          <Link
            href={`/dashboard/seminars/${seminarId}`}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:w-auto"
          >
            View Seminar
          </Link>
        </div>

        {/* ERROR */}

        {error && (
          <div
            role="alert"
            className="mb-6 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4"
          >
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-red-100 font-black text-red-600">
              !
            </div>

            <div className="min-w-0">
              <p className="text-sm font-bold text-red-900">
                Unable to update seminar
              </p>

              <p className="mt-1 wrap-break-word text-sm leading-5 text-red-700">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* SUCCESS */}

        {success && (
          <div
            role="status"
            aria-live="polite"
            className="mb-6 flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4"
          >
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-100 font-black text-emerald-700">
              ✓
            </div>

            <div>
              <p className="text-sm font-bold text-emerald-900">
                Changes saved
              </p>

              <p className="mt-1 text-sm text-emerald-700">
                Seminar updated successfully. Redirecting...
              </p>
            </div>
          </div>
        )}

        {/* FORM */}

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
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
                </svg>
              </div>

              <div className="min-w-0">
                <h2 className="font-bold text-slate-950">
                  Seminar Information
                </h2>

                <p className="mt-1 text-sm leading-5 text-slate-500">
                  Update the details displayed to students.
                </p>
              </div>
            </div>
          </div>

          {/* FORM BODY */}

          <div className="space-y-8 p-5 sm:p-8">
            {/* TITLE */}

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
                maxLength={150}
                autoComplete="off"
                required
                disabled={saving}
                placeholder="e.g. Full Stack Web Development Seminar"
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 disabled:cursor-not-allowed disabled:bg-slate-50"
              />

              <p className="mt-2 text-xs text-slate-400">
                Use a clear title that students can easily understand.
              </p>
            </div>

            {/* COLLEGE + SPEAKER */}

            <div className="grid gap-6 md:grid-cols-2">
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
                  maxLength={200}
                  autoComplete="organization"
                  required
                  disabled={saving}
                  placeholder="e.g. Government Polytechnic Pune"
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                />
              </div>

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
                  maxLength={150}
                  autoComplete="name"
                  disabled={saving}
                  placeholder="e.g. Nikhil Kandhare"
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                />
              </div>
            </div>

            {/* DATE + STATUS */}

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label
                  htmlFor="seminarDate"
                  className="mb-2 block text-sm font-bold text-slate-800"
                >
                  Seminar Date
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <input
                  id="seminarDate"
                  name="seminarDate"
                  type="date"
                  value={form.seminarDate}
                  onChange={handleChange}
                  min={today}
                  required
                  disabled={saving}
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                />

                <p className="mt-2 text-xs text-slate-400">
                  Select the scheduled seminar date.
                </p>
              </div>

              <div>
                <label
                  htmlFor="status"
                  className="mb-2 block text-sm font-bold text-slate-800"
                >
                  Seminar Status
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <select
                  id="status"
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  disabled={saving}
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 disabled:cursor-not-allowed disabled:bg-slate-50"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} — {option.description}
                    </option>
                  ))}
                </select>

                <p className="mt-2 text-xs text-slate-400">
                  Only published seminars are available through the public
                  student link.
                </p>
              </div>
            </div>

            {/* DESCRIPTION */}

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
                disabled={saving}
                placeholder="Describe the seminar, topics covered, learning objectives, or additional information..."
                className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 disabled:cursor-not-allowed disabled:bg-slate-50"
              />

              <p className="mt-2 text-xs text-slate-400">
                This description can be displayed on the student registration
                page.
              </p>
            </div>

            {/* EXISTING DATA */}

            {seminar && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-sm font-bold text-slate-900">
                  Existing Seminar Data
                </h3>

                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-medium text-slate-400">
                      Registrations
                    </p>

                    <p className="mt-1 text-xl font-black text-slate-900">
                      {seminar?._count?.registrations ??
                        seminar?.registrations?.length ??
                        0}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-slate-400">
                      Resources
                    </p>

                    <p className="mt-1 text-xl font-black text-slate-900">
                      {seminar?._count?.resources ??
                        seminar?.resources?.length ??
                        0}
                    </p>
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <p className="text-xs font-medium text-slate-400">
                      Seminar ID
                    </p>

                    <p
                      title={seminar.id}
                      className="mt-1 truncate text-xs font-semibold text-slate-700"
                    >
                      {seminar.id}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* SAFETY NOTE */}

            <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5">
              <div className="flex gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white font-bold text-blue-600 shadow-sm">
                  i
                </div>

                <div>
                  <h3 className="text-sm font-bold text-blue-950">
                    Existing data is safe
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-blue-700 sm:text-sm">
                    Editing this seminar changes only its basic information.
                    Existing student records, registrations, resources,
                    certificates and Cloudinary files are not deleted.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ACTIONS */}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50/70 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <Link
              href={`/dashboard/seminars/${seminarId}`}
              className={`inline-flex h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950 sm:w-auto ${
                saving ? "pointer-events-none opacity-50" : ""
              }`}
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-900/10 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {saving ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Saving Changes...
                </>
              ) : (
                <>
                  Save Changes
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
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
                    <path d="M17 21v-8H7v8" />
                    <path d="M7 3v5h8" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </form>

        {/* FOOTER */}

        <div className="mt-8 pb-4 text-center">
          <p className="text-xs font-bold tracking-wide text-slate-400">
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

// "use client";

// import { useCallback, useEffect, useMemo, useState } from "react";
// import Link from "next/link";
// import { useParams, useRouter } from "next/navigation";
// import Header from "@/components/Header";

// const INITIAL_FORM = {
//   title: "",
//   collegeName: "",
//   speakerName: "",
//   seminarDate: "",
//   description: "",
//   status: "DRAFT",
// };

// const STATUS_OPTIONS = [
//   {
//     value: "DRAFT",
//     label: "Draft",
//     description: "Not publicly active",
//   },
//   {
//     value: "PUBLISHED",
//     label: "Published",
//     description: "Available to students",
//   },
//   {
//     value: "ARCHIVED",
//     label: "Archived",
//     description: "No longer active",
//   },
// ];

// // ---------------------------------------------------------
// // DATE HELPERS
// // ---------------------------------------------------------

// function formatDateForInput(value) {
//   if (!value) return "";

//   const date = new Date(value);

//   if (Number.isNaN(date.getTime())) {
//     return "";
//   }

//   const year = date.getFullYear();
//   const month = String(date.getMonth() + 1).padStart(2, "0");
//   const day = String(date.getDate()).padStart(2, "0");

//   return `${year}-${month}-${day}`;
// }

// function getLocalToday() {
//   const date = new Date();

//   const year = date.getFullYear();
//   const month = String(date.getMonth() + 1).padStart(2, "0");
//   const day = String(date.getDate()).padStart(2, "0");

//   return `${year}-${month}-${day}`;
// }

// // ---------------------------------------------------------
// // ERROR MESSAGE
// // ---------------------------------------------------------

// function getErrorMessage(error) {
//   if (!error) {
//     return "Something went wrong. Please try again.";
//   }

//   if (error.name === "AbortError") {
//     return "The request timed out. Please check your connection and try again.";
//   }

//   if (error instanceof Error && error.message) {
//     return error.message;
//   }

//   return "Something went wrong. Please try again.";
// }

// // ---------------------------------------------------------
// // PAGE
// // ---------------------------------------------------------

// export default function EditSeminarPage() {
//   const router = useRouter();
//   const params = useParams();

//   const seminarId = params?.id;

//   const [form, setForm] = useState(INITIAL_FORM);

//   const [seminar, setSeminar] = useState(null);

//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);

//   const [error, setError] = useState("");
//   const [success, setSuccess] = useState("");

//   const today = useMemo(() => getLocalToday(), []);

//   // -------------------------------------------------------
//   // FORM CHANGE
//   // -------------------------------------------------------

//   function handleChange(event) {
//     const { name, value } = event.target;

//     setForm((previous) => ({
//       ...previous,
//       [name]: value,
//     }));

//     if (error) {
//       setError("");
//     }

//     if (success) {
//       setSuccess("");
//     }
//   }

//   // -------------------------------------------------------
//   // LOAD SEMINAR
//   // -------------------------------------------------------

//   const loadSeminar = useCallback(async () => {
//     if (!seminarId) {
//       setError("Seminar ID is missing.");
//       setLoading(false);
//       return;
//     }

//     const controller = new AbortController();

//     const timeout = setTimeout(() => {
//       controller.abort();
//     }, 15000);

//     try {
//       setLoading(true);
//       setError("");

//       const response = await fetch(`/api/seminars/${seminarId}`, {
//         method: "GET",
//         headers: {
//           Accept: "application/json",
//         },
//         cache: "no-store",
//         signal: controller.signal,
//       });

//       const contentType = response.headers.get("content-type") || "";

//       let data;

//       if (contentType.includes("application/json")) {
//         data = await response.json();
//       } else {
//         const text = await response.text();

//         data = {
//           error: text || `Server returned status ${response.status}.`,
//         };
//       }

//       if (!response.ok) {
//         throw new Error(
//           data?.error || data?.message || "Unable to load seminar.",
//         );
//       }

//       // ---------------------------------------------------
//       // API SHOULD RETURN:
//       //
//       // {
//       //   success: true,
//       //   seminar: {...}
//       // }
//       // ---------------------------------------------------

//       const loadedSeminar = data?.seminar || data;

//       if (!loadedSeminar?.id) {
//         throw new Error("Seminar information was not returned by the server.");
//       }

//       setSeminar(loadedSeminar);

//       setForm({
//         title: loadedSeminar.title || "",
//         collegeName: loadedSeminar.collegeName || "",
//         speakerName: loadedSeminar.speakerName || "",
//         seminarDate: formatDateForInput(loadedSeminar.seminarDate),
//         description: loadedSeminar.description || "",
//         status: loadedSeminar.status || "DRAFT",
//       });
//     } catch (error) {
//       console.error("LOAD SEMINAR ERROR:", error);

//       setError(getErrorMessage(error));
//     } finally {
//       clearTimeout(timeout);
//       setLoading(false);
//     }

//     return () => {
//       controller.abort();
//     };
//   }, [seminarId]);

//   useEffect(() => {
//     loadSeminar();
//   }, [loadSeminar]);

//   // -------------------------------------------------------
//   // VALIDATION
//   // -------------------------------------------------------

//   function validateForm() {
//     const title = form.title.trim();
//     const collegeName = form.collegeName.trim();
//     const speakerName = form.speakerName.trim();
//     const description = form.description.trim();

//     if (!title) {
//       return "Please enter the seminar title.";
//     }

//     if (title.length < 3) {
//       return "Seminar title must contain at least 3 characters.";
//     }

//     if (title.length > 150) {
//       return "Seminar title cannot exceed 150 characters.";
//     }

//     if (!collegeName) {
//       return "Please enter the college name.";
//     }

//     if (collegeName.length < 2) {
//       return "Please enter a valid college name.";
//     }

//     if (collegeName.length > 200) {
//       return "College name cannot exceed 200 characters.";
//     }

//     if (speakerName.length > 150) {
//       return "Speaker name cannot exceed 150 characters.";
//     }

//     if (!form.seminarDate) {
//       return "Please select the seminar date.";
//     }

//     if (description.length > 2000) {
//       return "Description cannot exceed 2000 characters.";
//     }

//     const validStatuses = ["DRAFT", "PUBLISHED", "ARCHIVED"];

//     if (!validStatuses.includes(form.status)) {
//       return "Please select a valid seminar status.";
//     }

//     return null;
//   }

//   // -------------------------------------------------------
//   // SAVE
//   // -------------------------------------------------------

//   async function handleSubmit(event) {
//     event.preventDefault();

//     if (saving) return;

//     setError("");
//     setSuccess("");

//     const validationError = validateForm();

//     if (validationError) {
//       setError(validationError);
//       return;
//     }

//     if (!seminarId) {
//       setError("Seminar ID is missing.");
//       return;
//     }

//     try {
//       setSaving(true);

//       const payload = {
//         title: form.title.trim(),
//         collegeName: form.collegeName.trim(),
//         speakerName: form.speakerName.trim(),
//         seminarDate: form.seminarDate,
//         description: form.description.trim(),
//         status: form.status,
//       };

//       const response = await fetch(`/api/seminars/${seminarId}`, {
//         method: "PATCH",
//         headers: {
//           "Content-Type": "application/json",
//           Accept: "application/json",
//         },
//         body: JSON.stringify(payload),
//       });

//       const contentType = response.headers.get("content-type") || "";

//       let data;

//       if (contentType.includes("application/json")) {
//         data = await response.json();
//       } else {
//         const text = await response.text();

//         data = {
//           error: text || `Server returned status ${response.status}.`,
//         };
//       }

//       if (!response.ok) {
//         throw new Error(
//           data?.error || data?.message || "Unable to update seminar.",
//         );
//       }

//       const updatedSeminar = data?.seminar || data;

//       if (!updatedSeminar?.id) {
//         throw new Error(
//           "Seminar was updated, but the server did not return the seminar.",
//         );
//       }

//       setSeminar(updatedSeminar);

//       setForm({
//         title: updatedSeminar.title || "",
//         collegeName: updatedSeminar.collegeName || "",
//         speakerName: updatedSeminar.speakerName || "",
//         seminarDate: formatDateForInput(updatedSeminar.seminarDate),
//         description: updatedSeminar.description || "",
//         status: updatedSeminar.status || "DRAFT",
//       });

//       setSuccess("Seminar updated successfully.");

//       // Give the user a moment to see success message.
//       setTimeout(() => {
//         router.push(`/dashboard/seminars/${seminarId}`);
//         router.refresh();
//       }, 700);
//     } catch (error) {
//       console.error("UPDATE SEMINAR ERROR:", error);

//       setError(getErrorMessage(error));
//     } finally {
//       setSaving(false);
//     }
//   }

//   // -------------------------------------------------------
//   // LOADING SCREEN
//   // -------------------------------------------------------

//   if (loading) {
//     return (
//       <main className="min-h-screen bg-slate-50">
//         <Header loading />

//         <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
//           <div className="animate-pulse">
//             <div className="h-4 w-40 rounded bg-slate-200" />

//             <div className="mt-4 h-10 w-80 max-w-full rounded-lg bg-slate-200" />

//             <div className="mt-3 h-5 w-full max-w-2xl rounded bg-slate-200" />

//             <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white">
//               <div className="border-b p-6">
//                 <div className="h-6 w-48 rounded bg-slate-200" />
//                 <div className="mt-2 h-4 w-72 max-w-full rounded bg-slate-200" />
//               </div>

//               <div className="space-y-7 p-6 sm:p-8">
//                 <div>
//                   <div className="h-4 w-32 rounded bg-slate-200" />
//                   <div className="mt-3 h-12 rounded-xl bg-slate-100" />
//                 </div>

//                 <div className="grid gap-6 md:grid-cols-2">
//                   <div>
//                     <div className="h-4 w-32 rounded bg-slate-200" />
//                     <div className="mt-3 h-12 rounded-xl bg-slate-100" />
//                   </div>

//                   <div>
//                     <div className="h-4 w-32 rounded bg-slate-200" />
//                     <div className="mt-3 h-12 rounded-xl bg-slate-100" />
//                   </div>
//                 </div>

//                 <div>
//                   <div className="h-4 w-32 rounded bg-slate-200" />
//                   <div className="mt-3 h-12 rounded-xl bg-slate-100" />
//                 </div>

//                 <div>
//                   <div className="h-4 w-32 rounded bg-slate-200" />
//                   <div className="mt-3 h-32 rounded-xl bg-slate-100" />
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </main>
//     );
//   }

//   // -------------------------------------------------------
//   // ERROR SCREEN
//   // -------------------------------------------------------

//   if (error && !seminar) {
//     return (
//       <main className="min-h-screen bg-slate-50">
//         <Header loading={false} />

//         <div className="mx-auto flex min-h-[calc(100vh-72px)] max-w-2xl items-center px-4 py-10 sm:px-6">
//           <div className="w-full rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm sm:p-10">
//             <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-red-100 text-xl font-black text-red-600">
//               !
//             </div>

//             <h1 className="mt-5 text-2xl font-black text-slate-950">
//               Unable to load seminar
//             </h1>

//             <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
//               {error}
//             </p>

//             <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
//               <button
//                 type="button"
//                 onClick={loadSeminar}
//                 className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-900/10"
//               >
//                 Try Again
//               </button>

//               <Link
//                 href="/dashboard/seminars"
//                 className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
//               >
//                 Back to Seminars
//               </Link>
//             </div>
//           </div>
//         </div>
//       </main>
//     );
//   }

//   // -------------------------------------------------------
//   // MAIN UI
//   // -------------------------------------------------------

//   return (
//     <main className="min-h-screen bg-slate-50">
//       <Header loading={saving} />

//       <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-12">
//         {/* -------------------------------------------------
//             BREADCRUMB
//         -------------------------------------------------- */}

//         <nav
//           aria-label="Breadcrumb"
//           className="mb-6 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 sm:text-sm"
//         >
//           <Link href="/dashboard" className="transition hover:text-slate-900">
//             Dashboard
//           </Link>

//           <span aria-hidden="true">/</span>

//           <Link
//             href="/dashboard/seminars"
//             className="transition hover:text-slate-900"
//           >
//             Seminars
//           </Link>

//           <span aria-hidden="true">/</span>

//           <Link
//             href={`/dashboard/seminars/${seminarId}`}
//             className="max-w-[180px] truncate transition hover:text-slate-900 sm:max-w-xs"
//           >
//             {seminar?.title || "Seminar"}
//           </Link>

//           <span aria-hidden="true">/</span>

//           <span className="text-slate-900">Edit</span>
//         </nav>

//         {/* -------------------------------------------------
//             HEADING
//         -------------------------------------------------- */}

//         <div className="mb-7 flex flex-col gap-5 sm:mb-8 lg:flex-row lg:items-end lg:justify-between">
//           <div>
//             <div className="mb-3 flex items-center gap-2">
//               <span className="h-2 w-2 rounded-full bg-blue-600" />

//               <span className="text-xs font-bold uppercase tracking-[0.15em] text-blue-600">
//                 Seminar Management
//               </span>
//             </div>

//             <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
//               Edit Seminar
//             </h1>

//             <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
//               Update the seminar information without affecting existing
//               registrations, students, resources or certificates.
//             </p>
//           </div>

//           <Link
//             href={`/dashboard/seminars/${seminarId}`}
//             className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:w-auto"
//           >
//             View Seminar
//           </Link>
//         </div>

//         {/* -------------------------------------------------
//             ALERTS
//         -------------------------------------------------- */}

//         {error && (
//           <div
//             role="alert"
//             className="mb-6 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4"
//           >
//             <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-red-100 font-black text-red-600">
//               !
//             </div>

//             <div className="min-w-0">
//               <p className="text-sm font-bold text-red-900">
//                 Unable to update seminar
//               </p>

//               <p className="mt-1 break-words text-sm leading-5 text-red-700">
//                 {error}
//               </p>
//             </div>
//           </div>
//         )}

//         {success && (
//           <div
//             role="status"
//             className="mb-6 flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4"
//           >
//             <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-100 font-black text-emerald-700">
//               ✓
//             </div>

//             <div>
//               <p className="text-sm font-bold text-emerald-900">
//                 Changes saved
//               </p>

//               <p className="mt-1 text-sm text-emerald-700">
//                 Seminar updated successfully. Redirecting...
//               </p>
//             </div>
//           </div>
//         )}

//         {/* -------------------------------------------------
//             FORM
//         -------------------------------------------------- */}

//         <form
//           onSubmit={handleSubmit}
//           noValidate
//           className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_40px_rgba(15,23,42,0.06)]"
//         >
//           {/* HEADER */}

//           <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-5 py-6 sm:px-8">
//             <div className="flex items-start gap-4">
//               <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-600/20">
//                 <svg
//                   width="21"
//                   height="21"
//                   viewBox="0 0 24 24"
//                   fill="none"
//                   stroke="currentColor"
//                   strokeWidth="1.8"
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                   aria-hidden="true"
//                 >
//                   <path d="M12 20h9" />
//                   <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
//                 </svg>
//               </div>

//               <div className="min-w-0">
//                 <h2 className="font-bold text-slate-950">
//                   Seminar Information
//                 </h2>

//                 <p className="mt-1 text-sm leading-5 text-slate-500">
//                   Update the details displayed to students.
//                 </p>
//               </div>
//             </div>
//           </div>

//           {/* FORM BODY */}

//           <div className="space-y-8 p-5 sm:p-8">
//             {/* TITLE */}

//             <div>
//               <div className="mb-2 flex items-center justify-between gap-3">
//                 <label
//                   htmlFor="title"
//                   className="text-sm font-bold text-slate-800"
//                 >
//                   Seminar Title
//                   <span className="ml-1 text-red-500">*</span>
//                 </label>

//                 <span className="text-xs text-slate-400">
//                   {form.title.length}/150
//                 </span>
//               </div>

//               <input
//                 id="title"
//                 name="title"
//                 type="text"
//                 value={form.title}
//                 onChange={handleChange}
//                 maxLength={150}
//                 autoComplete="off"
//                 required
//                 disabled={saving}
//                 placeholder="e.g. Full Stack Web Development Seminar"
//                 className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 disabled:cursor-not-allowed disabled:bg-slate-50"
//               />

//               <p className="mt-2 text-xs text-slate-400">
//                 Use a clear title that students can easily understand.
//               </p>
//             </div>

//             {/* COLLEGE + SPEAKER */}

//             <div className="grid gap-6 md:grid-cols-2">
//               <div>
//                 <label
//                   htmlFor="collegeName"
//                   className="mb-2 block text-sm font-bold text-slate-800"
//                 >
//                   College Name
//                   <span className="ml-1 text-red-500">*</span>
//                 </label>

//                 <input
//                   id="collegeName"
//                   name="collegeName"
//                   type="text"
//                   value={form.collegeName}
//                   onChange={handleChange}
//                   maxLength={200}
//                   autoComplete="organization"
//                   required
//                   disabled={saving}
//                   placeholder="e.g. Government Polytechnic Pune"
//                   className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 disabled:cursor-not-allowed disabled:bg-slate-50"
//                 />
//               </div>

//               <div>
//                 <label
//                   htmlFor="speakerName"
//                   className="mb-2 block text-sm font-bold text-slate-800"
//                 >
//                   Speaker Name
//                   <span className="ml-2 text-xs font-normal text-slate-400">
//                     Optional
//                   </span>
//                 </label>

//                 <input
//                   id="speakerName"
//                   name="speakerName"
//                   type="text"
//                   value={form.speakerName}
//                   onChange={handleChange}
//                   maxLength={150}
//                   autoComplete="name"
//                   disabled={saving}
//                   placeholder="e.g. Nikhil Kandhare"
//                   className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 disabled:cursor-not-allowed disabled:bg-slate-50"
//                 />
//               </div>
//             </div>

//             {/* DATE + STATUS */}

//             <div className="grid gap-6 md:grid-cols-2">
//               <div>
//                 <label
//                   htmlFor="seminarDate"
//                   className="mb-2 block text-sm font-bold text-slate-800"
//                 >
//                   Seminar Date
//                   <span className="ml-1 text-red-500">*</span>
//                 </label>

//                 <input
//                   id="seminarDate"
//                   name="seminarDate"
//                   type="date"
//                   value={form.seminarDate}
//                   onChange={handleChange}
//                   min={today}
//                   required
//                   disabled={saving}
//                   className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 disabled:cursor-not-allowed disabled:bg-slate-50"
//                 />

//                 <p className="mt-2 text-xs text-slate-400">
//                   Select the scheduled seminar date.
//                 </p>
//               </div>

//               <div>
//                 <label
//                   htmlFor="status"
//                   className="mb-2 block text-sm font-bold text-slate-800"
//                 >
//                   Seminar Status
//                   <span className="ml-1 text-red-500">*</span>
//                 </label>

//                 <select
//                   id="status"
//                   name="status"
//                   value={form.status}
//                   onChange={handleChange}
//                   disabled={saving}
//                   className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 disabled:cursor-not-allowed disabled:bg-slate-50"
//                 >
//                   {STATUS_OPTIONS.map((option) => (
//                     <option key={option.value} value={option.value}>
//                       {option.label} — {option.description}
//                     </option>
//                   ))}
//                 </select>

//                 <p className="mt-2 text-xs text-slate-400">
//                   Published seminars can be made available to students.
//                 </p>
//               </div>
//             </div>

//             {/* DESCRIPTION */}

//             <div>
//               <div className="mb-2 flex items-center justify-between gap-3">
//                 <label
//                   htmlFor="description"
//                   className="text-sm font-bold text-slate-800"
//                 >
//                   Description
//                   <span className="ml-2 text-xs font-normal text-slate-400">
//                     Optional
//                   </span>
//                 </label>

//                 <span className="text-xs text-slate-400">
//                   {form.description.length}/2000
//                 </span>
//               </div>

//               <textarea
//                 id="description"
//                 name="description"
//                 value={form.description}
//                 onChange={handleChange}
//                 rows={6}
//                 maxLength={2000}
//                 disabled={saving}
//                 placeholder="Describe the seminar, topics covered, learning objectives, or additional information..."
//                 className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 disabled:cursor-not-allowed disabled:bg-slate-50"
//               />

//               <p className="mt-2 text-xs text-slate-400">
//                 This description can be displayed on the student registration
//                 page.
//               </p>
//             </div>

//             {/* EXISTING DATA */}

//             {seminar && (
//               <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
//                 <h3 className="text-sm font-bold text-slate-900">
//                   Existing Seminar Data
//                 </h3>

//                 <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
//                   <div>
//                     <p className="text-xs font-medium text-slate-400">
//                       Registrations
//                     </p>

//                     <p className="mt-1 text-xl font-black text-slate-900">
//                       {seminar?._count?.registrations ??
//                         seminar?.registrations?.length ??
//                         0}
//                     </p>
//                   </div>

//                   <div>
//                     <p className="text-xs font-medium text-slate-400">
//                       Resources
//                     </p>

//                     <p className="mt-1 text-xl font-black text-slate-900">
//                       {seminar?._count?.resources ??
//                         seminar?.resources?.length ??
//                         0}
//                     </p>
//                   </div>

//                   <div className="col-span-2 sm:col-span-1">
//                     <p className="text-xs font-medium text-slate-400">
//                       Seminar ID
//                     </p>

//                     <p
//                       title={seminar.id}
//                       className="mt-1 truncate text-xs font-semibold text-slate-700"
//                     >
//                       {seminar.id}
//                     </p>
//                   </div>
//                 </div>
//               </div>
//             )}

//             {/* IMPORTANT NOTE */}

//             <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5">
//               <div className="flex gap-3">
//                 <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white font-bold text-blue-600 shadow-sm">
//                   i
//                 </div>

//                 <div>
//                   <h3 className="text-sm font-bold text-blue-950">
//                     Your existing data is safe
//                   </h3>

//                   <p className="mt-1 text-xs leading-5 text-blue-700 sm:text-sm">
//                     Editing this seminar updates only its basic information.
//                     Existing student registrations, resources, certificates and
//                     Cloudinary files are not deleted.
//                   </p>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* -------------------------------------------------
//               ACTIONS
//           -------------------------------------------------- */}

//           <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50/70 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
//             <Link
//               href={`/dashboard/seminars/${seminarId}`}
//               className={`inline-flex h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950 sm:w-auto ${
//                 saving ? "pointer-events-none opacity-50" : ""
//               }`}
//             >
//               Cancel
//             </Link>

//             <button
//               type="submit"
//               disabled={saving}
//               className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-900/10 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
//             >
//               {saving ? (
//                 <>
//                   <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
//                   Saving Changes...
//                 </>
//               ) : (
//                 <>
//                   Save Changes
//                   <svg
//                     width="17"
//                     height="17"
//                     viewBox="0 0 24 24"
//                     fill="none"
//                     stroke="currentColor"
//                     strokeWidth="2"
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                     aria-hidden="true"
//                   >
//                     <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
//                     <path d="M17 21v-8H7v8" />
//                     <path d="M7 3v5h8" />
//                   </svg>
//                 </>
//               )}
//             </button>
//           </div>
//         </form>

//         {/* FOOTER */}

//         <div className="mt-8 pb-4 text-center">
//           <p className="text-xs font-bold tracking-wide text-slate-400">
//             ELECTROSOFT SYSTEM
//           </p>

//           <p className="mt-1 text-[11px] text-slate-400">
//             Seminar Management Platform
//           </p>
//         </div>
//       </div>
//     </main>
//   );
// }
