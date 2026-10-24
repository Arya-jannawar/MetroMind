"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
        <AlertTriangle size={22} />
      </span>
      <h1 className="text-xl font-semibold text-ink">Something derailed</h1>
      <p className="text-sm leading-relaxed text-muted">
        A module failed to render. Your saved reports and trips are safe in this browser — reload
        and continue.
      </p>
      <div className="flex gap-2">
        <button onClick={reset} className="btn-primary">
          try again
        </button>
        <Link href="/" className="btn-ghost">
          back to home
        </Link>
      </div>
    </div>
  );
}
