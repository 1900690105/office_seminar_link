import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Seminars | Electrosoft System",
  description: "Manage seminars, registrations, and learning resources.",
};

const statusStyles = {
  DRAFT: "bg-amber-50 text-amber-700 ring-amber-600/20",
  PUBLISHED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  ARCHIVED: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

function formatDate(date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export default async function SeminarsPage({ searchParams }) {
  const admin = await getAdmin();

  if (!admin) {
    redirect("/login");
  }

  const params = await searchParams;

  const search = typeof params?.search === "string" ? params.search.trim() : "";

  const status =
    typeof params?.status === "string" ? params.status.toUpperCase() : "ALL";

  const validStatuses = ["ALL", "DRAFT", "PUBLISHED", "ARCHIVED"];

  const selectedStatus = validStatuses.includes(status) ? status : "ALL";

  const where = {
    ...(search
      ? {
          OR: [
            {
              title: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              collegeName: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              speakerName: {
                contains: search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),

    ...(selectedStatus !== "ALL"
      ? {
          status: selectedStatus,
        }
      : {}),
  };

  const seminars = await prisma.seminar.findMany({
    where,
    orderBy: {
      seminarDate: "desc",
    },
    include: {
      _count: {
        select: {
          registrations: true,
          resources: true,
        },
      },
    },
  });

  const totalSeminars = await prisma.seminar.count();

  const publishedSeminars = await prisma.seminar.count({
    where: {
      status: "PUBLISHED",
    },
  });

  const draftSeminars = await prisma.seminar.count({
    where: {
      status: "DRAFT",
    },
  });

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <Link
              href="/dashboard"
              className="text-lg font-bold tracking-tight text-slate-900"
            >
              ELECTROSOFT SYSTEM
            </Link>

            <p className="mt-0.5 text-xs font-medium text-slate-500">
              Seminar Management Platform
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 sm:block"
            >
              Dashboard
            </Link>

            <Link
              href="/dashboard/seminars/new"
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
            >
              <span className="text-lg leading-none">+</span>
              New Seminar
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page heading */}
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
              <Link
                href="/dashboard"
                className="transition hover:text-slate-900"
              >
                Dashboard
              </Link>

              <span>/</span>

              <span className="font-medium text-slate-900">Seminars</span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Seminars
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              Create and manage your college seminars, student registrations, QR
              access, and learning resources.
            </p>
          </div>
        </div>

        {/* Statistics */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Total Seminars
                </p>

                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                  {totalSeminars}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl">
                🎓
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Published</p>

                <p className="mt-2 text-3xl font-bold tracking-tight text-emerald-600">
                  {publishedSeminars}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-xl">
                ✓
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Drafts</p>

                <p className="mt-2 text-3xl font-bold tracking-tight text-amber-600">
                  {draftSeminars}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-xl">
                📝
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <form
            method="GET"
            className="flex flex-col gap-3 lg:flex-row lg:items-center"
          >
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                🔍
              </span>

              <input
                type="search"
                name="search"
                defaultValue={search}
                placeholder="Search by seminar, college or speaker..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <select
              name="status"
              defaultValue={selectedStatus}
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100"
            >
              <option value="ALL">All Status</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
            </select>

            <button
              type="submit"
              className="h-11 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
            >
              Search
            </button>

            {(search || selectedStatus !== "ALL") && (
              <Link
                href="/dashboard/seminars"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
              >
                Clear
              </Link>
            )}
          </form>
        </section>

        {/* Results */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-slate-900">All Seminars</h2>

              <p className="mt-1 text-sm text-slate-500">
                {seminars.length}{" "}
                {seminars.length === 1 ? "seminar" : "seminars"} found
              </p>
            </div>

            {search && (
              <p className="text-sm text-slate-500">
                Results for{" "}
                <span className="font-semibold text-slate-900">"{search}"</span>
              </p>
            )}
          </div>

          {seminars.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                🎓
              </div>

              <h3 className="mt-5 text-lg font-bold text-slate-900">
                No seminars found
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {search || selectedStatus !== "ALL"
                  ? "Try changing your search or filter to find a seminar."
                  : "Create your first seminar to start collecting student registrations."}
              </p>

              <Link
                href="/dashboard/seminars/new"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <span className="text-lg leading-none">+</span>
                Create Seminar
              </Link>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[850px]">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <th className="px-5 py-4">Seminar</th>
                      <th className="px-5 py-4">Date</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4 text-center">Students</th>
                      <th className="px-5 py-4 text-center">Resources</th>
                      <th className="px-5 py-4 text-right">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {seminars.map((seminar) => (
                      <tr
                        key={seminar.id}
                        className="group transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-5">
                          <div className="max-w-[360px]">
                            <Link
                              href={`/dashboard/seminars/${seminar.id}`}
                              className="font-semibold text-slate-900 transition hover:text-blue-600"
                            >
                              {seminar.title}
                            </Link>

                            <p className="mt-1 truncate text-sm text-slate-500">
                              {seminar.collegeName}
                            </p>

                            {seminar.speakerName && (
                              <p className="mt-1 text-xs text-slate-400">
                                Speaker: {seminar.speakerName}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-5 py-5">
                          <p className="text-sm font-medium text-slate-700">
                            {formatDate(seminar.seminarDate)}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            Created {formatDateTime(seminar.createdAt)}
                          </p>
                        </td>

                        <td className="px-5 py-5">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                              statusStyles[seminar.status] || statusStyles.DRAFT
                            }`}
                          >
                            {seminar.status}
                          </span>
                        </td>

                        <td className="px-5 py-5 text-center">
                          <span className="font-semibold text-slate-900">
                            {seminar._count.registrations}
                          </span>
                        </td>

                        <td className="px-5 py-5 text-center">
                          <span className="font-semibold text-slate-900">
                            {seminar._count.resources}
                          </span>
                        </td>

                        <td className="px-5 py-5 text-right">
                          <Link
                            href={`/dashboard/seminars/${seminar.id}`}
                            className="inline-flex rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white hover:text-slate-900"
                          >
                            Manage
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="divide-y divide-slate-100 md:hidden">
                {seminars.map((seminar) => (
                  <article key={seminar.id} className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/seminars/${seminar.id}`}
                          className="font-semibold text-slate-900 hover:text-blue-600"
                        >
                          {seminar.title}
                        </Link>

                        <p className="mt-1 text-sm text-slate-500">
                          {seminar.collegeName}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                          statusStyles[seminar.status] || statusStyles.DRAFT
                        }`}
                      >
                        {seminar.status}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3">
                      <div>
                        <p className="text-xs text-slate-400">Seminar Date</p>
                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {formatDate(seminar.seminarDate)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">Students</p>
                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {seminar._count.registrations}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">Resources</p>
                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {seminar._count.resources}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">Speaker</p>
                        <p className="mt-1 truncate text-sm font-semibold text-slate-700">
                          {seminar.speakerName || "Not specified"}
                        </p>
                      </div>
                    </div>

                    <Link
                      href={`/dashboard/seminars/${seminar.id}`}
                      className="mt-4 flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Manage Seminar
                    </Link>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
