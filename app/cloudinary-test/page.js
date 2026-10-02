"use client";

import { useState } from "react";

export default function CloudinaryTest() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function testUpload() {
    if (!file) return;

    setLoading(true);
    setResult(null);

    const formData = new FormData();

    formData.append("file", file);

    const response = await fetch("/api/cloudinary-upload-test", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    setResult(data);
    setLoading(false);
  }

  return (
    <main className="mx-auto max-w-xl p-10">
      <h1 className="text-2xl font-bold">Cloudinary Upload Test</h1>

      <input
        type="file"
        className="mt-6 block"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      <button
        onClick={testUpload}
        disabled={!file || loading}
        className="mt-5 rounded-lg bg-black px-5 py-3 text-white disabled:opacity-50"
      >
        {loading ? "Testing..." : "Test Upload"}
      </button>

      {result && (
        <pre className="mt-6 overflow-auto rounded-lg bg-gray-100 p-4 text-sm">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </main>
  );
}
