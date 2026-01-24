import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import ClubsDirectory from "./pages/ClubsDirectory";
import ClubDetail from "./pages/ClubDetail";
import CalendarApp from "./pages/CalendarApp";
import ExpressInterest from "./pages/ExpressInterest";
import SubmitEvent from "./pages/SubmitEvent";
import AdminEvents from "./pages/AdminEvents";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
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
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/clubs" element={<ClubsDirectory />} />
          <Route path="/clubs/:id" element={<ClubDetail />} />
          <Route path="/events" element={<CalendarApp />} />
          <Route path="/calendar" element={<CalendarApp />} />
          <Route path="/express-interest" element={<ExpressInterest />} />
          <Route path="/submit-event" element={<SubmitEvent />} />
          <Route path="/admin/events" element={<AdminEvents />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
