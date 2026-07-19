import { lazy, Suspense, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/theme-provider';
import { Shell } from '@/components/shell';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { toast } from 'sonner';

// Route-level code splitting — the landing page (first paint for most
// visitors) stays in the main bundle; everything else loads on navigation.
import LandingPage from '@/pages/landing';
const DashboardPage = lazy(() => import('@/pages/dashboard'));
const ClaimFounderPage = lazy(() => import('@/pages/claim-founder-route'));
const ClaimBuilderPage = lazy(() => import('@/pages/claim-builder-route'));
const PassDetailPage = lazy(() => import('@/pages/pass-detail'));
const FaqPage = lazy(() => import('@/pages/faq'));
const DocsPage = lazy(() => import('@/pages/docs'));
const TiersPage = lazy(() => import('@/pages/tiers'));
const AdminPage = lazy(() => import('@/pages/admin'));
const NotFound = lazy(() => import('@/pages/not-found'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const authErrorMessages: Record<string, string> = {
  x: 'X sign-in could not be completed. Check the X developer app access and try again.',
  x_unavailable: 'X sign-in is temporarily unavailable.',
  discord: 'Discord sign-in could not be completed. Check the Discord OAuth redirect and try again.',
  discord_unavailable: 'Discord sign-in is temporarily unavailable.',
  github: 'GitHub verification could not be completed. Please try again.',
  github_unavailable: 'GitHub verification is not configured yet.',
  github_already_linked: 'That GitHub account is already connected to another Arc Pass identity.',
  login_required_before_github: 'Sign in with X or Discord before connecting GitHub.',
  test_identity: 'The local test identity could not be created. Check the development test configuration.',
  session_mismatch: 'Your session changed during verification. Sign in and try again.',
  identity_mismatch: 'That is not the account used for the eligibility check. Continue with the checked account or check another username.',
};

function OAuthErrorNotice() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const authError = url.searchParams.get('authError');
    if (!authError) return;
    toast.error(authErrorMessages[authError] ?? 'Authentication could not be completed. Please try again.');
    url.searchParams.delete('authError');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }, []);
  return null;
}

function Router() {
  return (
    <Shell>
      <Suspense fallback={null}>
        <Switch>
          <Route path="/" component={LandingPage} />
          <Route path="/dashboard" component={DashboardPage} />
          <Route path="/claim/founder" component={ClaimFounderPage} />
          <Route path="/claim/builder" component={ClaimBuilderPage} />
          <Route path="/pass/:type/:id" component={PassDetailPage} />
          <Route path="/faq" component={FaqPage} />
          <Route path="/docs" component={DocsPage} />
          <Route path="/tiers" component={TiersPage} />
          <Route path="/admin" component={AdminPage} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </Shell>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="arc-pass-theme">
      <QueryClientProvider client={queryClient}>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <OAuthErrorNotice />
          <Router />
        </WouterRouter>
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
