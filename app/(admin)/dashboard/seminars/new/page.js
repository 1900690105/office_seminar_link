"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

const INITIAL_FORM = {
  title: "",
  collegeName: "",
  speakerName: "",
  seminarDate: "",
  description: "",
};

const inputClass =
  "h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 disabled:cursor-not-allowed disabled:bg-slate-100";

function SignatureSelector({
  id,
  label,
  description,
  signatures,
  value,
  onChange,
  loading,
}) {
  const selectedSignature = signatures.find(
    (signature) => signature.id === value,
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-bold text-slate-800"
      >
        {label}
        <span className="ml-2 text-xs font-normal text-slate-400">
          Optional
        </span>
      </label>

      <p className="mb-4 text-xs leading-5 text-slate-500">{description}</p>

      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={loading}
        className={inputClass}
      >
        <option value="">
          {loading ? "Loading signatures..." : "No signature selected"}
        </option>

        {signatures.map((signature) => (
          <option key={signature.id} value={signature.id}>
            {signature.name}
            {signature.role ? ` — ${signature.role}` : ""}
          </option>
        ))}
      </select>

      {selectedSignature ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex min-h-28 items-center justify-center rounded-lg border border-slate-200 bg-white p-4">
            <img
              src={selectedSignature.imageUrl}
              alt={`${selectedSignature.name} signature`}
              className="max-h-20 max-w-full object-contain"
            />
          </div>

          <p className="mt-3 text-sm font-bold text-slate-800">
            {selectedSignature.name}
          </p>

          {selectedSignature.role && (
            <p className="mt-1 text-xs text-slate-500">
              {selectedSignature.role}
            </p>
          )}
        </div>
      ) : (
        <div className="mt-4 flex min-h-28 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 text-center">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
            className="text-slate-400"
          >
            <path d="M4 20h16" />
            <path d="M5 16.5 16.5 5 19 7.5 7.5 19H5z" />
          </svg>

          <p className="mt-2 text-xs text-slate-500">
            Select a signature to preview it
          </p>
        </div>
      )}
    </div>
  );
}

export default function NewSeminarPage() {
  const router = useRouter();

  const [form, setForm] = useState(INITIAL_FORM);
  const [signatures, setSignatures] = useState([]);
  const [trainerSignatureStaffId, setTrainerSignatureStaffId] = useState("");
  const [authorizedSignatureStaffId, setAuthorizedSignatureStaffId] =
    useState("");

  const [loadingSignatures, setLoadingSignatures] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSignatures() {
      try {
        const response = await fetch("/api/staff-signatures", {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data?.error || "Unable to load staff signatures.");
        }

        // The staff-signatures API returns { signatures: [...] }.
        const items = Array.isArray(data.signatures) ? data.signatures : [];

        if (!cancelled) {
          setSignatures(items.filter((signature) => signature.isActive));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Unable to load staff signatures.");
        }
      } finally {
        if (!cancelled) {
          setLoadingSignatures(false);
        }
      }
    }

    loadSignatures();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (error) setError("");
  }

  function validateForm() {
    const title = form.title.trim();
    const collegeName = form.collegeName.trim();
    const speakerName = form.speakerName.trim();
    const description = form.description.trim();

    if (!title || title.length < 3) {
      return "Seminar title must contain at least 3 characters.";
    }

    if (title.length > 150) {
      return "Seminar title cannot exceed 150 characters.";
    }

    if (!collegeName || collegeName.length < 2) {
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

        // These IDs reference reusable StaffSignature records.
        trainerSignatureStaffId: trainerSignatureStaffId || null,
        authorizedSignatureStaffId: authorizedSignatureStaffId || null,
      };

      const response = await fetch("/api/seminars", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "Unable to create seminar.");
      }

      if (!data?.id) {
        throw new Error(
          "The seminar was created, but no seminar ID was returned.",
        );
      }

      router.push(`/dashboard/seminars/${data.id}`);
      router.refresh();
    } catch (err) {
      console.error("CREATE SEMINAR ERROR:", err);

      setError(
        err?.message || "Something went wrong while creating the seminar.",
      );
    } finally {
      setLoading(false);
    }
  }

  const selectedTrainer = signatures.find(
    (item) => item.id === trainerSignatureStaffId,
  );

  const selectedAuthorized = signatures.find(
    (item) => item.id === authorizedSignatureStaffId,
  );

  return (
    <main className="min-h-screen bg-slate-50">
      <Header loading={loading} />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
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
            Create your seminar, configure its certificate signatures, and
            continue to resources, registration QR codes, and certificate
            generation.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_40px_rgba(15,23,42,0.06)]"
        >
          <div className="border-b border-slate-200 bg-linear-to-r from-slate-50 to-white px-5 py-6 sm:px-8">
            <h2 className="font-bold text-slate-950">Seminar Information</h2>
            <p className="mt-1 text-sm text-slate-500">
              Enter the basic information for your seminar.
            </p>
          </div>

          <div className="space-y-8 p-5 sm:p-8">
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-4"
              >
                <p className="text-sm font-bold text-red-900">
                  Unable to complete request
                </p>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            )}

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="title"
                  className="text-sm font-bold text-slate-800"
                >
                  Seminar Title <span className="text-red-500">*</span>
                </label>
                <span className="text-xs text-slate-400">
                  {form.title.length}/150
                </span>
              </div>

              <input
                id="title"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g. Full Stack Web Development Seminar"
                maxLength={150}
                required
                className={inputClass}
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label
                  htmlFor="collegeName"
                  className="mb-2 block text-sm font-bold text-slate-800"
                >
                  College Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="collegeName"
                  name="collegeName"
                  value={form.collegeName}
                  onChange={handleChange}
                  placeholder="e.g. Government Polytechnic Pune"
                  maxLength={200}
                  required
                  className={inputClass}
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
                  value={form.speakerName}
                  onChange={handleChange}
                  placeholder="e.g. Nikhil Kandhare"
                  maxLength={150}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="max-w-md">
              <label
                htmlFor="seminarDate"
                className="mb-2 block text-sm font-bold text-slate-800"
              >
                Seminar Date <span className="text-red-500">*</span>
              </label>
              <input
                id="seminarDate"
                name="seminarDate"
                type="date"
                value={form.seminarDate}
                onChange={handleChange}
                required
                className={inputClass}
              />
            </div>

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
                rows={5}
                maxLength={2000}
                placeholder="Describe the seminar, topics covered, and learning objectives..."
                className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
              />
            </div>

            <section className="overflow-hidden rounded-2xl border border-amber-200 bg-linear-to-br from-amber-50/60 via-white to-white">
              <div className="border-b border-amber-100 px-5 py-5 sm:px-6">
                <h2 className="font-bold text-slate-950">
                  Certificate Configuration
                </h2>
                <p className="mt-1 text-sm leading-5 text-slate-500">
                  Select saved signatures from your Staff Signature Library. You
                  can manage the library separately without uploading the same
                  signature for every seminar.
                </p>
              </div>

              <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-2">
                <SignatureSelector
                  id="trainerSignatureStaffId"
                  label="Industrial Trainer Signature"
                  description="Signature displayed above the Industrial Trainer label."
                  signatures={signatures}
                  value={trainerSignatureStaffId}
                  onChange={setTrainerSignatureStaffId}
                  loading={loadingSignatures}
                />

                <SignatureSelector
                  id="authorizedSignatureStaffId"
                  label="Authorized Signature"
                  description="Signature displayed above the Authorized Signatory label."
                  signatures={signatures}
                  value={authorizedSignatureStaffId}
                  onChange={setAuthorizedSignatureStaffId}
                  loading={loadingSignatures}
                />
              </div>

              {!loadingSignatures && signatures.length === 0 && (
                <div className="mx-5 mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:mx-6">
                  <p className="text-sm font-bold text-amber-900">
                    No active signatures found
                  </p>
                  <p className="mt-1 text-sm text-amber-800">
                    You can still create the seminar without signatures. Add
                    signatures from the Staff Signature Library to configure
                    them here.
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push("/dashboard/staff-signatures")}
                    className="mt-3 inline-flex items-center rounded-lg bg-amber-900 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
                  >
                    Open Signature Library
                  </button>
                </div>
              )}

              {signatures.length > 0 && (
                <div className="border-t border-amber-100 bg-amber-50/50 px-5 py-4 sm:px-6">
                  <p className="text-xs leading-5 text-amber-900">
                    <strong>Selected:</strong> Trainer:{" "}
                    {selectedTrainer?.name || "None"}{" "}
                    <span className="mx-1">·</span>
                    Authorized: {selectedAuthorized?.name || "None"}
                  </p>
                </div>
              )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-blue-100 bg-blue-50/70">
              <div className="border-b border-blue-100 px-5 py-4">
                <h3 className="text-sm font-bold text-blue-950">
                  What happens next?
                </h3>
                <p className="mt-1 text-xs leading-5 text-blue-700">
                  After creating the seminar, continue its setup from the
                  seminar management page.
                </p>
              </div>

              <div className="grid gap-px bg-blue-100 sm:grid-cols-3">
                {[
                  {
                    number: "01",
                    title: "Upload Resources",
                    description: "Add PDF, PPT, PPTX, DOC, or DOCX files.",
                  },
                  {
                    number: "02",
                    title: "Generate QR",
                    description: "Create and share the registration QR code.",
                  },
                  {
                    number: "03",
                    title: "Issue Certificates",
                    description:
                      "Generate certificates with the selected signatures.",
                  },
                ].map((step) => (
                  <div key={step.number} className="bg-blue-50/70 p-5">
                    <div className="mb-3 grid h-9 w-9 place-items-center rounded-lg bg-white text-sm font-bold text-blue-600 shadow-sm">
                      {step.number}
                    </div>
                    <p className="text-sm font-bold text-blue-950">
                      {step.title}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-blue-700">
                      {step.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>

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
