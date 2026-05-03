import {
  AbsoluteFill,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const GOLD = "#C9A84C";
const BG = "#0A0A0A";
const TEXT_PRIMARY = "#f4f4f5";
const TEXT_MUTED = "#a1a1aa";

// Slams in from below with spring
function SlamIn({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 12, stiffness: 200, mass: 0.6 },
  });
  const opacity = interpolate(frame - delay, [0, 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        opacity,
        transform: `translateY(${interpolate(progress, [0, 1], [80, 0])}px) scale(${interpolate(progress, [0, 1], [0.9, 1])})`,
      }}
    >
      {children}
    </div>
  );
}

// Typewriter effect
function Typewriter({
  text,
  delay = 0,
  speed = 3,
}: {
  text: string;
  delay?: number;
  speed?: number;
}) {
  const frame = useCurrentFrame();
  const charsVisible = Math.max(0, Math.floor((frame - delay) / speed));
  return <span>{text.slice(0, charsVisible)}</span>;
}

// ─── Scene 1: Hook (0–60) ─────────────────────────────────────────────────────
function SceneHook() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const povSpring = spring({ frame, fps, config: { damping: 20, stiffness: 120 } });
  const bigSpring = spring({ frame: frame - 18, fps, config: { damping: 14, stiffness: 160, mass: 0.8 } });

  return (
    <AbsoluteFill
      style={{
        background: BG,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: "0 64px",
        textAlign: "center",
        gap: 28,
      }}
    >
      <div
        style={{
          opacity: interpolate(frame, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          transform: `translateY(${interpolate(povSpring, [0, 1], [30, 0])}px)`,
          fontSize: 28,
          color: TEXT_MUTED,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        POV: it's week 3 of recruitment
      </div>
      <div
        style={{
          opacity: interpolate(frame - 18, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          transform: `translateY(${interpolate(bigSpring, [0, 1], [50, 0])}px) scale(${interpolate(bigSpring, [0, 1], [0.85, 1])})`,
          fontSize: 72,
          fontWeight: 900,
          color: TEXT_PRIMARY,
          lineHeight: 1.1,
          letterSpacing: "-2px",
        }}
      >
        You have{" "}
        <span style={{ color: GOLD }}>200 applicants.</span>
        <br />
        In a{" "}
        <span
          style={{
            textDecoration: "line-through",
            color: "#ef4444",
          }}
        >
          Google Sheet.
        </span>
      </div>
    </AbsoluteFill>
  );
}

// ─── Scene 2: Pain points rapid fire (60–210) ─────────────────────────────────
const PAIN_POINTS = [
  { icon: "❌", text: "Scoring rubrics in 4 different Notion docs" },
  { icon: "❌", text: "Officers texting rankings at midnight" },
  { icon: "❌", text: "Manually emailing every rejected applicant" },
  { icon: "❌", text: "No idea who's actually qualified" },
  { icon: "❌", text: "Someone dropped the spreadsheet. Again." },
];

function PainCard({ icon, text, delay }: { icon: string; text: string; delay: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 11, stiffness: 220, mass: 0.5 },
  });
  const opacity = interpolate(frame - delay, [0, 5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        opacity,
        transform: `translateX(${interpolate(progress, [0, 1], [-60, 0])}px)`,
        display: "flex",
        alignItems: "center",
        gap: 20,
        background: "rgba(239,68,68,0.08)",
        border: "1px solid rgba(239,68,68,0.2)",
        borderRadius: 16,
        padding: "22px 28px",
        width: "100%",
      }}
    >
      <span style={{ fontSize: 34 }}>{icon}</span>
      <span style={{ fontSize: 26, fontWeight: 600, color: TEXT_PRIMARY, lineHeight: 1.3 }}>{text}</span>
    </div>
  );
}

function ScenePain() {
  return (
    <AbsoluteFill
      style={{
        background: BG,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: "60px 56px",
        gap: 20,
      }}
    >
      {PAIN_POINTS.map((p, i) => (
        <PainCard key={p.text} icon={p.icon} text={p.text} delay={i * 28} />
      ))}
    </AbsoluteFill>
  );
}

// ─── Scene 3: Flip / reveal (210–330) ─────────────────────────────────────────
function SceneFlip() {
  const frame = useCurrentFrame();

  // White flash on entry
  const flashOpacity = interpolate(frame, [0, 8, 20], [1, 0.6, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const { fps } = useVideoConfig();
  const wordmarkSpring = spring({
    frame: frame - 25,
    fps,
    config: { damping: 18, stiffness: 100, mass: 1 },
  });

  const glowOpacity = interpolate(frame - 25, [0, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: BG,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
        textAlign: "center",
        gap: 32,
      }}
    >
      {/* White flash overlay */}
      <AbsoluteFill
        style={{
          background: "white",
          opacity: flashOpacity,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          opacity: interpolate(frame - 10, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          fontSize: 36,
          color: TEXT_MUTED,
          letterSpacing: "0.05em",
        }}
      >
        There's a better way.
      </div>

      <div
        style={{
          opacity: glowOpacity,
          transform: `scale(${interpolate(wordmarkSpring, [0, 1], [0.7, 1])})`,
          fontSize: 96,
          fontWeight: 900,
          letterSpacing: "-3px",
          color: TEXT_PRIMARY,
          textShadow: `0 0 ${interpolate(glowOpacity, [0, 1], [0, 40])}px ${GOLD}`,
        }}
      >
        Uni<span style={{ color: GOLD }}>Circle</span>
      </div>
    </AbsoluteFill>
  );
}

// ─── Scene 4: Solution typewriter (330–420) ────────────────────────────────────
const SOLUTION_LINES = [
  "Kanban pipeline.",
  "Rubric scoring.",
  "Automated emails.",
  "One dashboard.",
];

function SceneSolution() {
  return (
    <AbsoluteFill
      style={{
        background: BG,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: "0 64px",
        textAlign: "center",
        gap: 24,
      }}
    >
      {SOLUTION_LINES.map((line, i) => (
        <div
          key={line}
          style={{
            fontSize: 58,
            fontWeight: 800,
            letterSpacing: "-1.5px",
            color: i === SOLUTION_LINES.length - 1 ? GOLD : TEXT_PRIMARY,
            lineHeight: 1.15,
          }}
        >
          <Typewriter text={line} delay={i * 18} speed={2} />
        </div>
      ))}
    </AbsoluteFill>
  );
}

// ─── Scene 5: CTA (420–450) ──────────────────────────────────────────────────
function SceneCTA() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pulse = Math.sin((frame / fps) * Math.PI * 2.5) * 0.05 + 1;

  const btnSpring = spring({ frame: frame - 20, fps, config: { damping: 16, stiffness: 130 } });
  const opacity = interpolate(frame, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: BG,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
        textAlign: "center",
        padding: "0 64px",
        gap: 32,
      }}
    >
      <div
        style={{
          opacity,
          fontSize: 60,
          fontWeight: 900,
          letterSpacing: "-1.5px",
          color: TEXT_PRIMARY,
          lineHeight: 1.15,
        }}
      >
        Get your club on{" "}
        <span style={{ color: GOLD }}>UniCircle.</span>
      </div>

      <div
        style={{
          opacity,
          transform: `scale(${interpolate(btnSpring, [0, 1], [0.8, 1]) * pulse})`,
          background: GOLD,
          color: BG,
          fontWeight: 800,
          fontSize: 30,
          borderRadius: 18,
          padding: "24px 56px",
          letterSpacing: "-0.5px",
        }}
      >
        unicircle.app
      </div>

      <div
        style={{
          opacity: interpolate(frame - 30, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          fontSize: 22,
          color: TEXT_MUTED,
        }}
      >
        Free. Takes 5 minutes. ✓
      </div>
    </AbsoluteFill>
  );
}

// ─── Main composition ─────────────────────────────────────────────────────────
export const ClubLeaderHook: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Sequence from={0} durationInFrames={60}>
        <SceneHook />
      </Sequence>
      <Sequence from={60} durationInFrames={150}>
        <ScenePain />
      </Sequence>
      <Sequence from={210} durationInFrames={120}>
        <SceneFlip />
      </Sequence>
      <Sequence from={330} durationInFrames={90}>
        <SceneSolution />
      </Sequence>
      <Sequence from={420} durationInFrames={30}>
        <SceneCTA />
      </Sequence>
    </AbsoluteFill>
  );
};
