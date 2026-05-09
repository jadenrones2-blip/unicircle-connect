import {
  AbsoluteFill,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const GOLD = "#C9A84C";
const GOLD_LIGHT = "#E8C97A";
const BG = "#0A0A0A";
const BG2 = "#111111";
const TEXT = "#f4f4f5";
const MUTED = "#71717a";
const GREEN = "#4ade80";
const RED = "#f87171";

// ── Shared primitives ─────────────────────────────────────────────────────────

function FadeUp({
  children,
  delay = 0,
  duration = 18,
  distance = 36,
}: {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  distance?: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame: frame - delay, fps, config: { damping: 20, stiffness: 120, mass: 0.7 } });
  const opacity = interpolate(frame - delay, [0, duration], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ opacity, transform: `translateY(${interpolate(progress, [0, 1], [distance, 0])}px)` }}>
      {children}
    </div>
  );
}

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame - delay, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <div style={{ opacity }}>{children}</div>;
}

function GoldLine({ delay = 0, width = 60 }: { delay?: number; width?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 22, stiffness: 100 } });
  return (
    <div style={{
      height: 2, background: GOLD, borderRadius: 2, margin: "20px 0",
      width: interpolate(s, [0, 1], [0, width]),
    }} />
  );
}

function Label({ text, color = GOLD }: { text: string; color?: string }) {
  return (
    <div style={{
      fontSize: 14, fontWeight: 700, letterSpacing: "0.14em",
      textTransform: "uppercase", color, marginBottom: 16,
    }}>{text}</div>
  );
}

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 20, padding: "28px 32px", ...style,
    }}>
      {children}
    </div>
  );
}

const BASE: React.CSSProperties = {
  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  background: BG,
  color: TEXT,
};

// ── Scene 1: Hook (0–90f) ─────────────────────────────────────────────────────
function SceneHook() {
  const frame = useCurrentFrame();
  const shake = frame > 40 && frame < 70
    ? Math.sin(frame * 1.8) * interpolate(frame, [40, 70], [4, 0], { extrapolateRight: "clamp" })
    : 0;

  return (
    <AbsoluteFill style={{ ...BASE, alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 160px" }}>
      <FadeUp delay={5}>
        <div style={{ fontSize: 22, color: MUTED, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 24 }}>
          Right now, at UCSD
        </div>
      </FadeUp>
      <FadeUp delay={18}>
        <div style={{
          fontSize: 72, fontWeight: 900, letterSpacing: "-2px", lineHeight: 1.1,
          transform: `translateX(${shake}px)`,
        }}>
          Clubs run recruitment<br />on <span style={{ color: RED }}>spreadsheets.</span>
        </div>
      </FadeUp>
      <FadeUp delay={50}>
        <div style={{ fontSize: 22, color: MUTED, marginTop: 28 }}>
          500+ student orgs. Millions of hours wasted every year.
        </div>
      </FadeUp>
    </AbsoluteFill>
  );
}

// ── Scene 2: Problem (90–270f) ────────────────────────────────────────────────
function SceneProblem() {
  const frame = useCurrentFrame();
  const items = [
    { icon: "📱", text: "Applications in Google Forms, decisions in iMessage", delay: 0 },
    { icon: "🤷", text: "Applicants ghost for weeks with zero update", delay: 20 },
    { icon: "📅", text: "Interview scheduling = 30 DMs on Instagram", delay: 40 },
    { icon: "💸", text: "Best candidates drop off. Bad experience kills reputation.", delay: 60 },
  ];
  return (
    <AbsoluteFill style={{ ...BASE, justifyContent: "center", padding: "0 140px" }}>
      <FadeUp delay={0}>
        <Label text="The Problem" />
        <div style={{ fontSize: 56, fontWeight: 900, letterSpacing: "-1.5px", lineHeight: 1.1, marginBottom: 16 }}>
          Officers are<br /><span style={{ color: RED }}>everywhere</span> at once.
        </div>
        <GoldLine delay={15} width={56} />
      </FadeUp>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 8 }}>
        {items.map((item, i) => (
          <FadeUp key={i} delay={item.delay + 20}>
            <Card style={{ display: "flex", alignItems: "center", gap: 20, padding: "20px 28px" }}>
              <div style={{ fontSize: 32, flexShrink: 0 }}>{item.icon}</div>
              <div style={{ fontSize: 18, color: MUTED, lineHeight: 1.5 }}>{item.text}</div>
            </Card>
          </FadeUp>
        ))}
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 3: Solution / Logo (270–420f) ───────────────────────────────────────
function SceneSolution() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const glow = spring({ frame: frame - 20, fps, config: { damping: 18, stiffness: 60 } });

  return (
    <AbsoluteFill style={{ ...BASE, alignItems: "center", justifyContent: "center", textAlign: "center" }}>
      <FadeUp delay={8}>
        <Label text="Introducing" />
      </FadeUp>
      <FadeUp delay={18}>
        <div style={{
          fontSize: 96, fontWeight: 900, letterSpacing: "-3px",
          textShadow: `0 0 ${interpolate(glow, [0, 1], [0, 60])}px rgba(201,168,76,0.4)`,
        }}>
          Uni<span style={{ color: GOLD }}>Circle</span>
        </div>
      </FadeUp>
      <FadeUp delay={35}>
        <div style={{ height: 2, background: GOLD, width: interpolate(Math.min(frame - 35, 30), [0, 30], [0, 200]), borderRadius: 2, margin: "24px auto" }} />
      </FadeUp>
      <FadeUp delay={50}>
        <div style={{ fontSize: 26, color: MUTED, maxWidth: 700, lineHeight: 1.6 }}>
          The recruitment platform built for student organizations.<br />
          <span style={{ color: TEXT }}>Free for clubs. Life-changing for students.</span>
        </div>
      </FadeUp>
      <FadeUp delay={80}>
        <div style={{
          marginTop: 40, display: "inline-block",
          background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.3)",
          color: GOLD, borderRadius: 100, padding: "10px 28px", fontSize: 16, fontWeight: 700,
        }}>
          unicircle.app
        </div>
      </FadeUp>
    </AbsoluteFill>
  );
}

// ── Scene 4: Feature — Pipeline (420–630f) ────────────────────────────────────
function ScenePipeline() {
  const stages = ["Applied", "Reviewing", "Interview", "Offer"];
  const applicants = [
    { name: "Aisha K.", score: 94, stage: 2, standout: true },
    { name: "Marcus L.", score: 78, stage: 1, standout: false },
    { name: "Priya S.", score: 88, stage: 3, standout: true },
  ];

  return (
    <AbsoluteFill style={{ ...BASE, justifyContent: "center", padding: "0 140px" }}>
      <FadeUp delay={0}>
        <Label text="Feature 01 — Pipeline" />
        <div style={{ fontSize: 52, fontWeight: 900, letterSpacing: "-1.5px", lineHeight: 1.1 }}>
          Every applicant.<br /><span style={{ color: GOLD }}>One shared view.</span>
        </div>
        <GoldLine delay={15} width={56} />
      </FadeUp>

      <FadeUp delay={25}>
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          {stages.map((s, i) => (
            <div key={i} style={{
              background: i === 2 ? "rgba(201,168,76,0.15)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${i === 2 ? "rgba(201,168,76,0.4)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: 10, padding: "8px 18px",
              fontSize: 13, fontWeight: 700,
              color: i === 2 ? GOLD : MUTED,
            }}>
              {s}
            </div>
          ))}
        </div>
      </FadeUp>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {applicants.map((a, i) => (
          <FadeUp key={i} delay={35 + i * 18}>
            <Card style={{
              display: "flex", alignItems: "center", gap: 16, padding: "16px 24px",
              borderColor: a.standout ? "rgba(201,168,76,0.3)" : "rgba(255,255,255,0.06)",
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: "50%",
                background: a.standout ? GOLD : "rgba(255,255,255,0.08)",
                color: a.standout ? "#000" : TEXT,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 800, flexShrink: 0,
              }}>
                {a.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: TEXT }}>{a.name}</div>
                <div style={{ fontSize: 13, color: MUTED }}>{stages[a.stage]}</div>
              </div>
              <div style={{
                fontSize: 13, fontWeight: 800, padding: "4px 12px", borderRadius: 8,
                background: a.score >= 85 ? "rgba(74,222,128,0.12)" : "rgba(250,204,21,0.12)",
                color: a.score >= 85 ? GREEN : "#facc15",
                border: `1px solid ${a.score >= 85 ? "rgba(74,222,128,0.3)" : "rgba(250,204,21,0.3)"}`,
              }}>
                {a.score} AI
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <div style={{ fontSize: 12, color: GREEN, fontWeight: 700 }}>3✓</div>
                <div style={{ fontSize: 12, color: RED, fontWeight: 700 }}>1✗</div>
              </div>
            </Card>
          </FadeUp>
        ))}
      </div>

      <FadeUp delay={100}>
        <div style={{ marginTop: 20, fontSize: 16, color: MUTED }}>
          ✓ AI scoring &nbsp;·&nbsp; ✓ Officer votes &nbsp;·&nbsp; ✓ Bulk advance in one click
        </div>
      </FadeUp>
    </AbsoluteFill>
  );
}

// ── Scene 5: Feature — Live Tracker (630–840f) ────────────────────────────────
function SceneLiveTracker() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pulse = spring({ frame: frame - 60, fps, config: { damping: 12, stiffness: 80 } });

  const stages = ["Application Received", "Under Review", "Interview", "Final Decision"];
  const currentIdx = 2;

  return (
    <AbsoluteFill style={{ ...BASE, justifyContent: "center", padding: "0 140px" }}>
      <FadeUp delay={0}>
        <Label text="Feature 02 — Student Tracker" />
        <div style={{ fontSize: 52, fontWeight: 900, letterSpacing: "-1.5px", lineHeight: 1.1 }}>
          Students see every move.<br /><span style={{ color: GOLD }}>In real time.</span>
        </div>
        <GoldLine delay={15} width={56} />
      </FadeUp>

      <FadeUp delay={25}>
        <Card style={{ marginTop: 8, borderColor: "rgba(201,168,76,0.2)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>ACM @ UCSD</div>
              <div style={{ fontSize: 13, color: MUTED }}>Applied Apr 28 · Updated just now</div>
            </div>
            <div style={{
              background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.3)",
              color: GOLD, borderRadius: 100, padding: "4px 14px", fontSize: 12, fontWeight: 700,
            }}>In Review</div>
          </div>

          <div style={{ fontSize: 12, color: MUTED, marginBottom: 12 }}>
            Currently at: <span style={{ color: GOLD, fontWeight: 700 }}>Interview</span>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: 0 }}>
            {stages.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, minWidth: 80 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 800,
                    background: i < currentIdx ? "rgba(74,222,128,0.15)"
                      : i === currentIdx ? "rgba(201,168,76,0.2)" : "rgba(255,255,255,0.05)",
                    border: `2px solid ${i < currentIdx ? "rgba(74,222,128,0.6)"
                      : i === currentIdx ? GOLD : "rgba(255,255,255,0.1)"}`,
                    color: i < currentIdx ? GREEN : i === currentIdx ? GOLD : MUTED,
                    boxShadow: i === currentIdx
                      ? `0 0 ${interpolate(pulse, [0, 1], [0, 16])}px rgba(201,168,76,0.5)` : "none",
                  }}>
                    {i < currentIdx ? "✓" : i + 1}
                  </div>
                  <div style={{
                    fontSize: 10, textAlign: "center", lineHeight: 1.3, maxWidth: 72,
                    color: i === currentIdx ? TEXT : MUTED, fontWeight: i === currentIdx ? 600 : 400,
                  }}>{s}</div>
                </div>
                {i < stages.length - 1 && (
                  <div style={{
                    height: 2, flex: 1, marginTop: 15, minWidth: 20,
                    background: i < currentIdx ? "rgba(74,222,128,0.4)" : "rgba(255,255,255,0.08)",
                    borderRadius: 2,
                  }} />
                )}
              </div>
            ))}
          </div>
        </Card>
      </FadeUp>

      <FadeUp delay={80}>
        <div style={{ display: "flex", gap: 16, marginTop: 20 }}>
          {["Realtime updates", "Email notifications", "No more anxious DMs"].map((t, i) => (
            <div key={i} style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 100, padding: "8px 18px", fontSize: 13, color: MUTED,
            }}>
              ✓ {t}
            </div>
          ))}
        </div>
      </FadeUp>
    </AbsoluteFill>
  );
}

// ── Scene 6: Feature — Interview Scheduling (840–1050f) ───────────────────────
function SceneInterview() {
  const slots = ["Mon May 5 · 2:00 PM", "Mon May 5 · 2:30 PM", "Tue May 6 · 3:00 PM", "Tue May 6 · 3:30 PM"];
  const selectedIdx = 2;

  return (
    <AbsoluteFill style={{ ...BASE, justifyContent: "center", padding: "0 140px" }}>
      <FadeUp delay={0}>
        <Label text="Feature 03 — Interview Scheduling" />
        <div style={{ fontSize: 52, fontWeight: 900, letterSpacing: "-1.5px", lineHeight: 1.1 }}>
          Book interviews.<br /><span style={{ color: GOLD }}>Zero DMs.</span>
        </div>
        <GoldLine delay={15} width={56} />
      </FadeUp>

      <div style={{ display: "flex", gap: 32, marginTop: 16, alignItems: "flex-start" }}>
        <FadeUp delay={25} distance={24}>
          <Card style={{ flex: 1 }}>
            <div style={{ fontSize: 14, color: MUTED, marginBottom: 6 }}>Officer sets availability once</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Available slots</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {slots.map((s, i) => (
                <div key={i} style={{
                  padding: "12px 16px", borderRadius: 12, fontSize: 13, fontWeight: 600,
                  border: `1px solid ${i === selectedIdx ? GOLD : "rgba(255,255,255,0.08)"}`,
                  background: i === selectedIdx ? "rgba(201,168,76,0.12)" : "rgba(255,255,255,0.03)",
                  color: i === selectedIdx ? GOLD : MUTED,
                }}>
                  {s}
                </div>
              ))}
            </div>
          </Card>
        </FadeUp>

        <FadeUp delay={45} distance={24}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
            <Card style={{ borderColor: "rgba(74,222,128,0.2)" }}>
              <div style={{ fontSize: 13, color: GREEN, fontWeight: 700, marginBottom: 8 }}>✓ Student booked</div>
              <div style={{ fontSize: 17, fontWeight: 700 }}>Priya S. — Tue May 6 · 3:00 PM</div>
              <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>Confirmation sent automatically</div>
            </Card>
            <Card>
              <div style={{ fontSize: 14, color: MUTED, lineHeight: 1.7 }}>
                When you move an applicant to <span style={{ color: GOLD }}>Interview</span>, they get an email with a booking link. They pick a slot. It's locked. You get a calendar invite.
              </div>
            </Card>
            <div style={{ fontSize: 15, color: MUTED, paddingLeft: 4 }}>
              No back-and-forth. No missed DMs.<br />
              <span style={{ color: TEXT }}>Just booked interviews.</span>
            </div>
          </div>
        </FadeUp>
      </div>
    </AbsoluteFill>
  );
}

// ── Scene 7: Traction (1050–1230f) ────────────────────────────────────────────
function SceneTraction() {
  const stats = [
    { value: "655", label: "Club leaders contacted" },
    { value: "500+", label: "UCSD clubs indexed" },
    { value: "Live", label: "Pilots running now" },
  ];

  return (
    <AbsoluteFill style={{ ...BASE, alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 140px" }}>
      <FadeUp delay={0}>
        <Label text="Traction" />
        <div style={{ fontSize: 58, fontWeight: 900, letterSpacing: "-1.5px", lineHeight: 1.1 }}>
          Building at <span style={{ color: GOLD }}>UCSD.</span><br />Scaling to every campus.
        </div>
        <GoldLine delay={18} width={56} />
      </FadeUp>

      <div style={{ display: "flex", gap: 24, marginTop: 16 }}>
        {stats.map((s, i) => (
          <FadeUp key={i} delay={25 + i * 18}>
            <Card style={{ flex: 1, textAlign: "center", minWidth: 220 }}>
              <div style={{ fontSize: 60, fontWeight: 900, color: GOLD, letterSpacing: "-2px", lineHeight: 1 }}>
                {s.value}
              </div>
              <div style={{ fontSize: 15, color: MUTED, marginTop: 8, lineHeight: 1.5 }}>{s.label}</div>
            </Card>
          </FadeUp>
        ))}
      </div>

      <FadeUp delay={80}>
        <div style={{
          marginTop: 24, fontSize: 18, color: MUTED, lineHeight: 1.7,
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 16, padding: "20px 32px",
        }}>
          Real clubs. Real applicants. Real emails firing at every stage.<br />
          <span style={{ color: TEXT, fontWeight: 600 }}>This isn't a demo — it's already running.</span>
        </div>
      </FadeUp>
    </AbsoluteFill>
  );
}

// ── Scene 8: CTA (1230–1350f) ─────────────────────────────────────────────────
function SceneCTA() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pulse = Math.sin((frame / fps) * Math.PI * 1.6) * 0.05 + 1;
  const glow = interpolate(frame, [0, 60], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ ...BASE, alignItems: "center", justifyContent: "center", textAlign: "center" }}>
      <FadeUp delay={5}>
        <div style={{ fontSize: 24, color: MUTED, marginBottom: 20 }}>Free for UCSD clubs · No setup required</div>
      </FadeUp>
      <FadeUp delay={18}>
        <div style={{ fontSize: 80, fontWeight: 900, letterSpacing: "-2.5px" }}>
          Uni<span style={{ color: GOLD }}>Circle</span>
        </div>
      </FadeUp>
      <FadeUp delay={35}>
        <div style={{
          marginTop: 36,
          display: "inline-block",
          background: GOLD,
          color: "#000",
          fontWeight: 900,
          fontSize: 36,
          borderRadius: 18,
          padding: "22px 72px",
          letterSpacing: "-0.5px",
          transform: `scale(${pulse})`,
          boxShadow: `0 0 ${interpolate(glow, [0, 1], [0, 48])}px rgba(201,168,76,0.35)`,
        }}>
          unicircle.app
        </div>
      </FadeUp>
      <FadeUp delay={60}>
        <div style={{ color: MUTED, fontSize: 18, marginTop: 28 }}>
          Your club deserves better than a spreadsheet.
        </div>
      </FadeUp>
    </AbsoluteFill>
  );
}

// ── Main composition (1350 frames = 45s @ 30fps) ──────────────────────────────
export const UniCirclePitchDemo: React.FC = () => (
  <AbsoluteFill style={{ background: BG }}>
    <Sequence from={0}    durationInFrames={90}>  <SceneHook />       </Sequence>
    <Sequence from={90}   durationInFrames={180}> <SceneProblem />    </Sequence>
    <Sequence from={270}  durationInFrames={150}> <SceneSolution />   </Sequence>
    <Sequence from={420}  durationInFrames={210}> <ScenePipeline />   </Sequence>
    <Sequence from={630}  durationInFrames={210}> <SceneLiveTracker /></Sequence>
    <Sequence from={840}  durationInFrames={210}> <SceneInterview />  </Sequence>
    <Sequence from={1050} durationInFrames={180}> <SceneTraction />   </Sequence>
    <Sequence from={1230} durationInFrames={120}> <SceneCTA />        </Sequence>
  </AbsoluteFill>
);
