"use client";

import * as React from "react";
import { Sparkles, Send, Loader2, Bot, User, Wand2, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/locales";
import { modifyDay } from "@/lib/ai/client";
import { cn } from "@/lib/utils";
import type { DailyMealPlan, PatientForm, Locale } from "@/types";

interface ChatMsg {
  role: "user" | "assistant";
  text: string;
}

interface Props {
  plan: DailyMealPlan;
  form: PatientForm;
  locale: Locale;
  /** Index dans weeklyPlans — pour onUpdateDay */
  dayIndex: number;
  onUpdateDay: (index: number, day: DailyMealPlan) => void;
  /** Si true, le panel est le jour actif (développé) */
  isActive: boolean;
  onActivate: () => void;
}

export function DayPanel({ plan, form, locale, dayIndex, onUpdateDay, isActive, onActivate }: Props) {
  const { t } = useI18n();
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [messages, setMessages] = React.useState<ChatMsg[]>([]);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const instruction = input.trim();
    if (!instruction || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: instruction }]);
    setLoading(true);
    try {
      const updated = await modifyDay(dayIndex, plan, instruction, locale, form);
      onUpdateDay(dayIndex, updated);
      const summary = `✅ ${plan.jour} mis à jour — ${updated.caloriesTotales} kcal (P ${updated.macros.proteines}g · G ${updated.macros.glucides}g · L ${updated.macros.lipides}g)`;
      setMessages((m) => [...m, { role: "assistant", text: summary }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setMessages((m) => [...m, { role: "assistant", text: `❌ Erreur : ${msg}` }]);
    } finally {
      setLoading(false);
    }
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
            {plan.repas.map((repas, i) => (
              <div key={i} className="rounded-lg border border-border bg-white p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold">
                    <span className="text-primary">{repas.type}</span>
                    <span className="mx-1 text-muted-foreground">—</span>
                    {repas.nom}
                  </p>
                  <Badge variant="neutral">{repas.calories} kcal</Badge>
                </div>
                <ul className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
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
            ))}
          </div>

          {/* Colonne droite : chat IA pour ce jour */}
          <Card className="flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Wand2 className="h-4 w-4 text-primary" />
                Modifier {plan.jour}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-2">
              <div
                ref={scrollRef}
                className="min-h-[140px] flex-1 space-y-2 overflow-y-auto rounded-md border border-border bg-muted/20 p-3"
              >
                {messages.length === 0 && (
                  <div className="flex flex-col items-center gap-2 py-4 text-center text-muted-foreground">
                    <Sparkles className="h-5 w-5 text-primary/40" />
                    <p className="text-xs">{t("chat.empty")}</p>
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
                  <div key={i} className={cn("flex gap-2 text-sm", m.role === "user" ? "justify-end" : "justify-start")}>
                    {m.role === "assistant" && <Bot className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
                    <span className={cn("max-w-[85%] rounded-lg px-3 py-2 text-xs", m.role === "user" ? "bg-primary text-white" : "bg-white text-foreground shadow-sm")}>
                      {m.text}
                    </span>
                    {m.role === "user" && <User className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
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
                  placeholder={t("chat.placeholder")}
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
