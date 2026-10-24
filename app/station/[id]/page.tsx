import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import MetroMap from "@/components/MetroMap";
import DeparturesLive from "@/components/DeparturesLive";
import CrowNow from "@/components/CrowNow";
import { DemoNote } from "@/components/ui";
import { INTERCHANGE_IDS, LINES, PARAMS, SORTED_STATIONS, station, stationName } from "@/lib/data";
import { inr } from "@/lib/fare";
import { minToHHMM } from "@/lib/time";

export function generateStaticParams() {
  return SORTED_STATIONS.map((s) => ({ id: s.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const s = station(id);
    return { title: `${s.name} station` };
  } catch {
    return { title: "Station" };
  }
}

const AMENITY_LABEL: Record<string, string> = {
  atm: "ATM",
  cafe: "Café",
  cafes: "Cafés",
  pharmacy: "Pharmacy",
  parking: "Parking",
  restrooms: "Restrooms",
  wifi: "Wi-Fi",
  shops: "Shops",
  "baby-care": "Baby care",
  "waiting-hall": "Waiting hall",
};

export default async function StationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let st;
  try {
    st = station(id);
  } catch {
    notFound();
  }
  const s = st!;
  const lines = LINES.filter((l) => l.stationIds.includes(s.id));
  const neighbours = lines.map((l) => {
    const idx = l.stationIds.indexOf(s.id);
    return {
      line: l,
      prev: idx > 0 ? l.stationIds[idx - 1] : null,
      next: idx < l.stationIds.length - 1 ? l.stationIds[idx + 1] : null,
    };
  });

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <p className="kicker mb-1.5">
          {s.elevation} station · {s.exits} exits · {s.parking} parking
        </p>
        <h1 className="flex flex-wrap items-center gap-3 text-2xl font-semibold tracking-tight text-ink lg:text-[30px]">
          {s.name}
          <span className="flex gap-1.5">
            {lines.map((l) => (
              <span key={l.id} title={l.name} className="inline-block h-3.5 w-9 rounded-sm" style={{ background: l.color }} />
            ))}
          </span>
          {s.interchange && <span className="chip chip-on !py-0.5">interchange</span>}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-dim">
          {s.note ?? `${lines.map((l) => `${l.name} (${l.corridor})`).join(" and ")}.`}
        </p>
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-6">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {[
              { k: "Fare from here", v: `${inr(PARAMS.baseFare)}–${inr(PARAMS.fareCap)}`, note: "ESTIMATE" },
              { k: "Service window", v: `${minToHHMM(PARAMS.firstTrainMin)}–${minToHHMM(PARAMS.lastTrainMin)}`, note: "DEMO" },
              { k: "Headway", v: `${PARAMS.headwayMin} min`, note: "DEMO ASSUMPTION" },
              { k: "Elevation", v: s.elevation, note: "" },
            ].map((f) => (
              <div key={f.k} className="card p-3">
                <p className="kicker mb-1">{f.k}</p>
                <p className="num text-[14px] font-medium capitalize text-ink">{f.v}</p>
                {f.note && <p className="num mt-0.5 text-[9.5px] text-muted">{f.note}</p>}
              </div>
            ))}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="card p-4">
              <p className="kicker mb-2">Next departures</p>
              <DeparturesLive stationId={s.id} />
            </div>
            <CrowNow stationId={s.id} />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="card p-4">
              <p className="kicker mb-2.5">Amenities</p>
              <div className="flex flex-wrap gap-1.5">
                {s.amenities.map((a) => (
                  <span key={a} className="chip">
                    {AMENITY_LABEL[a] ?? a}
                  </span>
                ))}
              </div>
              <p className="kicker mb-2.5 mt-4">First / last mile</p>
              <ul className="space-y-1 text-[12.5px] text-dim">
                {s.firstMile.map((m) => (
                  <li key={m}>→ {m}</li>
                ))}
                {s.lastMile.map((m) => (
                  <li key={m}>← {m}</li>
                ))}
              </ul>
            </div>
            <div className="card p-4">
              <p className="kicker mb-2.5">Accessibility</p>
              <ul className="space-y-1.5 text-[13px]">
                {(
                  [
                    ["Lift street → platform", s.accessibility.lift],
                    ["Ramp at entrances", s.accessibility.ramp],
                    ["Tactile paving", s.accessibility.tactile],
                    ["Step-free gates", s.accessibility.stepFree],
                  ] as const
                ).map(([label, ok]) => (
                  <li key={label} className="flex items-center justify-between">
                    <span className="text-dim">{label}</span>
                    <span className="num text-[11px]" style={{ color: ok ? "var(--ok)" : "var(--warn)" }}>
                      {ok ? "YES" : "CHECK ON SITE"}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[12px] leading-relaxed text-muted">
                Prefer step-free routing? Toggle “prefer step-free” in the{" "}
                <Link href="/copilot" className="link">
                  copilot
                </Link>{" "}
                and it will favour lift-equipped interchanges.
              </p>
            </div>
          </div>

          <div className="card p-4">
            <p className="kicker mb-2.5">On the line</p>
            <div className="space-y-2.5">
              {neighbours.map(({ line: l, prev, next }) => (
                <div key={l.id} className="flex flex-wrap items-center gap-2 text-[13px]">
                  <span className="dot" style={{ background: l.color }} />
                  {prev && (
                    <Link href={`/station/${prev}`} className="link">
                      ← {stationName(prev)}
                    </Link>
                  )}
                  {prev && next && <span className="text-muted">·</span>}
                  {next && (
                    <Link href={`/station/${next}`} className="link">
                      {stationName(next)} →
                    </Link>
                  )}
                  <span className="num ml-auto text-[10.5px] text-muted">{l.corridor}</span>
                </div>
              ))}
            </div>
            <Link href={`/copilot?from=${s.id}`} className="btn-primary mt-4">
              plan a trip from {s.name} <ArrowRight size={14} />
            </Link>
          </div>

          <DemoNote>
            {`DEMO DATASET — amenities and timings are estimates compiled for this hackathon build (${
              INTERCHANGE_IDS.length === 1
                ? "single interchange at District Court"
                : "interchanges: " + INTERCHANGE_IDS.map((i) => stationName(i)).join(", ")
            }). Verify against the official Maha-Metro map.`}
          </DemoNote>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <p className="kicker mb-2">On the network</p>
          <MetroMap selectedId={s.id} />
        </div>
      </div>
    </div>
  );
}
