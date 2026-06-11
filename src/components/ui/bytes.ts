export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || Number.isNaN(bytes)) return "—";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** exponent;
  const formatted =
    exponent === 0
      ? value.toFixed(0)
      : value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2);
  return `${formatted} ${units[exponent]}`;
}
