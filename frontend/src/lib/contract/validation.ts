/**
 * Input validation for registering an asset. Kept independent of the UI so
 * it can be tested directly and reused if another entry point is added.
 */

export type RegisterAssetInput = {
  readonly assetIdentifier: string;
  readonly assetCategory: number;
};

export type ValidationResult =
  | { readonly valid: true }
  | { readonly valid: false; readonly errors: Record<string, string> };

const MIN_IDENTIFIER_LENGTH = 3;
const MAX_IDENTIFIER_LENGTH = 128;
const MIN_CATEGORY = 0;
const MAX_CATEGORY = 255;

export const validateRegisterAssetInput = (input: RegisterAssetInput): ValidationResult => {
  const errors: Record<string, string> = {};

  const identifier = input.assetIdentifier.trim();
  if (identifier.length < MIN_IDENTIFIER_LENGTH) {
    errors.assetIdentifier = `Enter at least ${MIN_IDENTIFIER_LENGTH} characters.`;
  } else if (identifier.length > MAX_IDENTIFIER_LENGTH) {
    errors.assetIdentifier = `Must be ${MAX_IDENTIFIER_LENGTH} characters or fewer.`;
  }

  if (
    !Number.isInteger(input.assetCategory) ||
    input.assetCategory < MIN_CATEGORY ||
    input.assetCategory > MAX_CATEGORY
  ) {
    errors.assetCategory = `Select a category between ${MIN_CATEGORY} and ${MAX_CATEGORY}.`;
  }

  return Object.keys(errors).length === 0 ? { valid: true } : { valid: false, errors };
};
