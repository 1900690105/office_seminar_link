import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const admin = await getAdmin();

  if (!admin) {
    redirect("/login");
  }

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

  const stats = [
    {
      label: "Total Seminars",
      value: seminars,
      description: "All seminars created",
      icon: "▣",
      href: "/dashboard/seminars",
    },
    {
      label: "Published",
      value: publishedSeminars,
      description: "Currently available",
      icon: "✓",
      href: "/dashboard/seminars",
    },
    {
      label: "Students",
      value: students,
      description: "Registered students",
      icon: "◉",
      href: "/dashboard/students",
    },
    {
      label: "Resources",
      value: resources,
      description: "Uploaded files",
      icon: "▤",
      href: "/dashboard/seminars",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50">
      {/* =====================================================
          HEADER
      ====================================================== */}

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="group flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white shadow-sm transition group-hover:bg-slate-800">
              ES
            </div>

            <div>
              <p className="text-sm font-bold tracking-tight text-slate-900">
                ELECTROSOFT SYSTEM
              </p>

              <p className="text-xs text-slate-500">
                Seminar Management Platform
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-medium text-slate-400">ADMIN</p>

              <p className="max-w-45 truncate text-sm font-medium text-slate-700">
                {admin.email}
              </p>
            </div>

            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-slate-300"
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

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* ===================================================
            PAGE HEADER
        ==================================================== */}

        <section className="mb-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />

                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Admin Dashboard
                </span>
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Seminar Overview
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                Create seminars, upload learning resources, generate QR codes,
                and manage student registrations from one place.
              </p>
            </div>

            <Link
              href="/dashboard/seminars/new"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
            >
              <span className="text-lg leading-none">+</span>
              Create Seminar
            </Link>
          </div>
        </section>

        {/* ===================================================
            STATISTICS
        ==================================================== */}

        <section
          aria-label="Dashboard statistics"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          {stats.map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    {stat.label}
                  </p>

                  <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                    {stat.value.toLocaleString("en-IN")}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-lg font-bold text-slate-700 transition group-hover:bg-slate-900 group-hover:text-white">
                  {stat.icon}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-slate-400">{stat.description}</p>

                <span className="text-xs font-semibold text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-700">
                  View →
                </span>
              </div>
            </Link>
          ))}
        </section>

        {/* ===================================================
            QUICK OVERVIEW
        ==================================================== */}

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Registrations
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-950">
                  {registrations.toLocaleString("en-IN")}
                </p>
              </div>

              <div className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
                Students
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-400">
              Total seminar registrations across all events.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Published Seminars
                </p>

                <p className="mt-2 text-2xl font-bold text-slate-950">
                  {publishedSeminars.toLocaleString("en-IN")}
                </p>
              </div>

              <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                Live
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-400">
              Seminars currently available for students.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Resources</p>

                <p className="mt-2 text-2xl font-bold text-slate-950">
                  {resources.toLocaleString("en-IN")}
                </p>
              </div>

              <div className="rounded-xl bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700">
                Files
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-400">
              Presentations and documents uploaded for students.
            </p>
          </div>
        </section>

        {/* ===================================================
            RECENT SEMINARS
        ==================================================== */}

        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* SECTION HEADER */}

          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-950">
                Recent Seminars
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Your latest created seminars and their activity.
              </p>
            </div>

            <Link
              href="/dashboard/seminars"
              className="inline-flex items-center text-sm font-semibold text-slate-700 transition hover:text-slate-950"
            >
              View all seminars
              <span className="ml-1">→</span>
            </Link>
          </div>

          {/* EMPTY STATE */}

          {recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-xl text-slate-500">
                +
              </div>

              <h3 className="mt-4 font-semibold text-slate-900">
                No seminars yet
              </h3>

              <p className="mt-1 max-w-sm text-sm text-slate-500">
                Create your first seminar to start collecting student
                registrations and sharing resources.
              </p>

              <Link
                href="/dashboard/seminars/new"
                className="mt-5 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Create your first seminar
              </Link>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE */}

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-190">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70">
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Seminar
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Date
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </th>

                      <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Students
                      </th>

                      <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Files
                      </th>

                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Action
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
                            className="block"
                          >
                            <p className="max-w-70 truncate font-semibold text-slate-900 group-hover:text-blue-600">
                              {seminar.title}
                            </p>

                            <p className="mt-1 max-w-70 truncate text-sm text-slate-500">
                              {seminar.collegeName}
                            </p>

                            {seminar.speakerName && (
                              <p className="mt-1 max-w-70 truncate text-xs text-slate-400">
                                Speaker: {seminar.speakerName}
                              </p>
                            )}
                          </Link>
                        </td>

                        {/* DATE */}

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {formatDate(seminar.seminarDate)}
                        </td>

                        {/* STATUS */}

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                              seminar.status,
                            )}`}
                          >
                            {seminar.status}
                          </span>
                        </td>

                        {/* STUDENTS */}

                        <td className="px-5 py-4 text-center">
                          <span className="font-semibold text-slate-800">
                            {seminar._count.registrations}
                          </span>
                        </td>

                        {/* FILES */}

                        <td className="px-5 py-4 text-center">
                          <span className="font-semibold text-slate-800">
                            {seminar._count.resources}
                          </span>
                        </td>

                        {/* ACTION */}

                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/dashboard/seminars/${seminar.id}`}
                            className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                          >
                            Manage
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS */}

              <div className="divide-y divide-slate-100 md:hidden">
                {recent.map((seminar) => (
                  <Link
                    key={seminar.id}
                    href={`/dashboard/seminars/${seminar.id}`}
                    className="block p-5 transition hover:bg-slate-50"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-slate-900">
                          {seminar.title}
                        </h3>

                        <p className="mt-1 truncate text-sm text-slate-500">
                          {seminar.collegeName}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                          seminar.status,
                        )}`}
                      >
                        {seminar.status}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
                      <span>📅 {formatDate(seminar.seminarDate)}</span>

                      <span>👥 {seminar._count.registrations} students</span>

                      <span>📄 {seminar._count.resources} files</span>
                    </div>

                    {seminar.speakerName && (
                      <p className="mt-3 text-xs text-slate-400">
                        Speaker: {seminar.speakerName}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </>
          )}
        </section>

        {/* ===================================================
            FOOTER
        ==================================================== */}

        <footer className="pb-4 pt-2 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} ELECTROSOFT SYSTEM · Seminar Management
          Platform
        </footer>
      </div>
    </main>
  );
}
