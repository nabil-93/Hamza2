"use client";

import * as React from "react";
import { Sparkles, Send, Loader2, Bot, User, Wand2, ChevronDown, ChevronUp, Check, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/locales";
import { discussDay, regenerateMeal, type ChatTurn } from "@/lib/ai/client";
import { cn } from "@/lib/utils";
import type { DailyMealPlan, Meal, PatientForm, CalculationResult, Locale } from "@/types";

interface ChatMsg {
  role: "user" | "assistant";
  text: string;
  /** Proposition de jour modifié jointe à un message assistant (le cas échéant). */
  proposition?: DailyMealPlan | null;
  /** True une fois la proposition appliquée (verrouille le bouton). */
  applied?: boolean;
}

/** Historique des variantes générées pour un repas + index affiché. */
interface MealHistory {
  /** Toutes les versions, de la plus ancienne (originale) à la plus récente. */
  versions: Meal[];
  /** Index de la version actuellement affichée. */
  current: number;
}

interface Props {
  plan: DailyMealPlan;
  form: PatientForm;
  calc: CalculationResult;
  locale: Locale;
  dayIndex: number;
  onUpdateDay: (index: number, day: DailyMealPlan) => void;
  isActive: boolean;
  onActivate: () => void;
}

export function DayPanel({ plan, form, calc, locale, dayIndex, onUpdateDay, isActive, onActivate }: Props) {
  const { t } = useI18n();
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [messages, setMessages] = React.useState<ChatMsg[]>([]);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  // Régénération par repas : index en cours de génération.
  const [regenIndex, setRegenIndex] = React.useState<number | null>(null);
  // Historique de versions par repas : toutes les variantes générées + version affichée.
  const [mealHistory, setMealHistory] = React.useState<Record<number, MealHistory>>({});

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const message = input.trim();
    if (!message || loading) return;
    setInput("");
    // Historique (mémoire) = échanges précédents, sans les propositions JSON.
    const history: ChatTurn[] = messages.map((m) => ({ role: m.role, content: m.text }));
    setMessages((m) => [...m, { role: "user", text: message }]);
    setLoading(true);
    try {
      const res = await discussDay(plan, message, locale, form, calc, history);
      setMessages((m) => [
        ...m,
        { role: "assistant", text: res.reponse, proposition: res.proposition, applied: false },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setMessages((m) => [...m, { role: "assistant", text: `❌ Erreur : ${msg}` }]);
    } finally {
      setLoading(false);
    }
  };

  /** Applique une proposition au jour et verrouille le bouton du message concerné. */
  const apply = (msgIndex: number, proposition: DailyMealPlan) => {
    onUpdateDay(dayIndex, proposition);
    setMessages((m) => m.map((msg, i) => (i === msgIndex ? { ...msg, applied: true } : msg)));
  };

  /** Place le repas `meal` à l'index donné dans le jour et recalcule le total. */
  const setMealAt = (mealIndex: number, meal: Meal) => {
    const repas = plan.repas.map((r, i) => (i === mealIndex ? meal : r));
    const caloriesTotales = repas.reduce((sum, r) => sum + (r.calories || 0), 0);
    onUpdateDay(dayIndex, { ...plan, repas, caloriesTotales });
  };

  /** Régénère UN repas : ajoute une nouvelle variante à l'historique et l'affiche. */
  const regenMeal = async (mealIndex: number) => {
    if (regenIndex !== null) return;
    setRegenIndex(mealIndex);
    const courant = plan.repas[mealIndex];
    try {
      const updated = await regenerateMeal(plan, mealIndex, locale, form);
      const nouveau = updated.repas[mealIndex];
      setMealHistory((h) => {
        const prev = h[mealIndex];
        // 1re régénération : on amorce l'historique avec [original, nouveau].
        const base = prev?.versions ?? [courant];
        const versions = [...base, nouveau];
        return { ...h, [mealIndex]: { versions, current: versions.length - 1 } };
      });
      onUpdateDay(dayIndex, updated);
    } catch {
      /* en cas d'erreur on ne touche à rien */
    } finally {
      setRegenIndex(null);
    }
  };

  /** Navigue vers une autre version d'un repas (flèches ← →). */
  const goToVersion = (mealIndex: number, target: number) => {
    const hist = mealHistory[mealIndex];
    if (!hist || target < 0 || target >= hist.versions.length) return;
    setMealHistory((h) => ({ ...h, [mealIndex]: { ...hist, current: target } }));
    setMealAt(mealIndex, hist.versions[target]);
  };

  const suggestions = [t("chat.sugg1"), t("chat.sugg2"), t("chat.sugg3")];

  return (
    <div className={cn("rounded-xl border transition-all", isActive ? "border-primary shadow-md" : "border-border")}>
      {/* Header — clic pour activer/réduire */}
      <button
        type="button"
        onClick={onActivate}
        className="flex w-full items-center justify-between px-5 py-4 text-start"
      >
        <div className="flex items-center gap-3">
          <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold", isActive ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>
            {plan.jour.slice(0, 2)}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{plan.jour}</p>
            <p className="text-xs text-muted-foreground">
              {plan.caloriesTotales} kcal · P {plan.macros.proteines}g · G {plan.macros.glucides}g · L {plan.macros.lipides}g
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success" className="text-xs">{plan.repas.length} repas</Badge>
          {isActive ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Contenu développé */}
      {isActive && (
        <div className="grid gap-4 border-t border-border p-4 lg:grid-cols-2">
          {/* Colonne gauche : repas du jour */}
          <div className="space-y-3">
            {plan.repas.map((repas, i) => {
              const isRegen = regenIndex === i;
              const hist = mealHistory[i];
              const nVersions = hist?.versions.length ?? 0;
              const cur = hist?.current ?? 0;
              return (
                <div key={i} className="rounded-lg border border-border bg-white p-3">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold">
                      <span className="text-primary">{repas.type}</span>
                      <span className="mx-1 text-muted-foreground">—</span>
                      {repas.nom}
                    </p>
                    <div className="flex shrink-0 items-center gap-1">
                      <Badge variant="neutral">{repas.calories} kcal</Badge>
                      {/* Navigation entre versions générées (‹ 2/5 ›) */}
                      {nVersions > 1 && (
                        <div className="flex items-center gap-0.5 rounded-md border border-border px-1">
                          <button
                            type="button"
                            title={t("meal.prevVersion")}
                            onClick={() => goToVersion(i, cur - 1)}
                            disabled={cur === 0 || regenIndex !== null}
                            className="flex h-6 w-5 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                          </button>
                          <span className="min-w-[28px] text-center text-[11px] font-medium text-muted-foreground">
                            {cur + 1}/{nVersions}
                          </span>
                          <button
                            type="button"
                            title={t("meal.nextVersion")}
                            onClick={() => goToVersion(i, cur + 1)}
                            disabled={cur === nVersions - 1 || regenIndex !== null}
                            className="flex h-6 w-5 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                      <button
                        type="button"
                        title={t("meal.regenerate")}
                        onClick={() => regenMeal(i)}
                        disabled={regenIndex !== null}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-primary/40 text-primary transition-colors hover:bg-primary-50 disabled:opacity-40"
                      >
                        {isRegen ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                  <ul className={cn("grid gap-1 text-xs text-muted-foreground sm:grid-cols-2", isRegen && "opacity-40")}>
                    {repas.ingredients.map((ing, j) => (
                      <li key={j} className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5">
                          {ing.nom}
                          {ing.preparation && (
                            <span className="rounded-full bg-secondary-50 px-1.5 py-0.5 text-[10px] font-medium text-secondary-700">
                              {ing.preparation}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 font-medium text-foreground">{ing.quantite}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* Colonne droite : chat conversationnel pour ce jour */}
          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Wand2 className="h-4 w-4 text-primary" />
                {t("chat.discussTitle")} {plan.jour}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-2">
              <div
                ref={scrollRef}
                className="min-h-[180px] max-h-[340px] flex-1 space-y-2 overflow-y-auto rounded-md border border-border bg-muted/20 p-3"
              >
                {messages.length === 0 && (
                  <div className="flex flex-col items-center gap-2 py-4 text-center text-muted-foreground">
                    <Sparkles className="h-5 w-5 text-primary/40" />
                    <p className="text-xs">{t("chat.discussEmpty")}</p>
                    <div className="mt-1 flex flex-wrap justify-center gap-1">
                      {suggestions.map((s, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setInput(s)}
                          className="rounded-full border border-primary/30 bg-primary-50 px-2 py-0.5 text-[11px] text-primary-700 hover:bg-primary-100"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={cn("flex flex-col gap-1", m.role === "user" ? "items-end" : "items-start")}>
                    <div className={cn("flex gap-2 text-sm", m.role === "user" ? "flex-row-reverse" : "")}>
                      {m.role === "assistant" ? <Bot className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> : <User className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
                      <span className={cn("max-w-[240px] rounded-lg px-3 py-2 text-xs leading-relaxed", m.role === "user" ? "bg-primary text-white" : "bg-white text-foreground shadow-sm")}>
                        {m.text}
                      </span>
                    </div>
                    {/* Bouton Appliquer si l'IA a joint une proposition */}
                    {m.role === "assistant" && m.proposition && (
                      <div className="ms-6 mt-1">
                        {m.applied ? (
                          <Badge variant="success" className="flex items-center gap-1 text-[11px]">
                            <Check className="h-3 w-3" />{t("chat.applied")}
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => apply(i, m.proposition!)}
                            className="h-7 gap-1 text-[11px]"
                          >
                            <Check className="h-3.5 w-3.5" />{t("chat.apply")} ({m.proposition.caloriesTotales} kcal)
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t("chat.thinking")}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder={t("chat.discussPlaceholder")}
                  disabled={loading}
                  className="h-9 flex-1 rounded-md border border-border bg-white px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
                <Button size="sm" onClick={send} disabled={loading || !input.trim()}>
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
