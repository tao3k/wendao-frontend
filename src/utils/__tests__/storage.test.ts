import { describe, it, expect, beforeEach, vi } from "vitest";
import { createStorage } from "../storage";

describe("storage utilities", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("createStorage", () => {
    it("should return default value when key does not exist", () => {
      const storage = createStorage("test-key", "default");
      expect(storage.get()).toBe("default");
    });

    it("should return stored value when key exists", () => {
      const storage = createStorage("test-key", "default");
      storage.set("stored");
      expect(storage.get()).toBe("stored");
    });

    it("should store and retrieve objects", () => {
      const storage = createStorage("test-obj", { name: "default" });
      storage.set({ name: "stored" });
      expect(storage.get()).toEqual({ name: "stored" });
    });

    it("should store and retrieve numbers", () => {
      const storage = createStorage("test-num", 0);
      storage.set(42);
      expect(storage.get()).toBe(42);
    });

    it("should store and retrieve arrays", () => {
      const storage = createStorage<string[]>("test-arr", []);
      storage.set(["a", "b", "c"]);
      expect(storage.get()).toEqual(["a", "b", "c"]);
    });

    it("should remove stored value", () => {
      const storage = createStorage("test-key", "default");
      storage.set("stored");
      storage.remove();
      expect(storage.get()).toBe("default");
    });

    it("should handle JSON parse errors gracefully", () => {
      localStorage.setItem("bad-json", "not valid json");
      const storage = createStorage("bad-json", "default");
      expect(storage.get()).toBe("default");
    });

    it("should handle storage errors gracefully on set", () => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new Error("QuotaExceededError");
      });

      const storage = createStorage("test-key", "default");
      // Should not throw
      expect(() => storage.set("value")).not.toThrow();

      localStorage.setItem = originalSetItem;
    });
  });
});
