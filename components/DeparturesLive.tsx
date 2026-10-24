"use client";

import Departures from "./Departures";
import { useLiveStore, nowMinOf } from "@/store/live";

/** Client wrapper so station pages stay server-rendered while the board ticks. */
export default function DeparturesLive({ stationId }: { stationId: string }) {
  const simNow = useLiveStore((s) => s.simNow);
  return <Departures stationId={stationId} nowMin={nowMinOf(simNow)} />;
}
