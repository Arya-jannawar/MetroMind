/**
 * Team UrbanSync's mark: a metro network as one connected organism.
 * Edges draw themselves in once, nodes pop in sequence, and the hub keeps
 * breathing (pulse waves + signal flow on the spokes). Pure CSS animation —
 * no JS, no hydration cost, honours prefers-reduced-motion globally.
 */

const SAT: Array<[number, number]> = [
  [120, 42], // N
  [175.2, 64.8], // NE
  [198, 120], // E
  [175.2, 175.2], // SE
  [120, 198], // S
  [64.8, 175.2], // SW
  [42, 120], // W
  [64.8, 64.8], // NW
];

const HUB: [number, number] = [120, 120];

// index 8 = hub
const SPOKES: Array<[number, number]> = [
  [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 6], [8, 7],
];
const RING: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0],
];
const DIAGONALS: Array<[number, number]> = [
  [0, 3], [0, 5], [4, 1], [4, 7],
];
const EDGES = [...SPOKES, ...RING, ...DIAGONALS];

function pt(i: number): [number, number] {
  return i === 8 ? HUB : SAT[i];
}

export default function UrbanSyncLogo({
  size = 96,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 240 240"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {/* edges: spokes first, then the ring, then the long diagonals */}
      <g className="usl-edge" stroke="#29c8cf" strokeWidth={2.4} strokeLinecap="round" opacity={0.72}>
        {EDGES.map(([a, b], i) => {
          const [x1, y1] = pt(a);
          const [x2, y2] = pt(b);
          return (
            <line
              key={`${a}-${b}`}
              x1={x1} y1={y1} x2={x2} y2={y2}
              pathLength={1}
              style={{ animationDelay: `${i * 65}ms` }}
            />
          );
        })}
      </g>

      {/* signal flow riding the spokes, fades in once the network exists */}
      <g
        className="usl-flow"
        stroke="#8ce8ec"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeDasharray="0.045 0.205"
      >
        {SPOKES.map(([, s], i) => {
          const [x2, y2] = pt(s);
          return <line key={i} x1={120} y1={120} x2={x2} y2={y2} pathLength={1} />;
        })}
      </g>

      {/* breathing waves from the hub */}
      <circle
        className="usl-wave" cx={120} cy={120} r={26}
        fill="none" stroke="#29c8cf" strokeWidth={1.5}
        style={{ opacity: 0, animationDelay: "1.4s" }}
      />
      <circle
        className="usl-wave" cx={120} cy={120} r={26}
        fill="none" stroke="#29c8cf" strokeWidth={1.5}
        style={{ opacity: 0, animationDelay: "3s" }}
      />

      {/* satellite stations */}
      {SAT.map(([x, y], i) => (
        <g key={i} className="usl-node" style={{ animationDelay: `${0.72 + i * 0.06}s` }}>
          <circle cx={x} cy={y} r={8.5} fill="#0a0d11" stroke="#29c8cf" strokeWidth={2.6} />
          <circle cx={x} cy={y} r={3} fill="#8ce8ec" />
        </g>
      ))}

      {/* the interchange hub */}
      <circle
        className="usl-hub-ring"
        cx={120} cy={120} r={21}
        fill="#0a0d11" stroke="#e9edf2" strokeWidth={3.2}
        pathLength={1}
      />
      <g className="usl-node" style={{ animationDelay: "0.95s" }}>
        <circle cx={120} cy={120} r={13} fill="none" stroke="#29c8cf" strokeWidth={2.4} />
        <circle
          cx={120} cy={120} r={6} fill="#eafffb"
          style={{ filter: "drop-shadow(0 0 7px rgba(41, 200, 207, 0.9))" }}
        />
      </g>
    </svg>
  );
}
