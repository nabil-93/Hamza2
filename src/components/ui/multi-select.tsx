"use client";

import * as React from "react";
import { Check, Search, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface MultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  selectedLabel?: string;
  /** Modèle du bouton d'ajout libre, ex: "Ajouter « {q} »". {q} est remplacé. */
  addLabel?: string;
}

/**
 * Recherche + multi-sélection sur une base d'options locales,
 * avec ajout libre d'un aliment absent de la liste.
 */
export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Rechercher…",
  selectedLabel = "sélectionné(s)",
  addLabel = "Ajouter « {q} »",
}: MultiSelectProps) {
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  const trimmed = query.trim();
  // Toutes les valeurs déjà sélectionnées hors de la base (ajouts libres).
  const customSelected = selected.filter(
    (s) => !options.some((o) => o.toLowerCase() === s.toLowerCase()),
  );

  // Propose l'ajout si la saisie n'existe ni dans les options ni dans la sélection.
  const canAdd =
    trimmed.length > 0 &&
    !options.some((o) => o.toLowerCase() === trimmed.toLowerCase()) &&
    !selected.some((s) => s.toLowerCase() === trimmed.toLowerCase());

  const toggle = (value: string) => {
    if (selected.includes(value)) onChange(selected.filter((v) => v !== value));
    else onChange([...selected, value]);
  };

  const addCustom = () => {
    if (!canAdd) return;
    onChange([...selected, trimmed]);
    setQuery("");
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder={placeholder}
          className="h-10 w-full rounded-md border border-border bg-white ps-9 pe-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
      </div>

      {/* Bouton d'ajout libre */}
      {canAdd && (
        <button
          type="button"
          onClick={addCustom}
          className="flex w-full items-center gap-2 rounded-md border border-dashed border-primary/50 bg-primary-50 px-3 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-100"
        >
          <Plus className="h-4 w-4" />
          {addLabel.replace("{q}", trimmed)}
        </button>
      )}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((s) => {
            const isCustom = customSelected.includes(s);
            return (
              <span
                key={s}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium",
                  isCustom ? "bg-secondary-50 text-secondary-700" : "bg-primary-50 text-primary-700",
                )}
              >
                {s}
                <button type="button" onClick={() => toggle(s)} aria-label={`Retirer ${s}`}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto rounded-md border border-border bg-muted/30 p-2 sm:grid-cols-3">
        {filtered.map((option) => {
          const isSelected = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggle(option)}
              className={cn(
                "flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium text-start transition-colors",
                isSelected
                  ? "border-secondary bg-secondary-50 text-secondary-700"
                  : "border-border bg-white hover:bg-muted",
              )}
            >
              <span
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border",
                  isSelected ? "border-secondary bg-secondary text-white" : "border-border",
                )}
              >
                {isSelected && <Check className="h-3 w-3" />}
              </span>
              {option}
            </button>
          );
        })}
        {filtered.length === 0 && !canAdd && (
          <p className="col-span-full py-3 text-center text-xs text-muted-foreground">—</p>
        )}
      </div>

      {selected.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {selected.length} {selectedLabel}
        </p>
      )}
    </div>
  );
}
