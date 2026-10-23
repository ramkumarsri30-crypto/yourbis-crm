import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest runs without global APIs, so React Testing Library cannot
// auto-register cleanup itself. Unmount after every test instead.
afterEach(() => {
  cleanup();
});
