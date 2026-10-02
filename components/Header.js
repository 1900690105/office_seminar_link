import Image from "next/image";
import { useRouter } from "next/navigation";
import React from "react";

const Header = ({ loading = false }) => {
  const router = useRouter();
  function handleCancel() {
    if (loading) return;

    router.push("/dashboard");
  }
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* BRAND */}

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-300 text-sm font-black text-white shadow-sm">
              <Image src={"/sublogo.png"} alt="logo" width={50} height={50} />
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
    </>
  );
};

export default Header;
