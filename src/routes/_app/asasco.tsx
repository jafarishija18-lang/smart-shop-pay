import { createFileRoute } from "@tanstack/react-router";
import { ContributionPanel } from "@/components/ContributionPanel";

export const Route = createFileRoute("/_app/asasco")({
  component: AsascoPage,
  head: () => ({ meta: [{ title: "Asasco — E-Money" }] }),
});

function AsascoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Asasco contribution</h1>
        <p className="text-sm text-muted-foreground">
          Collect Asasco organization contributions from students.
        </p>
      </div>
      <ContributionPanel
        category="asasco"
        description="Enter the amount the student wishes to contribute to Asasco, then verify with fingerprint."
      />
    </div>
  );
}
