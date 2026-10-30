// Base-path helper for assets referenced outside Next's Link/Image pipeline.
// NEXT_PUBLIC_BASE_PATH is inlined at build time: undefined in server/dev
// mode, "/MetroMind" in the GitHub Pages export — where root-absolute URLs
// like "/team-stage.jpg" would otherwise 404.
export function withBase(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  if (!base || !path.startsWith("/")) return path;
  return `${base}${path}`;
}
