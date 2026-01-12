import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import ClubsDirectory from "./pages/ClubsDirectory";
import ClubDetail from "./pages/ClubDetail";
import EventsCalendar from "./pages/EventsCalendar";
import ExpressInterest from "./pages/ExpressInterest";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/clubs" element={<ClubsDirectory />} />
          <Route path="/clubs/:id" element={<ClubDetail />} />
          <Route path="/events" element={<EventsCalendar />} />
          <Route path="/express-interest" element={<ExpressInterest />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
