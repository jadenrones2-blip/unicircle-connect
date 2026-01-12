import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles } from "lucide-react";
import ExpressInterestForm from "./ExpressInterestForm";
import { clubs } from "@/data/mockData";

interface ExpressInterestModalProps {
  isOpen: boolean;
  onClose: () => void;
  clubName?: string;
  clubId?: string;
}

const ExpressInterestModal = ({ isOpen, onClose, clubName, clubId }: ExpressInterestModalProps) => {
  const [shouldReset, setShouldReset] = useState(0);
  
  const handleClose = () => {
    onClose();
    // Reset form after animation completes
    setTimeout(() => setShouldReset(prev => prev + 1), 300);
  };

  const handleSuccess = () => {
    setTimeout(handleClose, 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/60 backdrop-blur-sm z-50"
            onClick={handleClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-lg overflow-hidden">
              {/* Header */}
              <div className="relative bg-gradient-to-br from-primary to-primary/80 p-6 text-primary-foreground">
                <button
                  onClick={handleClose}
                  className="absolute top-4 right-4 p-2 rounded-full hover:bg-primary-foreground/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-foreground/10 rounded-xl">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-display font-semibold">Express Interest</h2>
                    {clubName && (
                      <p className="text-sm text-primary-foreground/80">{clubName}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Form */}
              <div className="p-6">
                <ExpressInterestForm 
                  key={shouldReset}
                  preselectedClubId={clubId}
                  showClubSelector={!clubId}
                  onSuccess={handleSuccess}
                />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ExpressInterestModal;
