import { Section } from "@/components/ui";

const MEMBERS = ["Arya Jannawar", "Siddhant Pardeshi", "Avani Jannawar"];

/** Who built this — with the stage photo from presentation day. */
export default function TeamCard() {
  return (
    <Section kicker="Built by" title="Team UrbanSync">
      <div className="card flex overflow-hidden">
        <div className="min-w-0 flex-1 p-4">
          <p className="text-[13px] leading-relaxed text-dim">
            Three commuters who spent Codex Dayline riding the Aqua Line with laptops open —
            planning between stations, testing on the platform, demoing before sunset.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {MEMBERS.map((m) => (
              <span key={m} className="chip">
                <span className="dot bg-aqua" />
                {m}
              </span>
            ))}
          </div>
          <p className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
            OpenAI DevDay Exchange · Metro Hackathon Pune
          </p>
        </div>
        <div className="relative hidden w-44 shrink-0 sm:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/team-stage.jpg"
            alt="Team UrbanSync on stage at the DevDay Exchange community event"
            className="h-full w-full object-cover object-[center_30%]"
            loading="lazy"
          />
        </div>
      </div>
    </Section>
  );
}
