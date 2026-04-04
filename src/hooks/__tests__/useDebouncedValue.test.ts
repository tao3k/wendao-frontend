import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebouncedValue } from "../useDebouncedValue";

describe("useDebouncedValue", () => {
  it("emits debounced value after delay", async () => {
    vi.useFakeTimers();

    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 200), {
      initialProps: { value: "a" },
    });

    expect(result.current).toBe("a");

    rerender({ value: "b" });
    expect(result.current).toBe("a");

    await act(() => {
      vi.advanceTimersByTime(180);
    });

    expect(result.current).toBe("a");

    await act(() => {
      vi.advanceTimersByTime(20);
    });

    expect(result.current).toBe("b");

    vi.useRealTimers();
  });

  it("falls through immediately when disabled", () => {
    vi.useFakeTimers();

    const { result, rerender } = renderHook(
      ({ value, enabled }) => useDebouncedValue(value, 250, { enabled }),
      {
        initialProps: { value: "a", enabled: false },
      },
    );

    rerender({ value: "b", enabled: false });

    expect(result.current).toBe("b");

    rerender({ value: "c", enabled: true });

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe("b");

    act(() => {
      vi.advanceTimersByTime(249);
    });
    expect(result.current).toBe("c");
    vi.useRealTimers();
  });
});
