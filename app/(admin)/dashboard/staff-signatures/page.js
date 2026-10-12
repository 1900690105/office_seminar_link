"use client";

import { useCallback, useEffect, useState } from "react";

const EMPTY_FORM = {
  name: "",
  role: "",
  signature: null,
};

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.success) {
    throw new Error(data.error || "Something went wrong.");
  }

  return data;
}

export default function StaffSignaturesPage() {
  const [signatures, setSignatures] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", role: "" });

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadSignatures = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/staff-signatures", {
        method: "GET",
        cache: "no-store",
      });

      const data = await readResponse(response);
      setSignatures(data.signatures || []);
    } catch (err) {
      setError(err.message || "Unable to load staff signatures.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSignatures();
  }, [loadSignatures]);

  async function handleUpload(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!form.name.trim()) {
      setError("Enter the staff member's name.");
      return;
    }

    if (!form.signature) {
      setError("Choose a PNG or JPEG signature image.");
      return;
    }

    const formElement = event.currentTarget;

    const body = new FormData();
    body.append("name", form.name.trim());
    body.append("role", form.role.trim());
    body.append("signature", form.signature);

    setUploading(true);

    try {
      const response = await fetch("/api/staff-signatures", {
        method: "POST",
        body,
      });

      await readResponse(response);

      setForm(EMPTY_FORM);
      formElement.reset();

      setNotice("Staff signature added successfully.");
      await loadSignatures();
    } catch (err) {
      setError(err.message || "Unable to upload the signature.");
    } finally {
      setUploading(false);
    }
  }

  function startEditing(signature) {
    setEditingId(signature.id);
    setEditForm({
      name: signature.name || "",
      role: signature.role || "",
    });
    setError("");
    setNotice("");
  }

  async function saveEdit(id) {
    setError("");
    setNotice("");

    if (!editForm.name.trim()) {
      setError("Staff name is required.");
      return;
    }

    setSavingId(id);

    try {
      const response = await fetch(`/api/staff-signatures/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name.trim(),
          role: editForm.role.trim(),
        }),
      });

      await readResponse(response);

      setEditingId(null);
      setNotice("Staff details updated.");
      await loadSignatures();
    } catch (err) {
      setError(err.message || "Unable to update staff details.");
    } finally {
      setSavingId(null);
    }
  }

  async function toggleActive(signature) {
    setError("");
    setNotice("");
    setSavingId(signature.id);

    try {
      const response = await fetch(`/api/staff-signatures/${signature.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: !signature.isActive,
        }),
      });

      await readResponse(response);

      setNotice(
        signature.isActive ? "Signature deactivated." : "Signature activated.",
      );

      await loadSignatures();
    } catch (err) {
      setError(err.message || "Unable to change signature status.");
    } finally {
      setSavingId(null);
    }
  }

  async function deleteSignature(signature) {
    const confirmed = window.confirm(
      `Delete the signature for ${signature.name}?\n\nSignatures assigned to seminars cannot be deleted.`,
    );

    if (!confirmed) return;

    setError("");
    setNotice("");
    setDeletingId(signature.id);

    try {
      const response = await fetch(`/api/staff-signatures/${signature.id}`, {
        method: "DELETE",
      });

      const data = await readResponse(response);

      setNotice(
        data.cloudinaryCleanup === "needs_review"
          ? "Signature record deleted, but its Cloudinary image needs cleanup."
          : "Staff signature deleted.",
      );

      await loadSignatures();
    } catch (err) {
      setError(err.message || "Unable to delete this signature.");
    } finally {
      setDeletingId(null);
    }
  }

  const activeCount = signatures.filter((item) => item.isActive).length;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
              Electrosoft System
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              Staff Signatures
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Manage reusable staff signatures for seminar certificates. Upload
              each signature once and select it whenever needed.
            </p>
          </div>

          <button
            type="button"
            onClick={loadSignatures}
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "Refresh library"}
          </button>
        </header>

        {(error || notice) && (
          <div
            role={error ? "alert" : "status"}
            className={`rounded-xl border p-4 text-sm ${
              error
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {error || notice}
            <button
              type="button"
              onClick={() => {
                setError("");
                setNotice("");
              }}
              className="ml-3 font-semibold underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Total signatures" value={signatures.length} />
          <StatCard label="Active signatures" value={activeCount} />
          <StatCard
            label="Inactive signatures"
            value={signatures.length - activeCount}
          />
        </section>

        <section className="grid items-start gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold">Add staff signature</h2>
            <p className="mt-1 text-sm text-slate-500">
              PNG or JPEG · Maximum file size 5 MB
            </p>

            <form onSubmit={handleUpload} className="mt-6 space-y-5">
              <div>
                <label
                  htmlFor="staff-name"
                  className="mb-2 block text-sm font-semibold"
                >
                  Staff name *
                </label>
                <input
                  id="staff-name"
                  type="text"
                  required
                  maxLength={100}
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="e.g. Nikhil Kandhare"
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="staff-role"
                  className="mb-2 block text-sm font-semibold"
                >
                  Designation
                </label>
                <input
                  id="staff-role"
                  type="text"
                  maxLength={100}
                  value={form.role}
                  onChange={(event) =>
                    setForm({ ...form, role: event.target.value })
                  }
                  placeholder="e.g. Technical Trainer"
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="staff-signature-file"
                  className="mb-2 block text-sm font-semibold"
                >
                  Signature image *
                </label>
                <input
                  id="staff-signature-file"
                  type="file"
                  required
                  accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    setForm({ ...form, signature: file });
                  }}
                  className="block w-full rounded-xl border border-slate-300 p-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-semibold file:text-blue-700"
                />
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Use a clear signature image with a transparent or white
                  background. PNG is preferable for transparent signatures.
                </p>
              </div>

              {form.signature && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="mb-2 text-xs font-semibold text-slate-500">
                    Selected file
                  </p>
                  <p className="break-all text-sm">{form.signature.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {(form.signature.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={uploading}
                className="min-h-12 w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading ? "Uploading signature..." : "Upload to library"}
              </button>
            </form>
          </div>

          <section className="min-w-0">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">Signature library</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Selectable signatures appear as active.
                </p>
              </div>
              <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                {signatures.length} staff
              </span>
            </div>

            {loading && signatures.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
                Loading staff signatures...
              </div>
            ) : signatures.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <h3 className="font-semibold">Your library is empty</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Upload your first staff signature using the form.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
                {signatures.map((signature) => {
                  const editing = editingId === signature.id;
                  const busy =
                    savingId === signature.id || deletingId === signature.id;

                  return (
                    <article
                      key={signature.id}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3 p-4">
                        <div className="min-w-0">
                          <h3 className="wrap-break-word font-bold">
                            {signature.name}
                          </h3>
                          <p className="mt-1 wrap-break-word text-sm text-slate-500">
                            {signature.role || "No designation added"}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            signature.isActive
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {signature.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <div className="mx-4 flex h-32 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-3">
                        <img
                          src={signature.imageUrl}
                          alt={`${signature.name} signature`}
                          className="max-h-full max-w-full object-contain"
                          loading="lazy"
                        />
                      </div>

                      <div className="space-y-3 p-4">
                        {editing ? (
                          <div className="space-y-3">
                            <div>
                              <label
                                htmlFor={`edit-name-${signature.id}`}
                                className="mb-1 block text-xs font-semibold text-slate-600"
                              >
                                Staff name
                              </label>
                              <input
                                id={`edit-name-${signature.id}`}
                                value={editForm.name}
                                maxLength={100}
                                onChange={(event) =>
                                  setEditForm({
                                    ...editForm,
                                    name: event.target.value,
                                  })
                                }
                                className="min-h-10 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                              />
                            </div>

                            <div>
                              <label
                                htmlFor={`edit-role-${signature.id}`}
                                className="mb-1 block text-xs font-semibold text-slate-600"
                              >
                                Designation
                              </label>
                              <input
                                id={`edit-role-${signature.id}`}
                                value={editForm.role}
                                maxLength={100}
                                onChange={(event) =>
                                  setEditForm({
                                    ...editForm,
                                    role: event.target.value,
                                  })
                                }
                                className="min-h-10 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                              />
                            </div>

                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => saveEdit(signature.id)}
                                className="min-h-10 flex-1 rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                              >
                                {savingId === signature.id
                                  ? "Saving..."
                                  : "Save changes"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="min-h-10 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => startEditing(signature)}
                              className="min-h-10 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
                            >
                              Edit details
                            </button>

                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => toggleActive(signature)}
                              className="min-h-10 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
                            >
                              {savingId === signature.id
                                ? "Updating..."
                                : signature.isActive
                                  ? "Deactivate signature"
                                  : "Reactivate signature"}
                            </button>

                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => deleteSignature(signature)}
                              className="min-h-10 w-full rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                            >
                              {deletingId === signature.id
                                ? "Deleting..."
                                : "Delete signature"}
                            </button>
                          </>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
