import { Link } from "react-router-dom";

const CTASection = () => (
  <section
    style={{
      background: "#000",
      padding: "80px 48px 0",
      textAlign: "center",
      borderTop: "1px solid rgba(255,255,255,0.05)",
    }}
  >
    <h2
      className="font-display font-black text-white mb-3.5"
      style={{
        fontSize: "clamp(30px, 3.8vw, 50px)",
        letterSpacing: "-0.03em",
      }}
    >
      Your club is out there.
    </h2>

    <p
      className="mb-[34px]"
      style={{ fontSize: 15, color: "rgba(255,255,255,0.38)" }}
    >
      600+ organizations at UCSD. One place to find them.
    </p>

    <div className="flex items-center justify-center gap-3 flex-wrap">
      <Link
        to="/clubs"
        className="font-bold text-black"
        style={{
          fontSize: 14,
          padding: "14px 32px",
          borderRadius: 9999,
          background: "hsl(47 95% 58%)",
          boxShadow: "0 6px 28px hsl(47 95% 58% / 0.3)",
          textDecoration: "none",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        Explore Clubs →
      </Link>

      <Link
        to="/club-admin/request"
        style={{
          fontSize: 14,
          fontWeight: 600,
          padding: "14px 32px",
          borderRadius: 9999,
          background: "transparent",
          color: "rgba(255,255,255,0.65)",
          border: "1px solid rgba(255,255,255,0.18)",
          textDecoration: "none",
          display: "inline-flex",
          alignItems: "center",
        }}
      >
        Get Your Org on UniCircle
      </Link>
    </div>

    {/* Survey callout */}
    <div
      className="mx-auto mt-16 mb-0 max-w-xl rounded-2xl px-8 py-8 text-left"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-5">
        <div className="flex-1">
          <p
            className="font-display font-bold text-white mb-1"
            style={{ fontSize: "clamp(16px, 2vw, 20px)" }}
          >
            Help us build what students actually need.
          </p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
            We're expanding to campuses across California. 3 questions that actually matter — your answers go straight to the founders.
          </p>
        </div>
        <Link
          to="/survey"
          className="shrink-0 font-bold text-black"
          style={{
            fontSize: 13,
            padding: "12px 24px",
            borderRadius: 9999,
            background: "hsl(47 95% 58%)",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            whiteSpace: "nowrap",
          }}
        >
          Take the survey →
        </Link>
      </div>
    </div>

    <div style={{ padding: "60px 0 80px" }} />
  </section>
);

export default CTASection;
