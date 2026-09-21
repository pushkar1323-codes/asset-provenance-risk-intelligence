import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';

/**
 * Component tests render real UI trees through React Testing Library. If a
 * render triggers a React warning/error (a prop-type mismatch, a missing
 * `key`, an unhandled promise inside an effect, etc.) it would normally only
 * show up as noise in the test log rather than failing the test. This turns
 * any unexpected `console.error`/`console.warn` call during a test into a
 * hard failure, so "no console errors" is something the test suite actually
 * enforces for every component it renders, not just an unverified claim.
 */
let errorSpy: ReturnType<typeof vi.spyOn>;
let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  errorSpy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    throw new Error(`Unexpected console.error during test: ${String(args[0])}`);
  });
  warnSpy = vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    throw new Error(`Unexpected console.warn during test: ${String(args[0])}`);
  });
});

afterEach(() => {
  errorSpy.mockRestore();
  warnSpy.mockRestore();
});
