"use client";

import { useState } from "react";

export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
}

/**
 * Returns a new array with the item at `index` moved to `index + delta`.
 * Returns the original array unchanged when the move is out of bounds (#913).
 */
export function moveItem<T>(items: readonly T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta;
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) {
    return [...items];
  }
  const next = [...items];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved as T);
  return next;
}

interface KeyValueBuilderProps {
  onChange: (pairs: KeyValuePair[]) => void;
  initialPairs?: KeyValuePair[];
}

export function KeyValueBuilder({ onChange, initialPairs = [] }: KeyValueBuilderProps) {
  const [pairs, setPairs] = useState<KeyValuePair[]>(initialPairs);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  // Announced to assistive technology after each keyboard or button move (#913).
  const [announcement, setAnnouncement] = useState("");

  const addRow = () => {
    const newPair: KeyValuePair = {
      id: Date.now().toString(),
      key: "",
      value: "",
    };
    const updated = [...pairs, newPair];
    setPairs(updated);
    onChange(updated);
  };

  const removeRow = (id: string) => {
    const updated = pairs.filter((p) => p.id !== id);
    setPairs(updated);
    onChange(updated);
  };

  const updatePair = (id: string, key: string, value: string) => {
    const updated = pairs.map((p) => (p.id === id ? { ...p, key, value } : p));
    setPairs(updated);
    onChange(updated);
  };

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;

    const draggedIndex = pairs.findIndex((p) => p.id === draggedId);
    const targetIndex = pairs.findIndex((p) => p.id === targetId);
    if (draggedIndex < 0 || targetIndex < 0) return;

    const itemA = pairs[draggedIndex];
    const itemB = pairs[targetIndex];
    if (!itemA || !itemB) return;

    const updated = [...pairs];
    updated[draggedIndex] = itemB;
    updated[targetIndex] = itemA;

    setPairs(updated);
    onChange(updated);
    setDraggedId(null);
  };

  const reorder = (index: number, delta: -1 | 1) => {
    const updated = moveItem(pairs, index, delta);
    const moved = pairs[index];
    if (!moved || updated.every((item, i) => item === pairs[i])) return;

    setPairs(updated);
    onChange(updated);
    const newPosition = index + delta + 1;
    const label = moved.key.trim() ? `"${moved.key.trim()}"` : `row ${index + 1}`;
    setAnnouncement(`Moved ${label} to position ${newPosition} of ${pairs.length}.`);
  };

  const handleRowKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, index: number) => {
    // Alt + Arrow moves the row, matching the visible move buttons.
    if (!e.altKey) return;
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      reorder(index, e.key === "ArrowUp" ? -1 : 1);
    }
  };

  const isKeyUnique = (key: string, excludeId: string) => {
    return !pairs.some((p) => p.id !== excludeId && p.key === key);
  };

  return (
    <div className="space-y-3">
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
      {pairs.map((pair, index) => (
        <div
          key={pair.id}
          draggable
          onDragStart={() => handleDragStart(pair.id)}
          onDragOver={handleDragOver}
          onDrop={() => handleDrop(pair.id)}
          onKeyDown={(e) => handleRowKeyDown(e, index)}
          className="flex gap-2 items-center p-3 bg-gray-50 rounded border border-gray-200 cursor-move hover:bg-gray-100 transition-colors"
        >
          <span className="text-gray-400 text-lg" aria-hidden="true">
            ⋮⋮
          </span>
          <div className="flex flex-col">
            <button
              type="button"
              onClick={() => reorder(index, -1)}
              disabled={index === 0}
              aria-label={`Move row ${index + 1} up`}
              className="px-1 text-xs text-gray-600 hover:text-blue-600 disabled:opacity-30 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            >
              ▲
            </button>
            <button
              type="button"
              onClick={() => reorder(index, 1)}
              disabled={index === pairs.length - 1}
              aria-label={`Move row ${index + 1} down`}
              className="px-1 text-xs text-gray-600 hover:text-blue-600 disabled:opacity-30 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            >
              ▼
            </button>
          </div>
          <input
            type="text"
            placeholder="Key"
            value={pair.key}
            onChange={(e) => updatePair(pair.id, e.target.value, pair.value)}
            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Value"
            value={pair.value}
            onChange={(e) => updatePair(pair.id, pair.key, e.target.value)}
            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => removeRow(pair.id)}
            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
            aria-label="Remove row"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        className="w-full py-2 px-3 border-2 border-dashed border-gray-300 rounded text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors font-medium"
      >
        + Add Row
      </button>
    </div>
  );
}
