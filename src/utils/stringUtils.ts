/**
 * Converts a string to Pascal case (capitalizes the first letter of each word).
 * @param str - The string to convert.
 * @returns The string in Pascal case.
 */
export function toPascalCase(str: string): string {
  if (!str) return str;
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
}
