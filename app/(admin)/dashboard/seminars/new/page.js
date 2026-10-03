"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

const INITIAL_FORM = {
  title: "",
  collegeName: "",
  speakerName: "",
  seminarDate: "",
  description: "",
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

function FileUpload({
  id,
  label,
  description,
  required = false,
  file,
  onChange,
  preview,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4">
        <label htmlFor={id} className="block text-sm font-bold text-slate-900">
          {label}

          {required ? (
            <span className="ml-1 text-red-500">*</span>
          ) : (
            <span className="ml-2 text-xs font-normal text-slate-400">
              Optional
            </span>
          )}
        </label>

        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>

      <label
        htmlFor={id}
        className="group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 py-7 text-center transition hover:border-blue-400 hover:bg-blue-50/40"
      >
        {preview ? (
          <div className="flex w-full flex-col items-center">
            <div className="flex h-28 w-full items-center justify-center rounded-xl border border-slate-200 bg-white p-4">
              <img
                src={preview}
                alt={`${label} preview`}
                className="max-h-20 max-w-full object-contain"
              />
            </div>

            <p className="mt-3 max-w-full truncate text-sm font-semibold text-slate-700">
              {file?.name}
            </p>

            <p className="mt-1 text-xs text-blue-600">Click to replace</p>
          </div>
        ) : (
          <>
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-white text-slate-500 shadow-sm">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 16V4" />
                <path d="m7 9 5-5 5 5" />
                <path d="M4 20h16" />
              </svg>
            </div>

            <p className="mt-3 text-sm font-bold text-slate-700">
              Upload {label}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              PNG, JPG, JPEG or WEBP • Maximum 5 MB
            </p>
          </>
        )}

        <input
          id={id}
          name={id}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={onChange}
        />
      </label>
    </div>
  );
}

export default function NewSeminarPage() {
  const router = useRouter();

  const [form, setForm] = useState(INITIAL_FORM);

  const [trainerSignature, setTrainerSignature] = useState(null);

  const [authorizedSignature, setAuthorizedSignature] = useState(null);

  const [trainerPreview, setTrainerPreview] = useState("");

  const [authorizedPreview, setAuthorizedPreview] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadingAssets, setUploadingAssets] = useState(false);

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
  // FILE VALIDATION
  // ---------------------------------------------------------

  function validateFile(file, label) {
    if (!file) {
      return null;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return `${label} must be PNG, JPG, JPEG or WEBP.`;
    }

    if (file.size <= 0) {
      return `${label} is empty.`;
    }

    if (file.size > MAX_FILE_SIZE) {
      return `${label} cannot exceed 5 MB.`;
    }

    return null;
  }

  // ---------------------------------------------------------
  // FILE CHANGE
  // ---------------------------------------------------------

  function handleFileChange(event, type) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    let label = "";

    if (type === "trainer") {
      label = "Industrial Trainer signature";
    }

    if (type === "authorized") {
      label = "Authorized signature";
    }

    const validationError = validateFile(file, label);

    if (validationError) {
      setError(validationError);
      event.target.value = "";
      return;
    }

    setError("");

    const previewUrl = URL.createObjectURL(file);

    if (type === "trainer") {
      setTrainerSignature(file);
      setTrainerPreview((old) => {
        if (old) URL.revokeObjectURL(old);
        return previewUrl;
      });
    }

    if (type === "authorized") {
      setAuthorizedSignature(file);
      setAuthorizedPreview((old) => {
        if (old) URL.revokeObjectURL(old);
        return previewUrl;
      });
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
  // UPLOAD CERTIFICATE ASSETS
  // ---------------------------------------------------------

  async function uploadCertificateAssets(seminarId) {
    const hasAssets = trainerSignature || authorizedSignature;

    if (!hasAssets) {
      return;
    }

    setUploadingAssets(true);

    const formData = new FormData();

    if (trainerSignature) {
      formData.append("trainerSignature", trainerSignature);
    }

    if (authorizedSignature) {
      formData.append("authorizedSignature", authorizedSignature);
    }

    const response = await fetch(
      `/api/seminars/${seminarId}/certificate-assets`,
      {
        method: "POST",
        body: formData,
      },
    );

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
      throw new Error(
        data?.error || "Certificate assets could not be uploaded.",
      );
    }

    return data;
  }

  // ---------------------------------------------------------
  // CREATE SEMINAR
  // ---------------------------------------------------------

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) {
      return;
    }

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

      // -----------------------------------------------------
      // CREATE SEMINAR
      // -----------------------------------------------------

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

      // -----------------------------------------------------
      // UPLOAD CERTIFICATE ASSETS
      // -----------------------------------------------------

      await uploadCertificateAssets(data.id);

      // -----------------------------------------------------
      // REDIRECT
      // -----------------------------------------------------

      router.push(`/dashboard/seminars/${data.id}`);

      router.refresh();
    } catch (error) {
      console.error("CREATE SEMINAR ERROR:", error);

      setError(
        error?.message || "Something went wrong while creating the seminar.",
      );
    } finally {
      setLoading(false);
      setUploadingAssets(false);
    }
  }

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------

  return (
    <main className="min-h-screen bg-slate-50">
      <Header loading={loading} />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        {/* HEADER */}

        <div className="mb-8">
          <div className="mb-4 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-600" />

            <span className="text-xs font-bold uppercase tracking-[0.15em] text-blue-600">
              Seminar Management
            </span>
          </div>

          <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Create a new seminar
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500 sm:text-base">
            Create your seminar, configure the certificate, upload presentation
            resources and generate your student registration QR code.
          </p>
        </div>

        {/* FORM */}

        <form
          onSubmit={handleSubmit}
          noValidate
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_40px_rgba(15,23,42,0.06)]"
        >
          {/* BASIC INFORMATION */}

          <div className="border-b border-slate-200 bg-linear-to-r from-slate-50 to-white px-5 py-6 sm:px-8">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
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
                </svg>
              </div>

              <div>
                <h2 className="font-bold text-slate-950">
                  Seminar Information
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Enter the basic information for your seminar.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-10 p-5 sm:p-8">
            {/* ERROR */}

            {error && (
              <div
                role="alert"
                className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 font-bold text-red-600">
                  !
                </div>

                <div>
                  <p className="text-sm font-bold text-red-900">
                    Unable to complete request
                  </p>

                  <p className="mt-1 text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            {/* TITLE */}

            <div>
              <div className="mb-2 flex items-center justify-between">
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
                required
                className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
              />
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
                  placeholder="e.g. Government Polytechnic Pune"
                  maxLength={200}
                  required
                  className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
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
                  placeholder="e.g. Nikhil Kandhare"
                  maxLength={150}
                  className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                />
              </div>
            </div>

            {/* DATE */}

            <div className="max-w-md">
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
                className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
              />
            </div>

            {/* DESCRIPTION */}

            <div>
              <div className="mb-2 flex items-center justify-between">
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
                className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
              />
            </div>

            {/* =================================================
                CERTIFICATE CONFIGURATION
            ================================================= */}

            <section className="overflow-hidden rounded-2xl border border-amber-200 bg-linear-to-br from-amber-50/60 via-white to-white">
              <div className="border-b border-amber-100 px-5 py-5 sm:px-6">
                <div className="flex items-start gap-4">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700">
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
                      <path d="M4 4h16v16H4z" />
                      <path d="M8 8h8" />
                      <path d="M8 12h8" />
                      <path d="M8 16h4" />
                    </svg>
                  </div>

                  <div>
                    <h2 className="font-bold text-slate-950">
                      Certificate Configuration
                    </h2>

                    <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-500">
                      Upload the signature assets that will be automatically
                      placed on student completion certificates.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-3">
                <FileUpload
                  id="trainerSignature"
                  label="Industrial Trainer Signature"
                  description="Digital signature shown above the Industrial Trainer label."
                  file={trainerSignature}
                  preview={trainerPreview}
                  onChange={(event) => handleFileChange(event, "trainer")}
                />

                <FileUpload
                  id="authorizedSignature"
                  label="Authorized Signature"
                  description="Signature shown above the Authorized Signatory label."
                  file={authorizedSignature}
                  preview={authorizedPreview}
                  onChange={(event) => handleFileChange(event, "authorized")}
                />
              </div>

              <div className="border-t border-amber-100 bg-amber-50/50 px-5 py-4 sm:px-6">
                <p className="text-xs leading-5 text-amber-800">
                  <strong>Certificate tip:</strong> Use transparent PNG files
                  for signatures whenever possible. This gives the generated
                  certificate a clean professional appearance.
                </p>
              </div>
            </section>

            {/* NEXT STEPS */}

            <div className="overflow-hidden rounded-2xl border border-blue-100 bg-blue-50/70">
              <div className="border-b border-blue-100 px-5 py-4">
                <h3 className="text-sm font-bold text-blue-950">
                  What happens next?
                </h3>

                <p className="mt-1 text-xs leading-5 text-blue-700">
                  After creating the seminar, you can complete the seminar setup
                  from its management page.
                </p>
              </div>

              <div className="grid gap-px bg-blue-100 sm:grid-cols-3">
                <div className="bg-blue-50/70 p-5">
                  <div className="mb-3 grid h-9 w-9 place-items-center rounded-lg bg-white text-sm font-bold text-blue-600 shadow-sm">
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
                  <div className="mb-3 grid h-9 w-9 place-items-center rounded-lg bg-white text-sm font-bold text-blue-600 shadow-sm">
                    02
                  </div>

                  <p className="text-sm font-bold text-blue-950">Generate QR</p>

                  <p className="mt-1 text-xs leading-5 text-blue-700">
                    Generate and share the seminar registration QR.
                  </p>
                </div>

                <div className="bg-blue-50/70 p-5">
                  <div className="mb-3 grid h-9 w-9 place-items-center rounded-lg bg-white text-sm font-bold text-blue-600 shadow-sm">
                    03
                  </div>

                  <p className="text-sm font-bold text-blue-950">
                    Issue Certificates
                  </p>

                  <p className="mt-1 text-xs leading-5 text-blue-700">
                    Generate completion certificates using the configured
                    signatures.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* FOOTER */}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50/70 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              disabled={loading}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />

                  {uploadingAssets
                    ? "Uploading Certificate Assets..."
                    : "Creating Seminar..."}
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
