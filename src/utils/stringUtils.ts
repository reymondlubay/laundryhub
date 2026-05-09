/**
 * Converts a string to Pascal case (capitalizes the first letter of each word).
 * @param str - The string to convert.
 * @returns The string in Pascal case.
 */
export function toPascalCase(str: string): string {
  if (!str) return str;
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Title case: first letter of each word uppercase, remaining letters lowercase.
 */
export function toTitleCaseWords(str: string): string {
  const t = str.trim();
  if (!t) return str;
  return t
    .split(/\s+/)
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join(" ");
}
