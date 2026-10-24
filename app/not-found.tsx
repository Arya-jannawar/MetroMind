import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 text-center">
      <p className="num text-[64px] font-semibold text-line">404</p>
      <h1 className="text-xl font-semibold text-ink">This platform doesn&apos;t exist</h1>
      <p className="text-sm leading-relaxed text-muted">
        No station or page with that id. Head back to mission control and try the map.
      </p>
      <Link href="/" className="btn-primary">
        back to home
      </Link>
    </div>
  );
}
