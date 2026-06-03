import OpenAI from "openai";
import { MEDICAL_SYSTEM_PROMPT } from "./prompts";

/**
 * Appel OpenAI avec sortie JSON forcée.
 * La clé est lue côté serveur uniquement (OPENAI_API_KEY).
 *
 * @param userPrompt  Prompt utilisateur.
 * @param systemPrompt System prompt (défaut : médical). Surchargé pour la traduction.
 * @param temperature  Créativité (basse pour la traduction).
 */
export async function generateJson<T>(
  userPrompt: string,
  systemPrompt: string = MEDICAL_SYSTEM_PROMPT,
  temperature = 0.6,
): Promise<T> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("MISSING_OPENAI_KEY");
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const completion = await client.chat.completions.create({
    model,
    temperature,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("EMPTY_AI_RESPONSE");

  return JSON.parse(content) as T;
}
