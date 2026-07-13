"use client";

import { useEffect, useState } from "react";
import type { ListingFilters as ListingFiltersValue } from "@fanpass/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SORT_OPTIONS: Array<{ value: NonNullable<ListingFiltersValue["sortBy"]>; label: string }> = [
  { value: "recommended", label: "Recommended" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "trust_desc", label: "Trust Score" },
  { value: "recent", label: "Newest" },
];

interface ListingFiltersProps {
  value: ListingFiltersValue;
  onChange: (value: ListingFiltersValue) => void;
}

export function ListingFilters({ value, onChange }: ListingFiltersProps) {
  const [query, setQuery] = useState(value.query ?? "");

  useEffect(() => {
    const handle = setTimeout(() => {
      if (query !== (value.query ?? "")) onChange({ ...value, query: query || undefined });
    }, 400);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-xl border border-border p-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-query">Event, venue, or seat</Label>
        <Input
          id="filter-query"
          placeholder="Search listings…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-56"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-min-price">Min price</Label>
        <Input
          id="filter-min-price"
          type="number"
          min={0}
          className="w-28"
          value={value.minPrice ?? ""}
          onChange={(e) => onChange({ ...value, minPrice: e.target.value ? Number(e.target.value) : undefined })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-max-price">Max price</Label>
        <Input
          id="filter-max-price"
          type="number"
          min={0}
          className="w-28"
          value={value.maxPrice ?? ""}
          onChange={(e) => onChange({ ...value, maxPrice: e.target.value ? Number(e.target.value) : undefined })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-trust">Min trust score</Label>
        <Input
          id="filter-trust"
          type="number"
          min={0}
          max={100}
          className="w-28"
          value={value.minTrustScore ?? ""}
          onChange={(e) => onChange({ ...value, minTrustScore: e.target.value ? Number(e.target.value) : undefined })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-sort">Sort by</Label>
        <select
          id="filter-sort"
          className="h-9 w-44 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
          value={value.sortBy ?? "recommended"}
          onChange={(e) => onChange({ ...value, sortBy: e.target.value as ListingFiltersValue["sortBy"] })}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
