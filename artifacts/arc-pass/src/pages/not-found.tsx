import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-4rem)] bg-background">
      <div className="max-w-md text-center p-8 border rounded-3xl bg-card shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-8 h-8 text-muted-foreground" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Page Not Found</h1>
        <p className="text-muted-foreground mb-8">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <Button asChild size="lg" className="w-full">
          <Link href="/">Return Home</Link>
        </Button>
      </div>
    </div>
  );
}
