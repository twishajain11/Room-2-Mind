/**
 * Server-side enforcement of the §3.1 privacy architecture.
 *
 * The claim "only numeric feature vectors are persisted" is worth more if the
 * server refuses anything else rather than trusting the client that built the
 * payload. A base64 image would arrive as a very long string, so strings are
 * rejected outright inside feature and subscore objects: there is no legitimate
 * reason for one to appear there, and no way to smuggle media past a rule that
 * only admits numbers.
 */

export class PayloadError extends Error {}

/** Longest string accepted anywhere a string is legitimately allowed. */
export const MAX_STRING = 280;

/**
 * Recursively assert that a value contains numbers, booleans, and nulls only.
 *
 * Throws `PayloadError` naming the offending path, which the route turns into a
 * 400 the client can act on.
 */
export function assertNumericOnly(value: unknown, path = "features"): void {
  if (value === null) return;

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new PayloadError(`${path} is not a finite number`);
    }
    return;
  }

  if (typeof value === "boolean") return;

  if (Array.isArray(value)) {
    value.forEach((v, i) => assertNumericOnly(v, `${path}[${i}]`));
    return;
  }

  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      assertNumericOnly(v, `${path}.${k}`);
    }
    return;
  }

  throw new PayloadError(
    `${path} is a ${typeof value}; only numbers, booleans, and nulls may be stored`
  );
}

/** A handle is an opaque client-generated id. No email, no name, no PII. */
export function assertHandle(handle: unknown): string {
  if (typeof handle !== "string" || !/^[a-z0-9-]{6,40}$/.test(handle)) {
    throw new PayloadError("handle must be 6 to 40 characters of a-z, 0-9, or -");
  }
  return handle;
}

/** Integer inside an inclusive range, or a `PayloadError` naming the field. */
export function assertInt(value: unknown, name: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new PayloadError(`${name} must be a whole number from ${min} to ${max}`);
  }
  return value;
}

export function assertOptionalBoolean(value: unknown, name: string): boolean | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "boolean") throw new PayloadError(`${name} must be true or false`);
  return value;
}
