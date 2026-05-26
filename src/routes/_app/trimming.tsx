import { createFileRoute } from "@tanstack/react-router";
import { ContributionPanel } from "@/components/ContributionPanel";

export const Route = createFileRoute("/_app/trimming")({
  component: TrimmingPage,
  head: () => ({ meta: [{ title: "Trimming — E-Money" }] }),
});

function TrimmingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Trimming</h1>
        <p className="text-sm text-muted-foreground">Collect trimming service payments from students.</p>
      </div>
      <ContributionPanel
        category="trimming"
        description="Enter the trimming amount, then verify with fingerprint."
      />
    </div>
  );
}
