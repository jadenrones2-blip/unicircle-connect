import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ClubOwnershipProvider } from '@/contexts/ClubOwnershipContext';
import { ClubsProvider } from '@/contexts/ClubsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import PageIntro from './components/PageIntro';
import Index from './pages/Index';
import ClubsDirectory from './pages/ClubsDirectory';
import ClubDetail from './pages/ClubDetail';
import CalendarApp from './pages/CalendarApp';
import ExpressInterest from './pages/ExpressInterest';
import SubmitEvent from './pages/SubmitEvent';
import AdminEvents from './pages/AdminEvents';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import VerifyClaim from './pages/VerifyClaim';
import ClubAdminDashboard from './pages/ClubAdminDashboard';
import ClubAdminEvents from './pages/ClubAdminEvents';
import ClubAdminEdit from './pages/ClubAdminEdit';
import ClubAdminRecruitment from './pages/ClubAdminRecruitment';
import ClubAdminAnalytics from './pages/ClubAdminAnalytics';
import ClubAdminMembers from './pages/ClubAdminMembers';
import ClubApply from './pages/ClubApply';
import Opportunities from './pages/Opportunities';
import AdminOnboarding from './pages/AdminOnboarding';
import AdminProfileSettings from './pages/AdminProfileSettings';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TestResumeUpload from './pages/TestResumeUpload';
import SocialAssets from './pages/SocialAssets';
import AuthCallback from './pages/AuthCallback';
import Demo from './pages/Demo';
import ReachDemo from './pages/ReachDemo';
import ClubOnboardingRequest from './pages/ClubOnboardingRequest';
import AdminRequestsPanel from './pages/AdminRequestsPanel';
import OrgPeopleDashboard from './pages/OrgPeopleDashboard';
import OrgPersonProfile from './pages/OrgPersonProfile';
import OrgPipeline from './pages/OrgPipeline';
import OrgScorecard from './pages/OrgScorecard';
import StudentProfile from './pages/StudentProfile';
import ApplyBySlug from './pages/ApplyBySlug';
import StartupIncubatorDemo from './pages/StartupIncubatorDemo';
import AcceptInvite from './pages/AcceptInvite';
import Founder from './pages/Founder';
import ClubAdminTeam from './pages/ClubAdminTeam';
import ClubSurvey from './pages/ClubSurvey';
import PlatformSurvey from './pages/PlatformSurvey';
import NotFound from './pages/NotFound';
import InterviewBooking from './pages/InterviewBooking';
import Discover from './pages/Discover';
import TablingLanding from './pages/TablingLanding';
import JoinEvent from './pages/JoinEvent';
import JoinComplete from './pages/JoinComplete';
import ApprovalPending from './pages/ApprovalPending';
import ClubSpotlightCreator from './pages/ClubSpotlightCreator';
import ClubAdminInbox from './pages/ClubAdminInbox';
import MobileNav from './components/MobileNav';
import UCLALanding from './pages/UCLALanding';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ClubOwnershipProvider>
        <ClubsProvider>
          <TooltipProvider>
            <PageIntro />
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ErrorBoundary>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/profile" element={<StudentProfile />} />
                  <Route path="/clubs" element={<ClubsDirectory />} />
                  <Route path="/opportunities" element={<Opportunities />} />
                  <Route path="/clubs/:id" element={<ClubDetail />} />
                  <Route path="/clubs/:id/apply" element={<ClubApply />} />
                  <Route path="/clubs/:id/survey" element={<ClubSurvey />} />
                  <Route path="/survey" element={<PlatformSurvey />} />
                  <Route path="/apply/:slug" element={<ApplyBySlug />} />
                  <Route path="/events" element={<CalendarApp />} />
                  <Route path="/calendar" element={<CalendarApp />} />
                  <Route path="/express-interest" element={<ExpressInterest />} />
                  <Route path="/submit-event" element={<SubmitEvent />} />
                  <Route path="/admin/events" element={<AdminEvents />} />
                  <Route path="/admin/requests" element={<AdminRequestsPanel />} />
                  <Route path="/verify-claim" element={<VerifyClaim />} />
                  <Route path="/club-admin" element={<ClubAdminDashboard />} />
                  <Route path="/club-admin/clubs/:clubId/events" element={<ClubAdminEvents />} />
                  <Route path="/club-admin/clubs/:clubId/edit" element={<ClubAdminEdit />} />
                  <Route
                    path="/club-admin/clubs/:clubId/recruitment"
                    element={<ClubAdminRecruitment />}
                  />
                  <Route
                    path="/club-admin/clubs/:clubId/analytics"
                    element={<ClubAdminAnalytics />}
                  />
                  <Route path="/club-admin/clubs/:clubId/members" element={<ClubAdminMembers />} />
                  <Route path="/club-admin/clubs/:clubId/team" element={<ClubAdminTeam />} />
                  <Route path="/club-admin/clubs/:clubId/people" element={<OrgPeopleDashboard />} />
                  <Route
                    path="/club-admin/clubs/:clubId/people/:personId"
                    element={<OrgPersonProfile />}
                  />
                  <Route path="/club-admin/clubs/:clubId/pipeline" element={<OrgPipeline />} />
                  <Route path="/club-admin/clubs/:clubId/scorecard" element={<OrgScorecard />} />
                  <Route path="/club-admin/profile" element={<AdminProfileSettings />} />
                  <Route path="/club-admin/request" element={<ClubOnboardingRequest />} />
                  <Route path="/admin-onboarding" element={<AdminOnboarding />} />
                  <Route path="/interview/:clubId" element={<InterviewBooking />} />
                  <Route path="/discover" element={<Discover />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/invite/:token" element={<AcceptInvite />} />
                  <Route path="/terms" element={<TermsOfService />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/test-resume" element={<TestResumeUpload />} />
                  <Route path="/social-assets" element={<SocialAssets />} />
                  <Route path="/demo" element={<Demo />} />
                  <Route path="/story" element={<Founder />} />
                  <Route path="/reach" element={<ReachDemo />} />
                  <Route path="/startup-incubator" element={<StartupIncubatorDemo />} />
                  <Route path="/tabling" element={<TablingLanding />} />
                  <Route path="/ucla" element={<UCLALanding />} />
                  <Route path="/join/:clubId" element={<JoinEvent />} />
                  <Route path="/join/:clubId/done" element={<JoinComplete />} />
                  <Route path="/approval-pending" element={<ApprovalPending />} />
                  <Route
                    path="/club-admin/clubs/:clubId/spotlight"
                    element={<ClubSpotlightCreator />}
                  />
                  <Route path="/club-admin/clubs/:clubId/inbox" element={<ClubAdminInbox />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </ErrorBoundary>
              <MobileNav />
            </BrowserRouter>
          </TooltipProvider>
        </ClubsProvider>
      </ClubOwnershipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
