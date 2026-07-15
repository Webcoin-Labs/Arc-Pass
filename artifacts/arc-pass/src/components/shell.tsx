import { Header } from "./header";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background selection:bg-primary/20">
      <Header />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  )
}
