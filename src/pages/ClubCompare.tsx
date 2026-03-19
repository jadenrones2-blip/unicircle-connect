import { useSearchParams, Link } from "react-router-dom";
import { useClubs } from "@/hooks/useExternalDB";
import { ArrowLeft, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Loader2 } from "lucide-react";
import type { Club, RecruitingStatus } from "@/data/mockData";

const COMPARISON_ROWS: { label: string; key: keyof Club }[] = [
  { label: "Category", key: "category" },
  { label: "Description", key: "description" },
  { label: "Recruiting Status", key: "recruitingStatus" },
  { label: "Email", key: "email" },
  { label: "Instagram", key: "instagram" },
  { label: "Website", key: "website" },
  { label: "Tags", key: "tags" },
];

function RecruitingBadge({ status }: { status: RecruitingStatus }) {
  if (status === "open") {
    return (
      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 border">
        Open
      </Badge>
    );
  }
  if (status === "upcoming") {
    return (
      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 border">
        Upcoming
      </Badge>
    );
  }
  return null;
}

function ExternalLinkCell({ href, label }: { href: string; label: string }) {
  const normalizedHref =
    href.startsWith("http://") || href.startsWith("https://")
      ? href
      : `https://${href}`;

  return (
    <a
      href={normalizedHref}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-gold hover:text-gold-light transition-colors text-sm underline underline-offset-2"
    >
      {label}
      <ExternalLink className="w-3 h-3 flex-shrink-0" />
    </a>
  );
}

function CellContent({ club, rowKey }: { club: Club; rowKey: keyof Club }) {
  const value = club[rowKey];

  if (rowKey === "recruitingStatus") {
    const status = value as RecruitingStatus;
    if (status === "closed") {
      return <span className="text-muted-foreground text-sm">Closed</span>;
    }
    return <RecruitingBadge status={status} />;
  }

  if (rowKey === "tags") {
    const tags = value as string[];
    if (!tags || tags.length === 0) {
      return <span className="text-muted-foreground">—</span>;
    }
    return (
      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="text-xs"
          >
            {tag}
          </Badge>
        ))}
      </div>
    );
  }

  if (rowKey === "website" && value) {
    return <ExternalLinkCell href={String(value)} label="Visit Website" />;
  }

  if (rowKey === "instagram" && value) {
    const handle = String(value);
    const url = handle.startsWith("http")
      ? handle
      : `https://instagram.com/${handle.replace(/^@/, "")}`;
    return <ExternalLinkCell href={url} label={handle.startsWith("@") ? handle : `@${handle}`} />;
  }

  if (rowKey === "email" && value) {
    return (
      <a
        href={`mailto:${String(value)}`}
        className="text-gold hover:text-gold-light transition-colors text-sm underline underline-offset-2"
      >
        {String(value)}
      </a>
    );
  }

  if (!value || (typeof value === "string" && value.trim() === "")) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <span className="text-sm text-foreground leading-relaxed">
      {String(value)}
    </span>
  );
}

const ClubCompare = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: allClubs, loading, error } = useClubs();

  const idsParam = searchParams.get("ids") ?? "";
  const ids = idsParam
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 4);

  const clubs = ids
    .map((id) => allClubs.find((c) => c.id === id))
    .filter((c): c is Club => c !== undefined);

  const handleRemove = (idToRemove: string) => {
    const newIds = ids.filter((id) => id !== idToRemove);
    if (newIds.length === 0) {
      setSearchParams({});
    } else {
      setSearchParams({ ids: newIds.join(",") });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 md:px-6 max-w-7xl">
          {/* Top nav row */}
          <div className="mb-6 flex items-center gap-3">
            <Link
              to="/clubs"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Clubs
            </Link>
          </div>

          {/* Page header */}
          <div className="mb-8">
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              Compare Clubs
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Side-by-side comparison of up to 4 clubs.
            </p>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-gold" />
              <span className="ml-3 text-muted-foreground">Loading clubs…</span>
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center">
              <p className="text-destructive font-medium">
                Failed to load clubs: {error}
              </p>
              <Button variant="outline" className="mt-4" asChild>
                <Link to="/clubs">Back to Clubs</Link>
              </Button>
            </div>
          )}

          {/* Empty / no matches */}
          {!loading && !error && ids.length === 0 && (
            <div className="rounded-lg border border-border bg-card p-10 text-center">
              <p className="text-muted-foreground">
                No clubs selected for comparison.
              </p>
              <Button variant="gold" className="mt-4" asChild>
                <Link to="/clubs">Browse Clubs</Link>
              </Button>
            </div>
          )}

          {!loading && !error && ids.length > 0 && clubs.length === 0 && (
            <div className="rounded-lg border border-border bg-card p-10 text-center">
              <p className="text-muted-foreground">
                None of the selected club IDs were found.
              </p>
              <Button variant="gold" className="mt-4" asChild>
                <Link to="/clubs">Browse Clubs</Link>
              </Button>
            </div>
          )}

          {/* Comparison table */}
          {!loading && !error && clubs.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[640px] border-collapse">
                <colgroup>
                  {/* Label column */}
                  <col className="w-36 md:w-44" />
                  {/* Club columns — equal width */}
                  {clubs.map((c) => (
                    <col key={c.id} />
                  ))}
                </colgroup>

                {/* Club header row */}
                <thead>
                  <tr className="border-b border-border bg-card">
                    {/* Empty corner cell */}
                    <th className="p-4" />
                    {clubs.map((club) => (
                      <th
                        key={club.id}
                        className="p-4 text-left align-top border-l border-border"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <Link
                              to={`/clubs/${club.id}`}
                              className="font-display font-semibold text-foreground hover:text-gold transition-colors leading-snug text-sm md:text-base line-clamp-2"
                            >
                              {club.name}
                            </Link>
                            {club.category && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {club.category}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemove(club.id)}
                            aria-label={`Remove ${club.name} from comparison`}
                            className="flex-shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* Comparison rows */}
                <tbody>
                  {/* Name row first */}
                  <tr className="border-b border-border even:bg-secondary/20">
                    <td className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider align-top whitespace-nowrap bg-card/50">
                      Name
                    </td>
                    {clubs.map((club) => (
                      <td
                        key={club.id}
                        className="p-4 align-top border-l border-border"
                      >
                        <Link
                          to={`/clubs/${club.id}`}
                          className="text-sm font-medium text-foreground hover:text-gold transition-colors"
                        >
                          {club.name}
                        </Link>
                      </td>
                    ))}
                  </tr>

                  {COMPARISON_ROWS.map((row, idx) => (
                    <tr
                      key={row.key}
                      className={`border-b border-border ${idx % 2 === 0 ? "" : "bg-secondary/10"}`}
                    >
                      <td className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider align-top whitespace-nowrap bg-card/50">
                        {row.label}
                      </td>
                      {clubs.map((club) => (
                        <td
                          key={club.id}
                          className="p-4 align-top border-l border-border"
                        >
                          <CellContent club={club} rowKey={row.key} />
                        </td>
                      ))}
                    </tr>
                  ))}

                  {/* View Profile row */}
                  <tr>
                    <td className="p-4 bg-card/50" />
                    {clubs.map((club) => (
                      <td
                        key={club.id}
                        className="p-4 border-l border-border"
                      >
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/clubs/${club.id}`}>View Profile</Link>
                        </Button>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ClubCompare;
