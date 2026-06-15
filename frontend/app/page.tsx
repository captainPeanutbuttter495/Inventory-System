"use client";

// This is a Client Component (note the directive above): it needs browser state
// (useState) and effects (useEffect), and it talks to the Django API directly from
// the browser — which is exactly why the backend needed CORS. A Server Component
// couldn't use onClick/onChange or run in the browser.

import { useEffect, useState } from "react";

type Item = {
  id: number;
  name: string;
  created_at: string;
};

// NEXT_PUBLIC_ so the value is inlined into the browser bundle. Falls back to the
// local Django dev server. Heads-up for later: this is baked in at BUILD time, so a
// container built with one URL won't pick up a different one at run time.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadItems() {
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/items/`);
      if (!res.ok) throw new Error(`GET failed: ${res.status}`);
      setItems(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load items");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, []);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/items/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error(`POST failed: ${res.status}`);
      const created: Item = await res.json();
      setItems((prev) => [created, ...prev]); // optimistic-ish: API returns newest-first too
      setName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add item");
    }
  }

  return (
    <main className="mx-auto max-w-md p-8 font-sans">
      <h1 className="mb-6 text-2xl font-semibold">Inventory</h1>

      <form onSubmit={addItem} className="mb-6 flex gap-2">
        <input
          data-testid="item-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New item name"
          className="flex-1 rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          data-testid="add-btn"
          type="submit"
          className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
        >
          Add
        </button>
      </form>

      {error && (
        <p data-testid="error" className="mb-4 text-sm text-red-600">
          {error}
        </p>
      )}

      {loading ? (
        <p>Loading…</p>
      ) : (
        <ul data-testid="item-list" className="space-y-2">
          {items.length === 0 && (
            <li className="text-zinc-500">No items yet.</li>
          )}
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded border border-zinc-200 px-3 py-2 dark:border-zinc-800"
            >
              {item.name}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
