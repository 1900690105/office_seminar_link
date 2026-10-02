"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

export default function StudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState([]);
  const [seminars, setSeminars] = useState([]);

  const [search, setSearch] = useState("");
  const [seminarId, setSeminarId] = useState("");

  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const loadStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (seminarId) {
        params.set("seminarId", seminarId);
      }

      params.set("page", String(page));
      params.set("limit", String(limit));

      const response = await fetch(`/api/students?${params.toString()}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to load students");
      }

      setStudents(data.students || []);
      setSeminars(data.seminars || []);
      setPagination(
        data.pagination || {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      );
    } catch (error) {
      console.error("STUDENTS PAGE ERROR:", error);

      setError(error?.message || "Unable to load students");
    } finally {
      setLoading(false);
    }
  }, [search, seminarId, page, limit]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  // ---------------------------------------------------------
  // FORMAT DATE
  // ---------------------------------------------------------

  function formatDate(date) {
    if (!date) return "-";

    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(date));
  }

  function formatDateTime(date) {
    if (!date) return "-";

    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  }

  // ---------------------------------------------------------
  // GET FILTERED EXPORT DATA
  // ---------------------------------------------------------

  async function getAllStudentsForExport() {
    const params = new URLSearchParams();

    if (search.trim()) {
      params.set("search", search.trim());
    }

    if (seminarId) {
      params.set("seminarId", seminarId);
    }

    params.set("page", "1");
    params.set("limit", "100");

    const firstResponse = await fetch(`/api/students?${params.toString()}`, {
      cache: "no-store",
    });

    const firstData = await firstResponse.json();

    if (!firstResponse.ok) {
      throw new Error(firstData?.error || "Failed to fetch export data");
    }

    const totalPages = firstData?.pagination?.totalPages || 1;

    let allStudents = [...(firstData.students || [])];

    if (totalPages > 1) {
      const requests = [];

      for (let currentPage = 2; currentPage <= totalPages; currentPage++) {
        const pageParams = new URLSearchParams();

        if (search.trim()) {
          pageParams.set("search", search.trim());
        }

        if (seminarId) {
          pageParams.set("seminarId", seminarId);
        }

        pageParams.set("page", String(currentPage));
        pageParams.set("limit", "100");

        requests.push(
          fetch(`/api/students?${pageParams.toString()}`, {
            cache: "no-store",
          }).then((response) => response.json()),
        );
      }

      const results = await Promise.all(requests);

      for (const result of results) {
        if (result?.students) {
          allStudents.push(...result.students);
        }
      }
    }

    return allStudents;
  }

  // ---------------------------------------------------------
  // EXPORT EXCEL
  // ---------------------------------------------------------

  async function exportExcel() {
    try {
      setExporting(true);
      setError("");

      const allStudents = await getAllStudentsForExport();

      if (!allStudents.length) {
        setError("There are no students to export.");
        return;
      }

      const rows = allStudents.map((student, index) => ({
        "Sr. No.": index + 1,
        "Student Name": student.name,
        "Phone Number": student.phone,
        "Registration Count": student.registrations?.length || 0,
        Seminars:
          student.registrations
            ?.map((registration) => registration.seminar?.title)
            .filter(Boolean)
            .join(", ") || "-",
        Colleges:
          [
            ...new Set(
              student.registrations
                ?.map((registration) => registration.seminar?.collegeName)
                .filter(Boolean),
            ),
          ].join(", ") || "-",
        "First Registration": student.createdAt
          ? formatDateTime(student.createdAt)
          : "-",
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows);

      worksheet["!cols"] = [
        { wch: 8 },
        { wch: 28 },
        { wch: 18 },
        { wch: 18 },
        { wch: 45 },
        { wch: 35 },
        { wch: 24 },
      ];

      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(workbook, worksheet, "Students");

      const selectedSeminar = seminars.find(
        (seminar) => seminar.id === seminarId,
      );

      const safeName =
        selectedSeminar?.title?.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40) ||
        "All_Seminars";

      const fileName = `Seminar_Students_${safeName}_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;

      XLSX.writeFile(workbook, fileName);
    } catch (error) {
      console.error("EXPORT ERROR:", error);

      setError(error?.message || "Failed to export students");
    } finally {
      setExporting(false);
    }
  }

  // ---------------------------------------------------------
  // SEARCH
  // ---------------------------------------------------------

  function handleSearch(event) {
    setSearch(event.target.value);
    setPage(1);
  }

  function handleSeminarChange(event) {
    setSeminarId(event.target.value);
    setPage(1);
  }

  function clearFilters() {
    setSearch("");
    setSeminarId("");
    setPage(1);
  }

  // ---------------------------------------------------------
  // PAGINATION
  // ---------------------------------------------------------

  const pageNumbers = useMemo(() => {
    const totalPages = pagination.totalPages || 0;

    if (totalPages <= 1) return [];

    const pages = [];

    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }, [pagination.totalPages, page]);

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------

  return (
    <main className="min-h-screen bg-slate-50">
      {/* HEADER */}

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
              <button
                type="button"
                onClick={() => {
                  router.push("/dashboard");
                }}
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
              </button>{" "}
              ELECTROSOFT SYSTEM
            </p>

            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
              Students
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage seminar registrations and student data.
            </p>
          </div>

          <button
            type="button"
            onClick={exportExcel}
            disabled={exporting || pagination.total === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exporting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Exporting...
              </>
            ) : (
              <>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3v12" />
                  <path d="m7 10 5 5 5-5" />
                  <path d="M5 21h14" />
                </svg>
                Export Excel
              </>
            )}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* STATS */}

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Total Students</p>

            <p className="mt-2 text-3xl font-black text-slate-950">
              {pagination.total}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Seminars</p>

            <p className="mt-2 text-3xl font-black text-slate-950">
              {seminars.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Current Page</p>

            <p className="mt-2 text-3xl font-black text-slate-950">
              {page}
              <span className="ml-1 text-base font-medium text-slate-400">
                / {pagination.totalPages || 1}
              </span>
            </p>
          </div>
        </div>

        {/* FILTER CARD */}

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="font-bold text-slate-900">Search & Filter</h2>

            <p className="mt-1 text-xs text-slate-500">
              Find students by name, phone number or seminar.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_320px_auto]">
            {/* SEARCH */}

            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>

              <input
                type="search"
                value={search}
                onChange={handleSearch}
                placeholder="Search name or phone..."
                className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
              />
            </div>

            {/* SEMINAR */}

            <select
              value={seminarId}
              onChange={handleSeminarChange}
              className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
            >
              <option value="">All Seminars</option>

              {seminars.map((seminar) => (
                <option key={seminar.id} value={seminar.id}>
                  {seminar.title}
                </option>
              ))}
            </select>

            {/* CLEAR */}

            <button
              type="button"
              onClick={clearFilters}
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-5 text-sm font-bold text-slate-600 transition hover:bg-slate-100"
            >
              Clear
            </button>
          </div>
        </section>

        {/* ERROR */}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {/* TABLE */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="font-bold text-slate-900">
                Student Registrations
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Showing {students.length} of {pagination.total} students
              </p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 p-5">
              {[1, 2, 3, 4, 5].map((item) => (
                <div
                  key={item}
                  className="h-16 animate-pulse rounded-xl bg-slate-100"
                />
              ))}
            </div>
          ) : students.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-xl">
                👥
              </div>

              <h3 className="mt-4 font-bold text-slate-900">
                No students found
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Try changing your search or filter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-212.5 text-left">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200">
                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                      #
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Student
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Phone
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Seminar
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                      College
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Registered
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {students.map((student, index) => {
                    const latestRegistration = student.registrations?.[0];

                    return (
                      <tr
                        key={student.id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4 text-sm font-medium text-slate-400">
                          {(page - 1) * limit + index + 1}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-900 text-sm font-black text-white">
                              {student.name?.charAt(0)?.toUpperCase() || "S"}
                            </div>

                            <div>
                              <p className="font-bold text-slate-900">
                                {student.name}
                              </p>

                              <p className="mt-0.5 text-xs text-slate-400">
                                {student.registrations?.length} registration
                                {student.registrations?.length !== 1 ? "s" : ""}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
                            {student.phone}
                          </span>
                        </td>

                        <td className="max-w-62.5 px-5 py-4">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {latestRegistration?.seminar?.title || "-"}
                          </p>
                        </td>

                        <td className="max-w-55 px-5 py-4">
                          <p className="truncate text-sm text-slate-600">
                            {latestRegistration?.seminar?.collegeName || "-"}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <p className="whitespace-nowrap text-sm font-medium text-slate-700">
                            {formatDate(latestRegistration?.registeredAt)}
                          </p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* PAGINATION */}

          {!loading && pagination.totalPages > 1 && (
            <div className="flex flex-col gap-4 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Page <span className="font-bold text-slate-800">{page}</span> of{" "}
                <span className="font-bold text-slate-800">
                  {pagination.totalPages}
                </span>
              </p>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                {pageNumbers.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setPage(pageNumber)}
                    className={`h-9 min-w-9 rounded-lg px-2 text-sm font-bold transition ${
                      pageNumber === page
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {pageNumber}
                  </button>
                ))}

                <button
                  type="button"
                  disabled={page === pagination.totalPages}
                  onClick={() =>
                    setPage((current) =>
                      Math.min(pagination.totalPages, current + 1),
                    )
                  }
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
