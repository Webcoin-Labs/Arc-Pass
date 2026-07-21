import { lazy, Suspense, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { CheckCircle2, CircleAlert, X } from 'lucide-react';
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
  x_api_access: 'X authorized your account, but Arc Pass does not currently have X API User Read access. Enable X API access and credits, then try again.',
  x_rate_limited: 'X verification is temporarily rate-limited. Please wait a few minutes and try again.',
  x_unavailable: 'X sign-in is temporarily unavailable.',
  discord: 'Discord sign-in could not be completed. Check the Discord OAuth redirect and try again.',
  discord_unavailable: 'Discord sign-in is temporarily unavailable.',
  github: 'GitHub verification could not be completed. Please try again.',
  github_unavailable: 'GitHub verification is not configured yet.',
  github_denied: 'GitHub authorization was cancelled. Nothing was connected.',
  github_token: 'GitHub could not complete the authorization exchange. Check the callback URL and try again.',
  github_profile: 'GitHub connected, but the account profile could not be verified. Please try again.',
  github_contributions: 'GitHub connected, but contribution history is temporarily unavailable. Please try again.',
  github_timeout: 'GitHub took too long to respond. Please try connecting again.',
  github_already_linked: 'This GitHub account is already linked to another Arc Pass identity. Sign in with its original X or Discord account, or use a different GitHub account.',
  x_already_linked: 'This X account is already linked to another Arc Pass identity. Sign in with that X account to access it.',
  discord_already_linked: 'This Discord account is already linked to another Arc Pass identity. Sign in with that Discord account to access it.',
  login_required_before_github: 'Sign in with X or Discord before connecting GitHub.',
  test_identity: 'The local test identity could not be created. Check the development test configuration.',
  session_mismatch: 'Your session changed during verification. Sign in and try again.',
  identity_mismatch: 'That is not the account used for the eligibility check. Continue with the checked account or check another username.',
};

const authSuccessMessages: Record<string, string> = {
  x: 'X is connected to this Arc Pass identity. You can see it under Connected Accounts.',
  discord: 'Discord is connected to this Arc Pass identity. You can see it under Connected Accounts.',
  github: 'GitHub is connected to this Arc Pass identity. Your account age and 180-day contribution history are ready for Builder verification.',
};

type OAuthNotice = {
  kind: 'success' | 'error';
  message: string;
};

const OAUTH_NOTICE_STORAGE_KEY = 'arc-pass:oauth-notice';

function readStoredOAuthNotice(): OAuthNotice | null {
  try {
    const stored = window.sessionStorage.getItem(OAUTH_NOTICE_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as Partial<OAuthNotice>;
    return (parsed.kind === 'success' || parsed.kind === 'error') && typeof parsed.message === 'string'
      ? { kind: parsed.kind, message: parsed.message }
      : null;
  } catch {
    return null;
  }
}

function OAuthStatusNotice() {
  const [notice, setNotice] = useState<OAuthNotice | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const authError = url.searchParams.get('authError');
    const authSuccess = url.searchParams.get('authSuccess');
    const shareError = url.searchParams.get('shareError');
    const shareSuccess = url.searchParams.get('shareSuccess');
    let handled = false;

    if (authError) {
      const nextNotice: OAuthNotice = {
        kind: 'error',
        message: authErrorMessages[authError] ?? 'Authentication could not be completed. Please try again.',
      };
      setNotice(nextNotice);
      window.sessionStorage.setItem(OAUTH_NOTICE_STORAGE_KEY, JSON.stringify(nextNotice));
      url.searchParams.delete('authError');
      handled = true;
    }
    if (authSuccess) {
      const nextNotice: OAuthNotice = {
        kind: 'success',
        message: authSuccessMessages[authSuccess] ?? 'Your account is connected to this Arc Pass identity.',
      };
      setNotice(nextNotice);
      window.sessionStorage.setItem(OAUTH_NOTICE_STORAGE_KEY, JSON.stringify(nextNotice));
      url.searchParams.delete('authSuccess');
      handled = true;
    }
    if (shareError) {
      toast.error('X could not publish the pass image. Nothing was posted; download the pass and attach it to the prefilled X post instead.');
      url.searchParams.delete('shareError');
      handled = true;
    }
    if (shareSuccess) {
      toast.success('Your verified Arc Pass was shared on X.');
      url.searchParams.delete('shareSuccess');
      handled = true;
    }
    if (handled) window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);

    if (!authError && !authSuccess) setNotice(readStoredOAuthNotice());
  }, []);

  if (!notice) return null;
  const isSuccess = notice.kind === 'success';
  return (
    <div className="border-b bg-background px-4 py-3 sm:px-6">
      <div
        role={isSuccess ? 'status' : 'alert'}
        className={isSuccess
          ? 'mx-auto flex w-full max-w-5xl items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm leading-6 text-emerald-950 dark:text-emerald-50'
          : 'mx-auto flex w-full max-w-5xl items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm leading-6 text-foreground'}
      >
        {isSuccess ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden="true" /> : <CircleAlert className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />}
        <p className="min-w-0 flex-1 font-medium">{notice.message}</p>
        <button
          type="button"
          className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
          aria-label="Dismiss account connection message"
          onClick={() => {
            window.sessionStorage.removeItem(OAUTH_NOTICE_STORAGE_KEY);
            setNotice(null);
          }}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Shell>
      <OAuthStatusNotice />
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
          <Router />
        </WouterRouter>
        <Toaster />
        <Analytics />
        <SpeedInsights />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
