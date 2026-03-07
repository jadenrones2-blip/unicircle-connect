import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import CustomCursor from "./components/CustomCursor";
import ScrollProgress from "./components/ScrollProgress";
import PageIntro from "./components/PageIntro";
import Index from "./pages/Index";
import ClubsDirectory from "./pages/ClubsDirectory";
import ClubDetail from "./pages/ClubDetail";
import CalendarApp from "./pages/CalendarApp";
import ExpressInterest from "./pages/ExpressInterest";
import SubmitEvent from "./pages/SubmitEvent";
import AdminEvents from "./pages/AdminEvents";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import VerifyClaim from "./pages/VerifyClaim";
import ClubAdminDashboard from "./pages/ClubAdminDashboard";
import ClubAdminEvents from "./pages/ClubAdminEvents";
import ClubAdminEdit from "./pages/ClubAdminEdit";
import ClubAdminRecruitment from "./pages/ClubAdminRecruitment";
import AdminOnboarding from "./pages/AdminOnboarding";
import AdminProfileSettings from "./pages/AdminProfileSettings";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TestResumeUpload from "./pages/TestResumeUpload";
import SocialAssets from "./pages/SocialAssets";
import AuthCallback from "./pages/AuthCallback";
import Demo from "./pages/Demo";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <PageIntro />
      <CustomCursor />
      <ScrollProgress />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/clubs" element={<ClubsDirectory />} />
          <Route path="/clubs/:id" element={<ClubDetail />} />
          <Route path="/events" element={<CalendarApp />} />
          <Route path="/calendar" element={<CalendarApp />} />
          <Route path="/express-interest" element={<ExpressInterest />} />
          <Route path="/submit-event" element={<SubmitEvent />} />
          <Route path="/admin/events" element={<AdminEvents />} />
          <Route path="/verify-claim" element={<VerifyClaim />} />
          <Route path="/club-admin" element={<ClubAdminDashboard />} />
          <Route path="/club-admin/clubs/:clubId/events" element={<ClubAdminEvents />} />
          <Route path="/club-admin/clubs/:clubId/edit" element={<ClubAdminEdit />} />
          <Route path="/club-admin/clubs/:clubId/recruitment" element={<ClubAdminRecruitment />} />
          <Route path="/club-admin/profile" element={<AdminProfileSettings />} />
          <Route path="/admin-onboarding" element={<AdminOnboarding />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/test-resume" element={<TestResumeUpload />} />
          <Route path="/social-assets" element={<SocialAssets />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
