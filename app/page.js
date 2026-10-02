import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/auth";
export default async function Dashboard() {
  const admin = await getAdmin();
  if (!admin) redirect("/login");
  const [seminars, students, resources] = await Promise.all([
    prisma.seminar.count(),
    prisma.student.count(),
    prisma.resource.count(),
  ]);
  const recent = await prisma.seminar.findMany({
    orderBy: { createdAt: "desc" },
    take: 8,
    include: { _count: { select: { registrations: true, resources: true } } },
  });
  return (
    <main className="min-h-screen">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="font-bold">ELECTROSOFT SYSTEM</p>
            <p className="text-xs text-slate-500">Seminar Platform</p>
          </div>
          <form action="/api/auth/logout" method="post">
            <button className="text-sm text-slate-600">Logout</button>
          </form>
        </div>
      </header>
      <div className="mx-auto max-w-7xl p-6">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-slate-500">Manage your college seminars.</p>
          </div>
          <Link
            href="/dashboard/seminars/new"
            className="rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white"
          >
            + Create Seminar
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Seminars", seminars],
            ["Students", students],
            ["Resources", resources],
          ].map(([x, n]) => (
            <div key={x} className="rounded-xl border bg-white p-5">
              <p className="text-sm text-slate-500">{x}</p>
              <p className="mt-2 text-3xl font-bold">{n}</p>
            </div>
          ))}
        </div>
        <section className="mt-8 rounded-xl border bg-white">
          <div className="border-b p-5">
            <h2 className="font-bold">Recent Seminars</h2>
          </div>
          {recent.length === 0 ? (
            <p className="p-6 text-slate-500">No seminars yet.</p>
          ) : (
            <div className="divide-y">
              {recent.map((s) => (
                <Link
                  key={s.id}
                  href={`/dashboard/seminars/${s.id}`}
                  className="flex items-center justify-between p-5 hover:bg-slate-50"
                >
                  <div>
                    <p className="font-semibold">{s.title}</p>
                    <p className="text-sm text-slate-500">{s.collegeName}</p>
                  </div>
                  <div className="text-right text-sm text-slate-500">
                    <p>{s._count.registrations} students</p>
                    <p>{s._count.resources} resources</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
