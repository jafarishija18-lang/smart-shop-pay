export const FORM_LEVELS = [
  "Form 1",
  "Form 2",
  "Form 3",
  "Form 4",
  "Form 5",
  "Form 6",
] as const;

export const COMBINATIONS = ["ECM", "PGM", "PMC", "PCM", "PCB", "CBG", "EGM"] as const;

export const APP_NAME = "E-Money";
export const APP_TAGLINE = "Royal cashless wallet for schools";

export type ContributionCategory = "asasco" | "offering" | "trimming" | "plaiting";

export const CONTRIBUTION_LABELS: Record<ContributionCategory, string> = {
  asasco: "Asasco",
  offering: "Offering",
  trimming: "Trimming",
  plaiting: "Plaiting",
};

export const DENOMINATIONS = [
  "Lutheran",
  "Roman Catholic",
  "Sabbath",
  "Muslim",
] as const;
export type Denomination = (typeof DENOMINATIONS)[number];
