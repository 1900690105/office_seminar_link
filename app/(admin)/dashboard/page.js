import Link from "next/link";
import { redirect } from "next/navigation";
import Image from "next/image";

import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  // =========================================================
  // AUTHENTICATION
  // =========================================================

  const admin = await getAdmin();

  if (!admin) {
    redirect("/login");
  }

  // =========================================================
  // DATABASE
  // =========================================================

  const [seminars, students, resources, publishedSeminars, registrations] =
    await Promise.all([
      prisma.seminar.count(),

      prisma.student.count(),

      prisma.resource.count(),

      prisma.seminar.count({
        where: {
          status: "PUBLISHED",
        },
      }),

      prisma.registration.count(),
    ]);

  // =========================================================
  // RECENT SEMINARS
  // =========================================================

  const recent = await prisma.seminar.findMany({
    orderBy: {
      createdAt: "desc",
    },

    take: 8,

    select: {
      id: true,
      title: true,
      slug: true,
      collegeName: true,
      speakerName: true,
      seminarDate: true,
      status: true,
      createdAt: true,

      _count: {
        select: {
          registrations: true,
          resources: true,
        },
      },
    },
  });

  // =========================================================
  // HELPERS
  // =========================================================

  function formatDate(date) {
    try {
      return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(date));
    } catch {
      return "—";
    }
  }

  function getStatusClasses(status) {
    switch (status) {
      case "PUBLISHED":
        return "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20";

      case "ARCHIVED":
        return "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/20";

      case "DRAFT":
      default:
        return "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20";
    }
  }

  function getStatusLabel(status) {
    switch (status) {
      case "PUBLISHED":
        return "Published";

      case "ARCHIVED":
        return "Archived";

      case "DRAFT":
      default:
        return "Draft";
    }
  }

  // =========================================================
  // STATISTICS
  // =========================================================

  const stats = [
    {
      label: "Total Seminars",
      value: seminars,
      description: "All seminars created",
      icon: "▣",
      href: "/dashboard/seminars",
      iconClass: "bg-blue-50 text-blue-700",
    },

    {
      label: "Published",
      value: publishedSeminars,
      description: "Currently available",
      icon: "✓",
      href: "/dashboard/seminars",
      iconClass: "bg-emerald-50 text-emerald-700",
    },

    {
      label: "Students",
      value: students,
      description: "Registered students",
      icon: "◉",
      href: "/dashboard/students",
      iconClass: "bg-violet-50 text-violet-700",
    },

    {
      label: "Resources",
      value: resources,
      description: "Uploaded files",
      icon: "▤",
      href: "/dashboard/seminars",
      iconClass: "bg-orange-50 text-orange-700",
    },
  ];

  // =========================================================
  // UI
  // =========================================================

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* =====================================================
          HEADER
      ====================================================== */}

      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          {/* BRAND */}

          <Link
            href="/dashboard"
            className="group flex min-w-0 items-center gap-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
            aria-label="Electrosoft System Dashboard"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-900 shadow-sm">
              <Image
                src="/sublogo.png"
                alt="Electrosoft System"
                width={40}
                height={40}
                priority
                className="h-10 w-10 object-contain p-1"
              />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-bold tracking-tight text-slate-900">
                ELECTROSOFT SYSTEM
              </p>

              <p className="hidden text-xs text-slate-500 sm:block">
                Seminar Management Platform
              </p>
            </div>
          </Link>

          {/* ADMIN */}

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <div className="hidden text-right md:block">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Admin
              </p>

              <p className="max-w-52 truncate text-sm font-medium text-slate-700">
                {admin?.email || "Administrator"}
              </p>
            </div>

            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-1 sm:h-10 sm:px-4 sm:text-sm"
              >
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* =====================================================
          CONTENT
      ====================================================== */}

      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        {/* ===================================================
            PAGE HEADER
        ==================================================== */}

        <section className="mb-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full bg-emerald-500"
                  aria-hidden="true"
                />

                <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                  Admin Dashboard
                </span>
              </div>

              <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl lg:text-4xl">
                Seminar Overview
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                Create seminars, upload learning resources, generate QR codes,
                manage registrations, and issue certificates from one place.
              </p>
            </div>

            <Link
              href="/dashboard/seminars/new"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 sm:w-auto"
            >
              <span className="text-lg leading-none" aria-hidden="true">
                +
              </span>
              Create Seminar
            </Link>
          </div>
        </section>

        {/* ===================================================
            STATISTICS
        ==================================================== */}

        <section
          aria-label="Dashboard statistics"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4"
        >
          {stats.map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="group min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 sm:p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-500">
                    {stat.label}
                  </p>

                  <p className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                    {stat.value.toLocaleString("en-IN")}
                  </p>
                </div>

                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-bold transition group-hover:bg-slate-900 group-hover:text-white sm:h-11 sm:w-11 ${stat.iconClass}`}
                  aria-hidden="true"
                >
                  {stat.icon}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="truncate text-xs text-slate-400">
                  {stat.description}
                </p>

                <span className="shrink-0 text-xs font-semibold text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-700">
                  View →
                </span>
              </div>
            </Link>
          ))}
        </section>

        {/* ===================================================
            QUICK OVERVIEW
        ==================================================== */}

        <section className="mt-5 grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-3">
          {/* REGISTRATIONS */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-500">
                  Registrations
                </p>

                <p className="mt-2 text-2xl font-black text-slate-950">
                  {registrations.toLocaleString("en-IN")}
                </p>
              </div>

              <div className="shrink-0 rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">
                Students
              </div>
            </div>

            <p className="mt-3 text-xs leading-5 text-slate-400">
              Total seminar registrations across all events.
            </p>
          </div>

          {/* PUBLISHED */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-500">
                  Published Seminars
                </p>

                <p className="mt-2 text-2xl font-black text-slate-950">
                  {publishedSeminars.toLocaleString("en-IN")}
                </p>
              </div>

              <div className="shrink-0 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                Live
              </div>
            </div>

            <p className="mt-3 text-xs leading-5 text-slate-400">
              Seminars currently available for student registration.
            </p>
          </div>

          {/* RESOURCES */}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-500">Resources</p>

                <p className="mt-2 text-2xl font-black text-slate-950">
                  {resources.toLocaleString("en-IN")}
                </p>
              </div>

              <div className="shrink-0 rounded-xl bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700">
                Files
              </div>
            </div>

            <p className="mt-3 text-xs leading-5 text-slate-400">
              Presentations and documents uploaded for students.
            </p>
          </div>
        </section>

        {/* ===================================================
            RECENT SEMINARS
        ==================================================== */}

        <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* HEADER */}

          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-bold tracking-tight text-slate-950">
                Recent Seminars
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Your latest seminars and their registration activity.
              </p>
            </div>

            <Link
              href="/dashboard/seminars"
              className="inline-flex w-fit items-center rounded-lg py-1 text-sm font-semibold text-slate-700 transition hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              View all seminars
              <span className="ml-1" aria-hidden="true">
                →
              </span>
            </Link>
          </div>

          {/* EMPTY STATE */}

          {recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-xl text-slate-500"
                aria-hidden="true"
              >
                +
              </div>

              <h3 className="mt-4 font-semibold text-slate-900">
                No seminars yet
              </h3>

              <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
                Create your first seminar to start collecting registrations and
                sharing resources.
              </p>

              <Link
                href="/dashboard/seminars/new"
                className="mt-5 inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
              >
                Create your first seminar
              </Link>
            </div>
          ) : (
            <>
              {/* =================================================
                  DESKTOP / TABLET TABLE
              ================================================== */}

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[850px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80">
                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                        Seminar
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                        Date
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                        Status
                      </th>

                      <th className="px-5 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
                        Students
                      </th>

                      <th className="px-5 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
                        Files
                      </th>

                      <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {recent.map((seminar) => (
                      <tr
                        key={seminar.id}
                        className="group transition hover:bg-slate-50"
                      >
                        {/* SEMINAR */}

                        <td className="px-5 py-4">
                          <Link
                            href={`/dashboard/seminars/${seminar.id}`}
                            className="block max-w-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <p className="truncate font-semibold text-slate-900 transition group-hover:text-blue-600">
                              {seminar.title}
                            </p>

                            <p className="mt-1 truncate text-sm text-slate-500">
                              {seminar.collegeName}
                            </p>

                            {seminar.speakerName && (
                              <p className="mt-1 truncate text-xs text-slate-400">
                                Speaker: {seminar.speakerName}
                              </p>
                            )}
                          </Link>
                        </td>

                        {/* DATE */}

                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                          {formatDate(seminar.seminarDate)}
                        </td>

                        {/* STATUS */}

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${getStatusClasses(
                              seminar.status,
                            )}`}
                          >
                            {getStatusLabel(seminar.status)}
                          </span>
                        </td>

                        {/* STUDENTS */}

                        <td className="px-5 py-4 text-center">
                          <span className="font-semibold text-slate-800">
                            {seminar._count.registrations.toLocaleString(
                              "en-IN",
                            )}
                          </span>
                        </td>

                        {/* FILES */}

                        <td className="px-5 py-4 text-center">
                          <span className="font-semibold text-slate-800">
                            {seminar._count.resources.toLocaleString("en-IN")}
                          </span>
                        </td>

                        {/* ACTIONS */}

                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/dashboard/seminars/${seminar.id}`}
                              className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300"
                            >
                              Manage
                            </Link>

                            <Link
                              href={`/dashboard/seminars/${seminar.id}/edit`}
                              aria-label={`Edit ${seminar.title}`}
                              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                            >
                              <svg
                                width="15"
                                height="15"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                              </svg>
                              Edit
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* =================================================
                  MOBILE CARDS
              ================================================== */}

              <div className="divide-y divide-slate-100 md:hidden">
                {recent.map((seminar) => (
                  <article
                    key={seminar.id}
                    className="p-4 transition active:bg-slate-50 sm:p-5"
                  >
                    {/* TITLE + STATUS */}

                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/dashboard/seminars/${seminar.id}`}
                          className="block rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <h3 className="line-clamp-2 text-sm font-bold leading-5 text-slate-900">
                            {seminar.title}
                          </h3>

                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                            {seminar.collegeName}
                          </p>
                        </Link>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${getStatusClasses(
                          seminar.status,
                        )}`}
                      >
                        {getStatusLabel(seminar.status)}
                      </span>
                    </div>

                    {/* SPEAKER */}

                    {seminar.speakerName && (
                      <p className="mt-3 truncate text-xs text-slate-400">
                        Speaker: {seminar.speakerName}
                      </p>
                    )}

                    {/* META */}

                    <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Date
                        </p>

                        <p className="mt-1 text-xs font-semibold text-slate-700">
                          {formatDate(seminar.seminarDate)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Students
                        </p>

                        <p className="mt-1 text-xs font-semibold text-slate-700">
                          {seminar._count.registrations.toLocaleString("en-IN")}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Resources
                        </p>

                        <p className="mt-1 text-xs font-semibold text-slate-700">
                          {seminar._count.resources.toLocaleString("en-IN")}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Created
                        </p>

                        <p className="mt-1 text-xs font-semibold text-slate-700">
                          {formatDate(seminar.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* ACTIONS */}

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <Link
                        href={`/dashboard/seminars/${seminar.id}`}
                        className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
                      >
                        Manage
                      </Link>

                      <Link
                        href={`/dashboard/seminars/${seminar.id}/edit`}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1"
                      >
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                        Edit Seminar
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>

        {/* ===================================================
            FOOTER
        ==================================================== */}

        <footer className="pb-3 pt-7 text-center">
          <p className="text-xs font-semibold text-slate-400">
            © {new Date().getFullYear()} ELECTROSOFT SYSTEM
          </p>

          <p className="mt-1 text-[11px] text-slate-400">
            Seminar Management Platform
          </p>
        </footer>
      </div>
    </main>
  );
}
