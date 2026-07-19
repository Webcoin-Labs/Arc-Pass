import { useLocation } from "wouter";
import { Header } from "./header";
import { Footer } from "./footer";
import { SupportAssistant } from "./support-assistant";

// The full marketing footer only belongs on destination pages. Focused flows
// (claiming, verification, docs reading) keep the viewport for the task.
const FOOTER_ROUTES = new Set(["/", "/dashboard"]);

export function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const showFooter = FOOTER_ROUTES.has(location);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background selection:bg-primary/20">
      <Header />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      {showFooter && <Footer />}
      <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-50 sm:bottom-5 sm:right-5">
        <SupportAssistant floating />
      </div>
    </div>
  )
}
