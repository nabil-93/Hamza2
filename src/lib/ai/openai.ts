import OpenAI from "openai";
import { MEDICAL_SYSTEM_PROMPT } from "./prompts";
import type { Locale } from "@/types";

/**
 * Consigne de langue prioritaire, injectée EN TÊTE du system prompt.
 * Le system prompt médical étant en français, sans cette consigne forte
 * gpt-4o-mini tend à répondre en français même si le user prompt demande l'arabe.
 */
function langDirective(locale?: Locale): string {
  if (locale === "ar") {
    return `⚠️ RÈGLE ABSOLUE DE LANGUE — PRIORITÉ MAXIMALE (FORMAT BILINGUE AR + FR) :
Tu DOIS rédiger TOUTES les valeurs textuelles de ta réponse JSON en ARABE D'ABORD, SUIVI de la traduction française entre parenthèses. Format obligatoire : « النص بالعربية (texte en français) ».
Cela s'applique à TOUT texte : noms des plats, noms des repas, noms des ingrédients, modes de préparation, résumés, analyses, recommandations, consignes sportives, etc.
Exemples obligatoires :
- nom de repas : "فطور متوازن (Petit-déjeuner équilibré)"
- nom de plat : "طاجين دجاج بالخضار (Tajine de poulet aux légumes)"
- ingrédient : "صدر دجاج (Blanc de poulet)"
- préparation : "مشوي (Grillé)" ; "مطهي بالبخار (Cuit à la vapeur)" ; "كامل (Entier)" ; "للتتبيل (Pour l'assaisonnement)"
RÈGLES :
- L'arabe vient TOUJOURS en premier, le français TOUJOURS entre parenthèses juste après.
- N'inverse jamais l'ordre. Ne mets jamais le français seul ni l'arabe seul.
- Les unités (g, kg, kcal, L) et les nombres restent inchangés, hors parenthèses (ex. "صدر دجاج (Blanc de poulet)" avec quantité "150 g").
- Les clés JSON restent en anglais/technique, jamais traduites.
Si tu réponds uniquement en français, ou uniquement en arabe sans la parenthèse française, c'est une ERREUR grave.

`;
  }
  return `RÈGLE DE LANGUE : rédige toutes les valeurs textuelles de la réponse en FRANÇAIS.

`;
}

/**
 * Appel OpenAI avec sortie JSON forcée.
 * La clé est lue côté serveur uniquement (OPENAI_API_KEY).
 *
 * @param userPrompt  Prompt utilisateur.
 * @param systemPrompt System prompt (défaut : médical). Surchargé pour la traduction.
 * @param temperature  Créativité (basse pour la traduction).
 * @param locale       Langue cible imposée au niveau système (défaut : français).
 */
export async function generateJson<T>(
  userPrompt: string,
  systemPrompt: string = MEDICAL_SYSTEM_PROMPT,
  temperature = 0.6,
  locale?: Locale,
): Promise<T> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("MISSING_OPENAI_KEY");
  }

  const client = new OpenAI({ apiKey });
  const envModel = process.env.OPENAI_MODEL;
  const model = envModel && !envModel.startsWith("sk-") ? envModel : "gpt-5.4-mini";
  console.log(`[OpenAI] model utilisé: ${model} | langue: ${locale ?? "fr (défaut)"}`);

  // Les modèles GPT-5.x n'acceptent que la température par défaut (1).
  const isGpt5 = model.startsWith("gpt-5");

  const completion = await client.chat.completions.create({
    model,
    ...(isGpt5 ? {} : { temperature }),
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: langDirective(locale) + systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("EMPTY_AI_RESPONSE");

  return JSON.parse(content) as T;
}
