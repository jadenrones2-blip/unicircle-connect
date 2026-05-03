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

function FadeUp({
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
    config: { damping: 18, stiffness: 120, mass: 0.8 },
  });
  const opacity = interpolate(frame - delay, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        opacity,
        transform: `translateY(${interpolate(progress, [0, 1], [50, 0])}px)`,
      }}
    >
      {children}
    </div>
  );
}

// ─── Scene 1: Hook (frames 0–90) ─────────────────────────────────────────────
function SceneHook() {
  return (
    <AbsoluteFill
      style={{
        background: BG,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: "0 80px",
        textAlign: "center",
      }}
    >
      <FadeUp delay={5}>
        <div style={{ fontSize: 32, marginBottom: 24 }}>🎓</div>
      </FadeUp>
      <FadeUp delay={15}>
        <div
          style={{
            fontSize: 52,
            fontWeight: 800,
            letterSpacing: "-1.5px",
            color: TEXT_PRIMARY,
            lineHeight: 1.15,
          }}
        >
          Still sending cold emails to{" "}
          <span style={{ color: GOLD }}>club officers?</span>
        </div>
      </FadeUp>
    </AbsoluteFill>
  );
}

// ─── Scene 2: Solution (frames 90–270) ───────────────────────────────────────
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
        padding: "0 80px",
        textAlign: "center",
        gap: 32,
      }}
    >
      <FadeUp delay={5}>
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            letterSpacing: "-1.5px",
            color: TEXT_PRIMARY,
          }}
        >
          Uni<span style={{ color: GOLD }}>Circle</span>
        </div>
      </FadeUp>

      {[
        { icon: "🔍", text: "Browse 200+ UCSD clubs", delay: 20 },
        { icon: "⚡", text: "Apply in one place", delay: 40 },
        { icon: "📲", text: "Track your status live", delay: 60 },
      ].map(({ icon, text, delay }) => (
        <FadeUp key={text} delay={delay}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16,
              padding: "20px 32px",
              width: 560,
            }}
          >
            <span style={{ fontSize: 36 }}>{icon}</span>
            <span
              style={{
                fontSize: 26,
                fontWeight: 600,
                color: TEXT_PRIMARY,
              }}
            >
              {text}
            </span>
          </div>
        </FadeUp>
      ))}
    </AbsoluteFill>
  );
}

// ─── Scene 3: CTA (frames 270–450) ───────────────────────────────────────────
function SceneCTA() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pulse = Math.sin((frame / fps) * Math.PI * 2) * 0.06 + 1;

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
        gap: 36,
        padding: "0 80px",
      }}
    >
      <FadeUp delay={5}>
        <div
          style={{
            fontSize: 58,
            fontWeight: 800,
            letterSpacing: "-1.5px",
            color: TEXT_PRIMARY,
            lineHeight: 1.2,
          }}
        >
          Your next club is one tap away
        </div>
      </FadeUp>
      <FadeUp delay={30}>
        <div
          style={{
            background: GOLD,
            color: BG,
            fontWeight: 700,
            fontSize: 32,
            borderRadius: 16,
            padding: "24px 64px",
            transform: `scale(${pulse})`,
          }}
        >
          unicircle.app
        </div>
      </FadeUp>
      <FadeUp delay={55}>
        <div style={{ color: TEXT_MUTED, fontSize: 20 }}>
          Free for all UCSD students ✓
        </div>
      </FadeUp>
    </AbsoluteFill>
  );
}

// ─── Main short composition ───────────────────────────────────────────────────
export const UniCircleShort: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Sequence from={0} durationInFrames={90}>
        <SceneHook />
      </Sequence>
      <Sequence from={90} durationInFrames={180}>
        <SceneSolution />
      </Sequence>
      <Sequence from={270} durationInFrames={180}>
        <SceneCTA />
      </Sequence>
    </AbsoluteFill>
  );
};
