"use client";

import * as React from "react";
import { Sparkles, Send, Loader2, Bot, User, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/locales";
import { modifyDay } from "@/lib/ai/client";
import { cn } from "@/lib/utils";
import type { GeneratedProgram, DailyMealPlan, Locale } from "@/types";

interface Props {
  program: GeneratedProgram;
  locale: Locale;
  /** Appelé quand l'IA renvoie un jour modifié. */
  onUpdateDay: (index: number, day: DailyMealPlan) => void;
}

interface ChatMsg {
  role: "user" | "assistant";
  text: string;
}

export function AIChat({ program, locale, onUpdateDay }: Props) {
  const { t } = useI18n();
  const plans = program.nutrition.plans;
  const [targetIndex, setTargetIndex] = React.useState(0);
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
    const day = plans[targetIndex];
    if (!day) return;

    setInput("");
    setMessages((m) => [...m, { role: "user", text: `[${day.jour}] ${instruction}` }]);
    setLoading(true);
    try {
      const updated = await modifyDay(targetIndex, day, instruction, locale);
      onUpdateDay(targetIndex, updated);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: `${t("chat.updated")} « ${updated.jour} » — ${updated.caloriesTotales} kcal (P ${updated.macros.proteines} / G ${updated.macros.glucides} / L ${updated.macros.lipides} g).`,
        },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setMessages((m) => [...m, { role: "assistant", text: `${t("chat.error")} ${msg}` }]);
    } finally {
      setLoading(false);
    }
  };

  // Suggestions rapides.
  const suggestions = [
    t("chat.sugg1"),
    t("chat.sugg2"),
    t("chat.sugg3"),
  ];

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wand2 className="h-5 w-5 text-primary" />
          {t("chat.title")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{t("chat.subtitle")}</p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        {/* Choix du jour à modifier */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">{t("chat.targetDay")}</label>
          <select
            value={targetIndex}
            onChange={(e) => setTargetIndex(Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {plans.map((p, i) => (
              <option key={i} value={i}>
                {p.jour} ({p.caloriesTotales} kcal)
              </option>
            ))}
          </select>
        </div>

        {/* Historique */}
        <div ref={scrollRef} className="min-h-[160px] flex-1 space-y-2 overflow-y-auto rounded-md border border-border bg-muted/20 p-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-6 text-center text-muted-foreground">
              <Sparkles className="h-6 w-6 text-primary/50" />
              <p className="text-xs">{t("chat.empty")}</p>
              <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setInput(s)}
                    className="rounded-full border border-primary/30 bg-primary-50 px-2.5 py-1 text-[11px] text-primary-700 hover:bg-primary-100"
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
              <span
                className={cn(
                  "max-w-[85%] rounded-lg px-3 py-2",
                  m.role === "user" ? "bg-primary text-white" : "bg-white text-foreground shadow-sm",
                )}
              >
                {m.text}
              </span>
              {m.role === "user" && <User className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("chat.thinking")}
            </div>
          )}
        </div>

        {/* Saisie */}
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={t("chat.placeholder")}
            disabled={loading}
            className="h-11 flex-1 rounded-md border border-border bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <Button onClick={send} disabled={loading || !input.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
