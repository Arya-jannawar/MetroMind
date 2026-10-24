import Link from "next/link";

export default function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group inline-flex flex-col" aria-label="MetroMind home">
      <span
        className={`font-semibold leading-none tracking-[0.08em] text-ink ${
          compact ? "text-[15px]" : "text-[19px]"
        }`}
      >
        METRO<span className="text-aqua">MIND</span>
      </span>
      <span className="kicker mt-1.5 !text-[9px]">Pune · Urban Mobility</span>
    </Link>
  );
}
