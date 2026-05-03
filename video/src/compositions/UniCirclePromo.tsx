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

// Reusable fade+slide-up entrance
function FadeUp({
  children,
  delay = 0,
  duration = 20,
}: {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 18, stiffness: 120, mass: 0.8 },
  });
  const opacity = interpolate(frame - delay, [0, duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        opacity,
        transform: `translateY(${interpolate(progress, [0, 1], [40, 0])}px)`,
      }}
    >
      {children}
    </div>
  );
}

// Gold horizontal rule that expands from center
function GoldRule({ delay = 0 }: { delay?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({
    frame: frame - delay,
    fps,
    config: { damping: 20, stiffness: 100 },
  });
  return (
    <div
      style={{
        height: 2,
        background: GOLD,
        width: `${interpolate(scale, [0, 1], [0, 120])}px`,
        margin: "20px auto",
        borderRadius: 1,
      }}
    />
  );
}

// Individual feature card
function FeatureCard({
  icon,
  title,
  body,
  delay,
}: {
  icon: string;
  title: string;
  body: string;
  delay: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 18, stiffness: 100, mass: 1 },
  });
  const opacity = interpolate(frame - delay, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        opacity,
        transform: `translateY(${interpolate(progress, [0, 1], [60, 0])}px)`,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: "36px 40px",
        flex: 1,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: TEXT_PRIMARY,
          marginBottom: 10,
          letterSpacing: "-0.3px",
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 16, color: TEXT_MUTED, lineHeight: 1.6 }}>
        {body}
      </div>
    </div>
  );
}

// ─── Scene 1: Logo intro (frames 0–150) ───────────────────────────────────────
function SceneLogo() {
  return (
    <AbsoluteFill
      style={{
        background: BG,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <FadeUp delay={10}>
        <div
          style={{
            fontSize: 80,
            fontWeight: 800,
            letterSpacing: "-2px",
            color: TEXT_PRIMARY,
          }}
        >
          Uni<span style={{ color: GOLD }}>Circle</span>
        </div>
      </FadeUp>
      <GoldRule delay={30} />
      <FadeUp delay={50}>
        <div
          style={{
            fontSize: 24,
            color: TEXT_MUTED,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          Connect with your campus
        </div>
      </FadeUp>
    </AbsoluteFill>
  );
}

// ─── Scene 2: Tagline (frames 150–360) ───────────────────────────────────────
function SceneTagline() {
  return (
    <AbsoluteFill
      style={{
        background: BG,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: "0 160px",
        textAlign: "center",
      }}
    >
      <FadeUp delay={10}>
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            letterSpacing: "-1.5px",
            color: TEXT_PRIMARY,
            lineHeight: 1.15,
          }}
        >
          Find your people at{" "}
          <span style={{ color: GOLD }}>UCSD</span>
        </div>
      </FadeUp>
      <FadeUp delay={40}>
        <div
          style={{
            fontSize: 22,
            color: TEXT_MUTED,
            marginTop: 24,
            lineHeight: 1.7,
            maxWidth: 800,
          }}
        >
          Browse hundreds of clubs, apply in minutes, and track every step of
          your recruitment journey — all in one place.
        </div>
      </FadeUp>
    </AbsoluteFill>
  );
}

// ─── Scene 3: Feature callouts (frames 360–660) ──────────────────────────────
function SceneFeatures() {
  return (
    <AbsoluteFill
      style={{
        background: BG,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: "0 100px",
      }}
    >
      <FadeUp delay={5}>
        <div
          style={{
            fontSize: 36,
            fontWeight: 700,
            color: TEXT_PRIMARY,
            textAlign: "center",
            marginBottom: 48,
            letterSpacing: "-0.5px",
          }}
        >
          Everything you need to{" "}
          <span style={{ color: GOLD }}>get involved</span>
        </div>
      </FadeUp>
      <div style={{ display: "flex", gap: 28, width: "100%" }}>
        <FeatureCard
          delay={20}
          icon="🔍"
          title="Discover 200+ Clubs"
          body="Filter by interest, size, or recruiting status. Find clubs that actually match you."
        />
        <FeatureCard
          delay={45}
          icon="⚡"
          title="Apply in Minutes"
          body="Custom application forms, resume upload, and instant confirmation — no email chains."
        />
        <FeatureCard
          delay={70}
          icon="📊"
          title="Track Your Pipeline"
          body="See exactly where you stand at every stage. No more waiting in the dark."
        />
      </div>
    </AbsoluteFill>
  );
}

// ─── Scene 4: CTA (frames 660–900) ───────────────────────────────────────────
function SceneCTA() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pulse = Math.sin((frame / fps) * Math.PI * 2) * 0.08 + 1;

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
      }}
    >
      <FadeUp delay={10}>
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            letterSpacing: "-2px",
            color: TEXT_PRIMARY,
          }}
        >
          Ready to{" "}
          <span style={{ color: GOLD }}>join?</span>
        </div>
      </FadeUp>
      <FadeUp delay={35}>
        <div
          style={{
            marginTop: 40,
            display: "inline-block",
            background: GOLD,
            color: BG,
            fontWeight: 700,
            fontSize: 28,
            borderRadius: 14,
            padding: "20px 56px",
            letterSpacing: "-0.3px",
            transform: `scale(${pulse})`,
          }}
        >
          unicircle.app
        </div>
      </FadeUp>
      <FadeUp delay={60}>
        <div style={{ color: TEXT_MUTED, fontSize: 18, marginTop: 28 }}>
          Free for all UCSD students
        </div>
      </FadeUp>
    </AbsoluteFill>
  );
}

// ─── Main composition ─────────────────────────────────────────────────────────
export const UniCirclePromo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: BG }}>
      {/* Scene 1: Logo — 0 to 150 */}
      <Sequence from={0} durationInFrames={150}>
        <SceneLogo />
      </Sequence>

      {/* Scene 2: Tagline — 150 to 360 */}
      <Sequence from={150} durationInFrames={210}>
        <SceneTagline />
      </Sequence>

      {/* Scene 3: Features — 360 to 660 */}
      <Sequence from={360} durationInFrames={300}>
        <SceneFeatures />
      </Sequence>

      {/* Scene 4: CTA — 660 to 900 */}
      <Sequence from={660} durationInFrames={240}>
        <SceneCTA />
      </Sequence>
    </AbsoluteFill>
  );
};
