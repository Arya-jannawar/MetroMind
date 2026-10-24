import UrbanSyncLogo from "./UrbanSyncLogo";

/** Slim branded banner at the top of Mission Control. */
export default function TeamRibbon() {
  return (
    <section
      className="card team-ribbon relative mb-6 flex items-center gap-3.5 overflow-hidden px-4 py-3"
      aria-label="Built by Team UrbanSync"
    >
      <div className="shrink-0">
        <UrbanSyncLogo size={46} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="kicker mb-1 !text-[9px]">
          Team UrbanSync · DevDay Exchange — Metro Hackathon Pune
        </p>
        <p className="truncate text-[13px] text-dim">
          Arya Jannawar · Siddhant Pardeshi · Avani Jannawar
        </p>
      </div>
      <span className="chip chip-on hidden md:inline-flex">
        <span className="dot animate-pulse-soft bg-ok" />
        built in one day
      </span>
    </section>
  );
}
