import { act, renderHook } from "@testing-library/react";

import { useAutoSave } from "@/hooks/useAutoSave";

const KEY = "test-autosave-form";

describe("useAutoSave unsaved-change tracking (#898)", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("does not report unsaved changes on mount", () => {
    const { result } = renderHook(() => useAutoSave({ key: KEY, data: { title: "a" } }));
    expect(result.current.state.hasUnsaved).toBe(false);
  });

  it("ignores re-renders that carry identical content", () => {
    const { result, rerender } = renderHook(
      ({ data }: { data: { title: string } }) => useAutoSave({ key: KEY, data }),
      { initialProps: { data: { title: "a" } } }
    );
    rerender({ data: { title: "a" } });
    expect(result.current.state.hasUnsaved).toBe(false);
  });

  it("flags unsaved changes after a meaningful field change", () => {
    const { result, rerender } = renderHook(
      ({ data }: { data: { title: string } }) => useAutoSave({ key: KEY, data }),
      { initialProps: { data: { title: "a" } } }
    );
    rerender({ data: { title: "b" } });
    expect(result.current.state.hasUnsaved).toBe(true);
  });

  it("clears the indicator when saved", () => {
    const { result, rerender } = renderHook(
      ({ data }: { data: { title: string } }) => useAutoSave({ key: KEY, data }),
      { initialProps: { data: { title: "a" } } }
    );
    rerender({ data: { title: "b" } });
    act(() => {
      result.current.save();
    });
    expect(result.current.state.hasUnsaved).toBe(false);
    expect(result.current.state.lastSaved).not.toBeNull();
    expect(JSON.parse(localStorage.getItem(KEY) as string)).toEqual({ title: "b" });
  });

  it("persists only while there are unsaved changes", () => {
    const { rerender } = renderHook(
      ({ data }: { data: { title: string } }) => useAutoSave({ key: KEY, data, interval: 1000 }),
      { initialProps: { data: { title: "a" } } }
    );
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(localStorage.getItem(KEY)).toBeNull();

    rerender({ data: { title: "b" } });
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(JSON.parse(localStorage.getItem(KEY) as string)).toEqual({ title: "b" });
  });

  it("treats a restored draft as the saved baseline", () => {
    localStorage.setItem(KEY, JSON.stringify({ title: "restored" }));
    const { result, rerender } = renderHook(
      ({ data }: { data: { title: string } }) => useAutoSave({ key: KEY, data }),
      { initialProps: { data: { title: "blank" } } }
    );
    act(() => {
      result.current.restore();
    });
    rerender({ data: { title: "restored" } });
    expect(result.current.state.hasUnsaved).toBe(false);
  });
});
