import { createFileRoute } from "@tanstack/react-router";
import { ContributionPanel } from "@/components/ContributionPanel";

export const Route = createFileRoute("/_app/plaiting")({
  component: PlaitingPage,
  head: () => ({ meta: [{ title: "Plaiting — E-Money" }] }),
});

function PlaitingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Plaiting</h1>
        <p className="text-sm text-muted-foreground">Collect plaiting service payments from students.</p>
      </div>
      <ContributionPanel
        category="plaiting"
        description="Enter the plaiting amount, then verify with fingerprint."
      />
    </div>
  );
}
