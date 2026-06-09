export function toCsvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  const needsQuotes = /[",\r\n]/.test(s);
  const escaped = s.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

export function buildCsv(headers: string[], rows: unknown[][]): string {
  const csvLines = [
    headers.map(toCsvCell).join(","),
    ...rows.map((row) => row.map(toCsvCell).join(",")),
  ];
  return csvLines.join("\r\n");
}

export function downloadCsv(fileName: string, csv: string): void {
  const blob = new Blob([`\uFEFF${csv}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
