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
    return `⚠️ RÈGLE ABSOLUE DE LANGUE — PRIORITÉ MAXIMALE :
Tu DOIS rédiger TOUTES les valeurs textuelles de ta réponse JSON en ARABE (arabe standard, terminologie médicale et nutritionnelle professionnelle). Cela inclut : noms des plats, des repas, des ingrédients, modes de préparation, résumés, recommandations, et tout texte. NE laisse AUCUN texte en français (sauf unités universelles : g, kg, kcal, L). Les clés JSON restent en anglais/technique. Si tu réponds en français, c'est une ERREUR grave.

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
  const model = envModel && !envModel.startsWith("sk-") ? envModel : "gpt-4o-mini";
  console.log(`[OpenAI] model utilisé: ${model} | langue: ${locale ?? "fr (défaut)"}`);

  const completion = await client.chat.completions.create({
    model,
    temperature,
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
