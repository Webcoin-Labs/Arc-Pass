import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/theme-provider';
import { Shell } from '@/components/shell';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { WalletProvider } from '@/lib/wallet-provider';
import '@rainbow-me/rainbowkit/styles.css';

// Route-level code splitting — the landing page (first paint for most
// visitors) stays in the main bundle; everything else loads on navigation.
import LandingPage from '@/pages/landing';
const DashboardPage = lazy(() => import('@/pages/dashboard'));
const ClaimFounderPage = lazy(() => import('@/pages/claim-founder'));
const ClaimBuilderPage = lazy(() => import('@/pages/claim-builder'));
const PassDetailPage = lazy(() => import('@/pages/pass-detail'));
const FaqPage = lazy(() => import('@/pages/faq'));
const DocsPage = lazy(() => import('@/pages/docs'));
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
        <WalletProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
        </WalletProvider>
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
