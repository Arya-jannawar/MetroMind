import Link from "next/link";
import UrbanSyncLogo from "./UrbanSyncLogo";

export default function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group inline-flex items-center gap-2.5" aria-label="MetroMind home">
      <UrbanSyncLogo size={compact ? 28 : 38} />
      <span className="inline-flex flex-col">
        <span
          className={`font-semibold leading-none tracking-[0.08em] text-ink ${
            compact ? "text-[15px]" : "text-[19px]"
          }`}
        >
          METRO<span className="text-aqua">MIND</span>
        </span>
        <span className="kicker mt-1.5 !text-[9px]">Pune · Urban Mobility</span>
      </span>
    </Link>
  );
}
