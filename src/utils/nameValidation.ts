/**
 * Name field sanitization and validation utilities.
 * Used in Register screen to enforce clean name input.
 */

/** Strips everything except A–Z letters from first name */
export const sanitizeFirstName = (value: string): string =>
  value.replace(/[^a-zA-Z]/g, "");

/** Strips everything except A–Z letters, "." and "-" from last name */
export const sanitizeLastName = (value: string): string =>
  value.replace(/[^a-zA-Z.-]/g, "");
