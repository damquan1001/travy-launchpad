export type SourceKind = "primary" | "community" | "web";

export type ItineraryPlace = {
  id?: string;
  slug?: string;
  name: string;
  name_vn?: string;
  blurb: string;
  cultural_context?: string;
  est_cost_usd?: number | null;
  best_time?: string | null;
  tip?: string | null;
  transport?: string | null;
  community_flag?: boolean;
  source_kind?: SourceKind;
  source_url?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export type ItineraryDay = {
  day: number;
  title: string;
  places: ItineraryPlace[];
};

export type Itinerary = {
  title: string;
  destination: string;
  party?: string;
  start_date?: string | null;
  end_date?: string | null;
  budget_usd?: number | null;
  summary?: string;
  days: ItineraryDay[];
};

export const emptyItinerary = (): Itinerary => ({
  title: "",
  destination: "",
  days: [],
});
