import { Link } from "react-router-dom";

const CTASection = () => (
  <section
    style={{
      background: "#000",
      padding: "80px 48px 140px",
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
  </section>
);

export default CTASection;
