import { Link } from "react-router-dom";
import { X, GitCompareArrows } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

interface CompareBarProps {
  selectedIds: string[];
  clubNames: Record<string, string>;
  onRemove: (id: string) => void;
  onClear: () => void;
}

const CompareBar = ({
  selectedIds,
  clubNames,
  onRemove,
  onClear,
}: CompareBarProps) => {
  const isFull = selectedIds.length >= 4;
  const compareUrl = `/clubs/compare?ids=${selectedIds.join(",")}`;

  return (
    <AnimatePresence>
      {selectedIds.length >= 1 && (
        <motion.div
          key="compare-bar"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-background/95 backdrop-blur-xl shadow-2xl"
        >
          <div className="container mx-auto px-4 md:px-6 max-w-7xl py-3 flex items-center gap-3 flex-wrap md:flex-nowrap">
            {/* Club chips */}
            <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
              {selectedIds.map((id) => {
                const name = clubNames[id] ?? id;
                return (
                  <motion.span
                    key={id}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.15 }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-secondary border border-border px-3 py-1 text-xs font-medium text-foreground max-w-[180px]"
                  >
                    <span className="truncate">{name}</span>
                    <button
                      onClick={() => onRemove(id)}
                      aria-label={`Remove ${name} from comparison`}
                      className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </motion.span>
                );
              })}

              {isFull && (
                <span className="text-xs text-muted-foreground font-medium px-1">
                  Max 4
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 flex-shrink-0 ml-auto">
              <button
                onClick={onClear}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
              >
                Clear
              </button>

              <Button
                variant="gold"
                size="sm"
                className="gap-1.5 font-semibold"
                disabled={selectedIds.length < 2}
                asChild={selectedIds.length >= 2}
              >
                {selectedIds.length >= 2 ? (
                  <Link to={compareUrl}>
                    <GitCompareArrows className="w-4 h-4" />
                    Compare ({selectedIds.length})
                  </Link>
                ) : (
                  <span>
                    <GitCompareArrows className="w-4 h-4" />
                    Compare ({selectedIds.length})
                  </span>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CompareBar;
