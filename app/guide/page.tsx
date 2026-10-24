"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { DemoNote, PageHeader } from "@/components/ui";
import { PARAMS, INTERCHANGE_IDS, stationName } from "@/lib/data";
import { dict, LANG_LABEL, type Lang } from "@/lib/i18n";
import { inr } from "@/lib/fare";
import { minToHHMM } from "@/lib/time";
import { usePrefsStore } from "@/store/prefs";

const STEP_ICONS = ["🎫", "🛡️", "🚉", "🚪", "🧭"];

export default function GuidePage() {
  const lang = usePrefsStore((s) => s.lang);
  const setLang = usePrefsStore((s) => s.setLang);
  const accessibleOnly = usePrefsStore((s) => s.accessibleOnly);
  const setAccessibleOnly = usePrefsStore((s) => s.setAccessibleOnly);
  const d = dict(lang);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        kicker="M4 · Station guide / AccessWay"
        title="First time on the metro? Five steps."
        lede="Written for a first ride — ticket to exit — with key phrases in English, Hindi and Marathi, and step-free guidance throughout."
        aside={
          <div role="group" aria-label="Language" className="inline-flex rounded-lg border border-line bg-surface p-1">
            {(Object.keys(LANG_LABEL) as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                aria-pressed={lang === l}
                className={`rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                  lang === l ? "bg-surface2 text-ink" : "text-muted hover:text-dim"
                }`}
              >
                {LANG_LABEL[l]}
              </button>
            ))}
          </div>
        }
      />

      <ol className="mb-8 space-y-3">
        {d.steps.map((s, i) => (
          <li key={i} className="card anim-rise flex gap-4 p-4" style={{ animationDelay: `${i * 40}ms` }}>
            <div className="flex flex-col items-center">
              <span className="num flex h-8 w-8 items-center justify-center rounded-full border border-aqua/40 bg-aqua/10 text-[13px] text-aqua">
                {i + 1}
              </span>
              {i < d.steps.length - 1 && <span className="mt-1 w-px flex-1 bg-line" />}
            </div>
            <div className="pb-1">
              <h2 className="text-[15px] font-semibold text-ink">
                <span aria-hidden className="mr-2">{STEP_ICONS[i]}</span>
                {s.title}
              </h2>
              <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-dim">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="card p-4">
          <p className="kicker mb-3">Phrases that get you through</p>
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="kicker border-b border-line-soft pb-1 text-left font-normal">
                <th className="pb-1.5">English</th>
                <th className="pb-1.5">हिंदी</th>
                <th className="pb-1.5">मराठी</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {d.phrases.map((p) => (
                <tr key={p.en}>
                  <td className="py-2 pr-2 text-dim">{p.en}</td>
                  <td className="py-2 pr-2 text-dim">{p.hi}</td>
                  <td className="py-2 text-dim">{p.mr}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 font-mono text-[10px] leading-relaxed text-muted">
            Standard transit phrases only — reviewed wording, not machine-guessed.
          </p>
        </div>

        <div className="space-y-6">
          <div className="card p-4">
            <p className="kicker mb-2">{d.accessibility}</p>
            <p className="text-[13.5px] leading-relaxed text-dim">{d.accessibilityBody}</p>
            <button
              onClick={() => setAccessibleOnly(!accessibleOnly)}
              aria-pressed={accessibleOnly}
              className={accessibleOnly ? "chip-on mt-3" : "chip mt-3"}
            >
              {accessibleOnly ? <Check size={11} /> : null}
              prefer step-free routing in Copilot
            </button>
            <p className="num mt-2 text-[10.5px] text-muted">
              interchanges: {INTERCHANGE_IDS.map((id) => stationName(id)).join(", ")} · allow ~4 min
            </p>
          </div>

          <div className="card p-4">
            <p className="kicker mb-2">Fare &amp; timing quick facts</p>
            <dl className="space-y-1.5 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-muted">Fare model (ESTIMATE)</dt>
                <dd className="num text-dim">
                  {inr(PARAMS.baseFare)} + {inr(PARAMS.perStationFare)}/stop · cap {inr(PARAMS.fareCap)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">First train (assumed)</dt>
                <dd className="num text-dim">{minToHHMM(PARAMS.firstTrainMin)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Last train (assumed)</dt>
                <dd className="num text-dim">{minToHHMM(PARAMS.lastTrainMin)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Frequency (DEMO ASSUMPTION)</dt>
                <dd className="num text-dim">every {PARAMS.headwayMin} min</dd>
              </div>
            </dl>
            <Link href="/copilot" className="btn-ghost mt-3 w-full text-[12.5px]">
              try it in the copilot <ArrowRight size={13} />
            </Link>
          </div>

          <DemoNote>
            EN/हिं/मर toggle covers the guide and key phrases. Full app-wide translation is on the
            roadmap — we ship verified phrases only, never machine-guessed ones presented as final.
          </DemoNote>
        </div>
      </div>
    </div>
  );
}
