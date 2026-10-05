"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function StudentPage({ params }) {
  const [slug, setSlug] = useState("");
  const [seminar, setSeminar] = useState(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
  });

  const [registrationId, setRegistrationId] = useState("");
  const [accessToken, setAccessToken] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // ---------------------------------------------------------
  // GET SLUG
  // ---------------------------------------------------------

  useEffect(() => {
    async function getSlug() {
      try {
        const resolvedParams = await params;

        const currentSlug = resolvedParams?.slug || "";

        if (!currentSlug) {
          setError("Invalid seminar link");
          setLoading(false);
          return;
        }

        setSlug(currentSlug);
      } catch (error) {
        console.error("PARAM ERROR:", error);

        setError("Invalid seminar link");
        setLoading(false);
      }
    }

    getSlug();
  }, [params]);

  // ---------------------------------------------------------
  // LOAD SEMINAR
  // ---------------------------------------------------------

  useEffect(() => {
    if (!slug) return;

    async function loadSeminar() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/seminars/public/${encodeURIComponent(slug)}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
            cache: "no-store",
          },
        );

        const contentType = response.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
          const text = await response.text();

          console.error("Invalid seminar response:", response.status, text);

          throw new Error(
            `Server returned unexpected response (${response.status})`,
          );
        }

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Failed to load seminar");
        }

        setSeminar(data.seminar);
      } catch (error) {
        console.error("LOAD SEMINAR ERROR:", error);

        setError(error?.message || "Unable to load seminar");
      } finally {
        setLoading(false);
      }
    }

    loadSeminar();
  }, [slug]);

  function change(event) {
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
  // VALIDATE FORM
  // ---------------------------------------------------------

  function validateForm() {
    const name = form.name.trim();
    const phone = form.phone.trim();

    if (!name) {
      return "Please enter your full name.";
    }

    if (name.length < 2) {
      return "Please enter a valid name.";
    }

    if (name.length > 100) {
      return "Name cannot exceed 100 characters.";
    }

    if (!phone) {
      return "Please enter your phone number.";
    }

    const phoneDigits = phone.replace(/\D/g, "");

    if (phoneDigits.length < 10) {
      return "Please enter a valid phone number.";
    }

    if (phoneDigits.length > 15) {
      return "Please enter a valid phone number.";
    }

    return null;
  }

  // ---------------------------------------------------------
  // SUBMIT REGISTRATION
  // ---------------------------------------------------------

  async function submit(event) {
    event.preventDefault();

    if (submitting) return;

    setError("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    if (!slug) {
      setError("Invalid seminar link.");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        slug,
      };

      console.log("Submitting registration:", {
        name: payload.name,
        phone: payload.phone,
        slug: payload.slug,
      });

      const response = await fetch("/api/registrations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      console.log("Registration status:", response.status);

      const contentType = response.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        const text = await response.text();

        console.error("Registration API returned non-JSON:", text);

        throw new Error(
          `Server returned unexpected response (${response.status})`,
        );
      }

      const data = await response.json();

      console.log("Registration response:", {
        success: data?.success,
        registrationId: data?.registrationId,
        hasAccessToken: Boolean(data?.accessToken),
        alreadyRegistered: data?.alreadyRegistered,
      });

      if (!response.ok) {
        throw new Error(data?.error || "Registration failed");
      }

      if (!data?.registrationId) {
        throw new Error(
          "Registration succeeded but registration ID was not returned.",
        );
      }

      if (!data?.accessToken) {
        throw new Error(
          "Registration succeeded but access token was not returned.",
        );
      }

      // -----------------------------------------------------
      // SAVE ACCESS DETAILS
      // -----------------------------------------------------

      setRegistrationId(data.registrationId);
      setAccessToken(data.accessToken);
      setError("");

      console.log("Registration successful:", data.registrationId);
    } catch (error) {
      console.error("REGISTRATION ERROR:", error);

      setError(error?.message || "Unable to complete registration.");
    } finally {
      setSubmitting(false);
    }
  }

  // ---------------------------------------------------------
  // LOADING
  // ---------------------------------------------------------

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-4">
        <div className="text-center">
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />

          <p className="mt-4 text-sm font-medium text-slate-600">
            Loading seminar...
          </p>
        </div>
      </main>
    );
  }

  // ---------------------------------------------------------
  // ERROR WITHOUT SEMINAR
  // ---------------------------------------------------------

  if (error && !seminar) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/40">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-red-50 text-2xl font-bold text-red-600">
            !
          </div>

          <h1 className="mt-5 text-xl font-bold text-slate-900">
            Seminar unavailable
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600">{error}</p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  // ---------------------------------------------------------
  // REGISTERED STUDENT
  // ---------------------------------------------------------

  if (registrationId && accessToken) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 sm:py-12">
        <div className="mx-auto max-w-3xl">
          {/* SUCCESS CARD */}

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
            {/* SUCCESS HEADER */}

            <div className="p-6 sm:p-8">
              {/* SEMINAR */}

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
                  Seminar
                </p>

                <h2 className="mt-2 text-xl font-bold text-slate-900">
                  {seminar?.title}
                </h2>

                {seminar?.collegeName && (
                  <p className="mt-2 text-sm font-medium text-slate-600">
                    {seminar.collegeName}
                  </p>
                )}

                {seminar?.speakerName && (
                  <p className="mt-1 text-sm text-slate-500">
                    Speaker: {seminar.speakerName}
                  </p>
                )}
              </div>

              {/* CERTIFICATE */}

              <div className="mt-6 rounded-2xl border border-amber-200 bg-linear-to-br from-amber-50 via-white to-white p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700">
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
                        <path d="M12 3v12" />
                        <path d="m7 10 5 5 5-5" />
                        <path d="M5 21h14" />
                        <path d="M5 3h14" />
                      </svg>
                    </div>

                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        Certificate of Completion
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Download your official Electrosoft System seminar
                        completion certificate.
                      </p>
                    </div>
                  </div>

                  <a
                    href={`/api/certificates/${encodeURIComponent(
                      registrationId,
                    )}/download?accessToken=${encodeURIComponent(accessToken)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-amber-700 focus:outline-none focus:ring-4 focus:ring-amber-600/20"
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
                      aria-hidden="true"
                    >
                      <path d="M12 3v12" />
                      <path d="m7 10 5 5 5-5" />
                      <path d="M5 21h14" />
                    </svg>
                    Download Certificate
                  </a>
                </div>
              </div>

              {/* RESOURCES */}

              <div className="mt-8">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Seminar Resources
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Your seminar materials are available below.
                    </p>
                  </div>

                  {seminar?.resources?.length > 0 && (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                      {seminar.resources.length}{" "}
                      {seminar.resources.length === 1 ? "File" : "Files"}
                    </span>
                  )}
                </div>

                {/* NO RESOURCES */}

                {seminar?.resources?.length === 0 && (
                  <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                    <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-white text-xl shadow-sm">
                      📁
                    </div>

                    <p className="mt-4 font-semibold text-slate-700">
                      No resources available yet
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      The organizer has not uploaded any files yet.
                    </p>
                  </div>
                )}

                {/* RESOURCE LIST */}

                {seminar?.resources?.length > 0 && (
                  <div className="mt-5 space-y-3">
                    {seminar.resources.map((resource) => {
                      const downloadUrl = `/api/resources/${resource.id}/download?registrationId=${encodeURIComponent(
                        registrationId,
                      )}&accessToken=${encodeURIComponent(accessToken)}`;

                      const isPdf = resource.fileType === "PDF";

                      return (
                        <div
                          key={resource.id}
                          className="group flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex min-w-0 items-center gap-4">
                            <div
                              className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-xs font-black ${
                                isPdf
                                  ? "bg-red-50 text-red-600"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {resource.fileType}
                            </div>

                            <div className="min-w-0">
                              <h3 className="truncate font-bold text-slate-900">
                                {resource.title}
                              </h3>

                              <p className="mt-1 truncate text-xs text-slate-500">
                                {resource.fileName}
                              </p>
                            </div>
                          </div>

                          <a
                            href={downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                          >
                            {isPdf ? (
                              <>
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
                                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                                View file
                              </>
                            ) : (
                              <>
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
                                  <path d="M12 3v12" />
                                  <path d="m7 10 5 5 5-5" />
                                  <path d="M5 21h14" />
                                </svg>
                                Download
                              </>
                            )}
                          </a>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* FOOTER NOTE */}

              {/* FOOTER NOTE */}

              <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-center text-xs leading-5 text-blue-800 sm:text-sm">
                  Keep this page open while accessing your seminar materials.
                  Your registration gives you access to the resources provided
                  for this seminar.
                </p>
              </div>

              {/* COMPANY / SOCIAL FOOTER */}

              <div className="mt-8 border-t border-slate-200 pt-8">
                <div className="text-center">
                  <div className="-mb-4 flex justify-center">
                    <Image
                      src="/logo.png"
                      alt="Electrosoft System logo"
                      width={60}
                      height={60}
                      className="h-24 w-24 object-contain"
                    />
                  </div>

                  <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-500 sm:text-sm">
                    Technical Training • Innovation • Industry-Ready Skills
                  </p>

                  {/* WEBSITE */}

                  <Link
                    href="https://electrosoftsystem.in/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition hover:text-blue-700 hover:underline"
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
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M2 12h20" />
                      <path d="M12 2a15.3 15.3 0 0 1 0 20" />
                      <path d="M12 2a15.3 15.3 0 0 0 0 20" />
                    </svg>
                    electrosoftsystem.in
                  </Link>

                  {/* SOCIAL MEDIA */}

                  <div className="mt-6 flex items-center justify-center gap-3">
                    {/* Instagram */}
                    <Link
                      href="https://www.instagram.com/electrosoft_system_pune/"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Electrosoft System on Instagram"
                      className="group grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:-translate-y-0.5 hover:border-pink-200 hover:text-pink-600 hover:shadow-md"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <rect width="20" height="20" x="2" y="2" rx="5" />
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                        <path d="M17.5 6.5h.01" />
                      </svg>
                    </Link>

                    {/* LinkedIn */}
                    <Link
                      href="https://www.linkedin.com/in/electrosoft-system-083a22237/"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Electrosoft System on LinkedIn"
                      className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-600 hover:shadow-md"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M6.5 8.5A2.5 2.5 0 1 0 6.5 3.5a2.5 2.5 0 0 0 0 5zM4 10h5v10H4V10zm7 0h4.8v1.4h.1c.7-1.2 2.1-2 4.2-2 4.5 0 5.3 2.9 5.3 6.7V20h-5v-3.5c0-1.7 0-3.9-2.4-3.9-2.4 0-2.7 1.9-2.7 3.8V20h-5V10z" />
                      </svg>
                    </Link>

                    {/* YouTube */}
                    <Link
                      href="https://www.youtube.com/@ElectrosoftSystemPune"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Electrosoft System on YouTube"
                      className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:text-red-600 hover:shadow-md"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.8V8.2l6.5 3.8-6.5 3.8z" />
                      </svg>
                    </Link>

                    {/* Facebook */}
                    <Link
                      href="https://www.facebook.com/itsLearningElectronics/"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Electrosoft System on Facebook"
                      className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:text-blue-600 hover:shadow-md"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M14 8h3V4.5c-.5-.1-1.8-.2-3.4-.2-3.3 0-5.5 2-5.5 5.7V13H5v3.9h3.1V24H12v-7.1h3.4L16 13h-4V10.3c0-1.1.3-2.3 2-2.3z" />
                      </svg>
                    </Link>
                  </div>

                  {/* Bottom text */}

                  <p className="mt-6 text-[11px] font-medium uppercase tracking-wider text-slate-400">
                    © {new Date().getFullYear()} Electrosoft System. All rights
                    reserved.
                  </p>

                  <p className="mt-1 text-[11px] text-slate-400">
                    Seminar Resources Platform
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ---------------------------------------------------------
  // REGISTRATION FORM
  // ---------------------------------------------------------

  return (
    <main className="min-h-screen bg-linear-to-br from-slate-50 via-white to-slate-100 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-xl">
        {/* BRAND */}

        <div className="mb-2 text-center">
          <div className="mx-auto w-fit border rounded-full p-4">
            <Image src={"/logo.png"} alt="logo" width={100} height={100} />
          </div>
        </div>

        {/* MAIN CARD */}

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/60">
          {/* SEMINAR HEADER */}

          <div className="border-b border-slate-100 bg-linear-to-br from-slate-50 to-white p-6 sm:p-8">
            <div className="mb-4 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-700">
              Seminar Resources
            </div>

            <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              {seminar?.title}
            </h1>
          </div>

          {/* FORM */}

          <div className="p-6 sm:p-8">
            <div className="mb-7">
              <h2 className="text-lg font-bold text-slate-900">
                Download seminar PPT
              </h2>
            </div>

            {/* ERROR */}

            {error && (
              <div
                role="alert"
                className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4"
              >
                <div className="flex gap-3">
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-red-100 text-sm font-bold text-red-600">
                    !
                  </div>

                  <p className="text-sm leading-5 text-red-700">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={submit} noValidate className="space-y-5">
              {/* NAME */}

              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-bold text-slate-800"
                >
                  Full Name
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <input
                  id="name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={change}
                  required
                  maxLength={100}
                  autoComplete="name"
                  placeholder="Enter your full name"
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                />
              </div>

              {/* PHONE */}

              <div>
                <label
                  htmlFor="phone"
                  className="mb-2 block text-sm font-bold text-slate-800"
                >
                  Phone Number
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={change}
                  required
                  maxLength={20}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="Enter your phone number"
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                />
              </div>

              {/* SUBMIT */}

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white shadow-lg shadow-slate-950/10 transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-950/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Downloading...
                  </>
                ) : (
                  <>
                    Download
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
            </form>
          </div>
        </div>

        {/* FOOTER */}

        <p className="mt-6 text-center text-xs font-medium text-slate-400">
          Powered by ELECTROSOFT SYSTEM
        </p>
      </div>
    </main>
  );
}
