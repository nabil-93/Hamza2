"use client";

import * as React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
  pdf,
} from "@react-pdf/renderer";
import type { PatientForm, CalculationResult, GeneratedProgram, Locale, Macros } from "@/types";
import { getReportLabels, type ReportLabels } from "./labels";
import { macroPercents } from "@/lib/utils";

const C = { primary: "#0F4C81", secondary: "#2E8B57", amber: "#F59E0B", muted: "#64748B", border: "#E5E7EB", bg: "#F8FAFC" };

function pdfText(value: unknown): string {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/[\u200b-\u200d\ufeff]/g, "")
    .replace(/[\ufe0e\ufe0f]/g, "")
    .replace(/[\u2012-\u2015]/g, "-")
    .replace(/\u2192/g, "->")
    .replace(/\u2190/g, "<-")
    .replace(/\u2265/g, ">=")
    .replace(/\u2264/g, "<=")
    .replace(/\u2248/g, "~")
    .replace(/\u00b7/g, "-")
    .replace(/\u2022/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u{1f000}-\u{1faff}]/gu, "");
}

function pdfNode(node: React.ReactNode): React.ReactNode {
  if (typeof node === "string" || typeof node === "number") return pdfText(node);
  if (Array.isArray(node)) return node.map((child) => pdfNode(child));
  return node;
}

/**
 * Polices du PDF.
 *
 * ROOT CAUSE de « can't access property "unitsPerEm", lastFont is undefined » :
 * dans @react-pdf/textkit (fontSubstitution → pickFontFromFontStack), la police
 * standard Helvetica est ajoutée comme fallback mais ne fournit pas de données
 * de police dans le renderer navigateur. Si le glyphe manque aussi dans nos TTF
 * (ex: Inter sans →, Cairo subset sans chiffres latins), le fallback devient
 * `undefined`, puis `font.unitsPerEm` plante.
 *
 * CORRECTIF : on enregistre des TTF réels, on attend leur chargement, on utilise
 * Inter en fallback de Cairo pour les chiffres/unités, et on normalise les
 * symboles non couverts avant de rendre le PDF.
 */
const FONT_SOURCES = {
  Inter: { regular: "Inter-Regular.ttf", bold: "Inter-Bold.ttf" },
  Cairo: { regular: "Cairo-Regular.ttf", bold: "Cairo-Bold.ttf" },
} as const;

let fontsReady = false;

async function ensureFonts(): Promise<void> {
  if (fontsReady) return;

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  // 1) Enregistrement (idempotent côté @react-pdf).
  (Object.keys(FONT_SOURCES) as (keyof typeof FONT_SOURCES)[]).forEach((family) => {
    Font.register({
      family,
      fonts: [
        { src: `${origin}/fonts/${FONT_SOURCES[family].regular}`, fontWeight: 400 },
        { src: `${origin}/fonts/${FONT_SOURCES[family].bold}`, fontWeight: 700 },
      ],
    });
  });

  // Pas de césure agressive (préserve les mots, notamment en arabe).
  Font.registerHyphenationCallback((word) => [word]);

  // 2) Chargement RÉEL des binaires avant le rendu. On attend chaque variante
  //    exactement comme elle sera demandée au rendu (poids 400 et 700).
  const loads: Promise<void>[] = [];
  (Object.keys(FONT_SOURCES) as (keyof typeof FONT_SOURCES)[]).forEach((family) => {
    loads.push(Font.load({ fontFamily: family, fontWeight: 400 }));
    loads.push(Font.load({ fontFamily: family, fontWeight: 700 }));
  });

  const results = await Promise.allSettled(loads);
  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length > 0) {
    // Un échec de chargement → pile de polices vide au rendu → crash garanti.
    // On préfère échouer explicitement plutôt que produire un PDF cassé.
    fontsReady = false;
    throw new Error(
      `PDF_FONT_LOAD_FAILED: ${failed.length}/${loads.length} police(s) non chargée(s). ` +
        `Vérifiez que les fichiers existent dans /public/fonts.`,
    );
  }

  fontsReady = true;
}

function makeStyles(rtl: boolean) {
  const fontFamily: string | string[] = rtl ? ["Cairo", "Inter"] : "Inter";
  const fontBold = fontFamily;
  const dir = rtl ? "row-reverse" : "row";
  const textAlign = rtl ? "right" : "left";

  return StyleSheet.create({
    page: { paddingTop: 40, paddingBottom: 56, paddingHorizontal: 40, fontSize: 10, color: "#0F172A", fontFamily, textAlign },
    cover: { flexDirection: "column", alignItems: "center", justifyContent: "center", height: "85%" },
    clinicName: { fontSize: 16, color: C.secondary, fontFamily: fontBold, fontWeight: "bold", marginBottom: 8, textAlign: "center" },
    coverTitle: { fontSize: 24, color: C.primary, fontFamily: fontBold, fontWeight: "bold", textAlign: "center", marginBottom: 10 },
    coverName: { fontSize: 16, marginTop: 6, textAlign: "center" },
    logo: { width: 110, height: 60, objectFit: "contain", marginBottom: 16 },
    h1: { fontSize: 14, color: C.primary, fontFamily: fontBold, fontWeight: "bold", marginTop: 14, marginBottom: 6, borderBottom: `1px solid ${C.border}`, paddingBottom: 3, textAlign },
    h3: { fontSize: 11, fontFamily: fontBold, fontWeight: "bold", color: C.secondary, marginTop: 8, marginBottom: 3, textAlign },
    para: { marginBottom: 4, lineHeight: 1.5, textAlign },
    row: { flexDirection: dir, justifyContent: "space-between", paddingVertical: 2, borderBottom: `0.5px solid ${C.border}` },
    cellK: { color: C.muted, fontFamily: fontBold, fontWeight: "bold", width: "45%", textAlign },
    cellV: { width: "55%", textAlign: rtl ? "left" : "right" },
    bullet: { flexDirection: dir, marginBottom: 2, paddingHorizontal: 8 },
    bulletDot: { width: 10, color: C.secondary, textAlign },
    footer: { position: "absolute", bottom: 24, left: 40, right: 40, flexDirection: dir, justifyContent: "space-between", fontSize: 8, color: C.muted, borderTop: `0.5px solid ${C.border}`, paddingTop: 6, fontFamily },
    sig: { flexDirection: dir, justifyContent: "space-between", marginTop: 30 },
    sigImg: { width: 90, height: 50, objectFit: "contain" },
    sigLabel: { color: C.muted, textAlign },
  });
}

interface ReportData {
  form: PatientForm;
  calc: CalculationResult;
  program: GeneratedProgram;
  locale: Locale;
}

type Styles = ReturnType<typeof makeStyles>;

function KV({ k, v, s }: { k: string; v: string; s: Styles }) {
  return (
    <View style={s.row}>
      <Text style={s.cellK}>{pdfText(k)}</Text>
      <Text style={s.cellV}>{pdfText(v)}</Text>
    </View>
  );
}

/**
 * N'autorise que les images data-URL PNG/JPEG (formats supportés par @react-pdf).
 * Tout autre format (SVG, WEBP, URL distante…) ferait planter le rendu PDF.
 */
function safeImageSrc(src?: string): string | undefined {
  if (!src) return undefined;
  if (/^data:image\/(png|jpe?g);base64,/i.test(src)) return src;
  return undefined;
}

function Bullet({ children, s }: { children: React.ReactNode; s: Styles }) {
  return (
    <View style={s.bullet}>
      <Text style={s.bulletDot}>-</Text>
      <Text style={{ flex: 1 }}>{pdfNode(children)}</Text>
    </View>
  );
}

/**
 * Macronutriments — barre empilée + légende, en View pures (pas de SVG).
 * On évite totalement <Svg> car il déclenche « lastFont is undefined »
 * dans cette version de @react-pdf lors du calcul de mise en page.
 */
function MacrosDonut({ macros, labels }: { macros: Macros; labels: { p: string; g: string; l: string } }) {
  const pct = macroPercents(macros);
  const segs = [
    { v: macros.proteines, p: pct.proteines, color: C.primary, label: labels.p },
    { v: macros.glucides, p: pct.glucides, color: C.secondary, label: labels.g },
    { v: macros.lipides, p: pct.lipides, color: C.amber, label: labels.l },
  ];
  return (
    <View style={{ width: 180 }}>
      <View style={{ flexDirection: "row", height: 18, borderRadius: 4, overflow: "hidden" }}>
        {segs.map((seg, i) => (
          <View key={i} style={{ width: `${seg.p}%`, backgroundColor: seg.color }} />
        ))}
      </View>
      <View style={{ marginTop: 6 }}>
        {segs.map((seg, i) => (
          <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: seg.color, marginRight: 4 }} />
              <Text style={{ fontSize: 9 }}>{pdfText(seg.label)}</Text>
            </View>
            <Text style={{ fontSize: 9, fontWeight: "bold" }}>{seg.v} g · {seg.p} %</Text>
          </View>
        ))}
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 2, borderTop: `0.5px solid ${C.border}`, paddingTop: 2 }}>
          <Text style={{ fontSize: 9, fontWeight: "bold" }}>Total</Text>
          <Text style={{ fontSize: 9, fontWeight: "bold" }}>{pct.kcal} kcal</Text>
        </View>
      </View>
    </View>
  );
}

/** Barres de projection de poids — View pures (barres = blocs colorés, pas de SVG). */
function ProjectionBars({ points, actuel }: { points: { mois: number; poids: number }[]; actuel: string }) {
  if (points.length === 0) return null;
  const max = Math.max(...points.map((p) => p.poids));
  const min = Math.min(...points.map((p) => p.poids));
  const range = Math.max(1, max - min);
  const h = 90;
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
      {points.map((p, i) => {
        const bh = 18 + ((p.poids - min) / range) * (h - 22);
        return (
          <View key={i} style={{ width: 44, alignItems: "center" }}>
            <Text style={{ fontSize: 8, color: C.primary, fontWeight: "bold", marginBottom: 2 }}>{p.poids}</Text>
            <View style={{ width: 24, height: bh, backgroundColor: C.primary, borderTopLeftRadius: 3, borderTopRightRadius: 3 }} />
            <Text style={{ fontSize: 7, color: C.muted, marginTop: 2 }}>
              {pdfText(p.mois === 0 ? actuel : `${p.mois}m`)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function Footer({ form, L, s }: { form: PatientForm; L: ReportLabels; s: Styles }) {
  return (
    <View style={s.footer} fixed>
      <Text>{pdfText(form.branding.nomCabinet || L.reportFooter)}</Text>
      <Text render={({ pageNumber, totalPages }) => pdfText(`${L.page} ${pageNumber} / ${totalPages}`)} />
    </View>
  );
}

export function ReportPdf({ form, calc, program, locale }: ReportData) {
  const rtl = locale === "ar";
  const L = getReportLabels(locale);
  const s = makeStyles(rtl);
  const plans = program.nutrition.plans;
  // Macros moyennes sur la durée pour le graphe.
  const macrosMoy = {
    proteines: Math.round(plans.reduce((a, p) => a + p.macros.proteines, 0) / plans.length),
    glucides: Math.round(plans.reduce((a, p) => a + p.macros.glucides, 0) / plans.length),
    lipides: Math.round(plans.reduce((a, p) => a + p.macros.lipides, 0) / plans.length),
  };

  return (
    <Document>
      {/* Cover */}
      <Page size="A4" style={s.page}>
        <View style={s.cover}>
          {safeImageSrc(form.branding.logo) && <Image src={safeImageSrc(form.branding.logo)!} style={s.logo} />}
          {form.branding.nomCabinet && <Text style={s.clinicName}>{pdfText(form.branding.nomCabinet)}</Text>}
          <Text style={s.coverTitle}>{pdfText(L.coverTitle)}</Text>
          <Text style={s.coverName}>{pdfText(`${form.prenom} ${form.nom}`)}</Text>
          <Text style={{ color: C.muted, marginTop: 4, textAlign: "center" }}>{pdfText(`${calc.age} ${L.years} - ${L.bmi} ${calc.imc}`)}</Text>
        </View>
        <Footer form={form} L={L} s={s} />
      </Page>

      {/* Content */}
      <Page size="A4" style={s.page} wrap>
        <Text style={s.h1}>{pdfText(L.s1)}</Text>
        <KV s={s} k={L.fullName} v={`${form.prenom} ${form.nom}`} />
        <KV s={s} k={L.age} v={`${calc.age} ${L.years}`} />
        <KV s={s} k={L.sex} v={form.sexe} />
        <KV s={s} k={L.height} v={`${form.taille} cm`} />
        <KV s={s} k={L.weightCurrentTarget} v={`${form.poidsActuel} kg -> ${form.poidsCible} kg`} />

        <Text style={s.h1}>{pdfText(L.s2)}</Text>
        <KV s={s} k={L.bmi} v={`${calc.imc} (${calc.imcCategorie})`} />
        <KV s={s} k={L.bmr} v={`${calc.bmr} kcal`} />
        <KV s={s} k={L.tdee} v={`${calc.tdee} kcal`} />
        <KV s={s} k={L.targetCalories} v={`${calc.caloriesObjectif} kcal`} />
        <KV s={s} k={L.hydration} v={`${calc.besoinHydrique} L`} />

        {/* Graphiques : projection de poids + macronutriments */}
        <View style={{ flexDirection: rtl ? "row-reverse" : "row", justifyContent: "space-around", marginTop: 12 }} wrap={false}>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 9, color: C.muted, marginBottom: 4 }}>
              {pdfText(rtl ? "توقع الوزن (كغ)" : "Projection de poids (kg)")}
            </Text>
            <ProjectionBars points={calc.projection} actuel={pdfText(rtl ? "الآن" : "Act.")} />
          </View>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 9, color: C.muted, marginBottom: 4 }}>
              {pdfText(rtl ? "توزيع المغذيات" : "Macronutriments")}
            </Text>
            <MacrosDonut
              macros={macrosMoy}
              labels={{
                p: pdfText(rtl ? "بروتين" : "Prot."),
                g: pdfText(rtl ? "كربوهيدرات" : "Gluc."),
                l: pdfText(rtl ? "دهون" : "Lip."),
              }}
            />
          </View>
        </View>

        <Text style={s.h1}>{pdfText(L.s3)}</Text>
        <Text style={s.para}>{pdfText(program.analyse.resumeProfil)}</Text>
        <Text style={s.h3}>{pdfText(L.weightRisks)}</Text>
        <Text style={s.para}>{pdfText(program.analyse.risquesPoids)}</Text>
        <Text style={s.h3}>{pdfText(L.diabetes)}</Text>
        <Text style={s.para}>{pdfText(program.analyse.analyseDiabete)}</Text>
        <Text style={s.h3}>{pdfText(L.nutrition)}</Text>
        <Text style={s.para}>{pdfText(program.analyse.analyseNutritionnelle)}</Text>

        <Text style={s.h1}>{pdfText(L.s4)}</Text>
        {plans.map((plan, d) => (
          <View key={d}>
            <Text style={s.h3}>{pdfText(`${plan.jour} — ${plan.caloriesTotales} kcal`)}</Text>
            {plan.repas.map((r, i) => (
              <View key={i} wrap={false}>
                <Text style={{ ...s.para, fontWeight: "bold" }}>{pdfText(`${r.type} - ${r.nom} (${r.calories} kcal)`)}</Text>
                {r.ingredients.map((ing, j) => <Bullet s={s} key={j}>{ing.nom} : {ing.quantite}</Bullet>)}
              </View>
            ))}
          </View>
        ))}

        <Text style={s.h1} break>{pdfText(L.s5)}</Text>
        {program.nutrition.recettes.map((rec, i) => (
          <View key={i} wrap={false}>
            <Text style={s.h3}>{pdfText(`${rec.nom} - ${rec.calories} kcal - ${rec.tempsCuisson}`)}</Text>
            {rec.ingredients.map((ing, j) => <Bullet s={s} key={j}>{ing.nom} : {ing.quantite}</Bullet>)}
            {rec.etapes.map((e, j) => <Text key={j} style={s.para}>{pdfText(`${j + 1}. ${e}`)}</Text>)}
          </View>
        ))}

        <Text style={s.h1} break>{pdfText(L.s6)}</Text>
        {program.nutrition.listeCourses.map((cat, i) => (
          <View key={i} wrap={false}>
            <Text style={s.h3}>{pdfText(cat.categorie)}</Text>
            {cat.items.map((it, j) => <KV s={s} key={j} k={it.nom} v={it.quantite} />)}
          </View>
        ))}

        <Text style={s.h1} break>{pdfText(L.s7)}</Text>
        {program.sport.semaines.map((sem) => (
          <View key={sem.semaine}>
            <Text style={s.h3}>{pdfText(`${L.week} ${sem.semaine} - ${sem.objectif}`)}</Text>
            {sem.jours.map((jour, i) => (
              <View key={i} wrap={false} style={{ marginBottom: 4 }}>
                <Text style={{ fontWeight: "bold", textAlign: rtl ? "right" : "left" }}>{pdfText(`${jour.jour} - ${jour.focus}`)}</Text>
                <Text style={s.para}>{pdfText(`${L.warmup} : ${jour.echauffement}${jour.cardio ? ` | ${L.cardio} : ${jour.cardio}` : ""}`)}</Text>
                {jour.exercices.map((ex, j) => (
                  <Bullet s={s} key={j}>{ex.nom} - {[ex.series && `${ex.series} ${L.series}`, ex.repetitions, ex.duree].filter(Boolean).join(", ")}</Bullet>
                ))}
              </View>
            ))}
          </View>
        ))}

        <Text style={s.h1} break>{pdfText(L.s8)}</Text>
        {program.analyse.recommandationsGenerales.map((r, i) => <Bullet s={s} key={i}>{r}</Bullet>)}

        <View style={s.sig}>
          <View>
            <Text style={s.sigLabel}>{pdfText(L.stamp)}</Text>
            {safeImageSrc(form.branding.cachet) && <Image src={safeImageSrc(form.branding.cachet)!} style={s.sigImg} />}
          </View>
          <View style={{ alignItems: rtl ? "flex-start" : "flex-end" }}>
            <Text style={s.sigLabel}>{pdfText(form.branding.nomMedecin ? `${L.doctorPrefix} ${form.branding.nomMedecin}` : L.signature)}</Text>
            {safeImageSrc(form.branding.signature) && <Image src={safeImageSrc(form.branding.signature)!} style={s.sigImg} />}
          </View>
        </View>

        <Footer form={form} L={L} s={s} />
      </Page>
    </Document>
  );
}

export async function buildPdfBlob(data: ReportData): Promise<Blob> {
  // Les polices DOIVENT être chargées avant le rendu, sinon la pile de polices
  // est vide et @react-pdf plante (« lastFont is undefined »).
  try {
    await ensureFonts();
  } catch (err) {
    console.error("[PDF] Échec du chargement des polices :", err);
    throw new Error(
      "Impossible de charger les polices du PDF. Réessayez ; si le problème persiste, vérifiez le dossier /public/fonts.",
    );
  }

  try {
    return await pdf(<ReportPdf {...data} />).toBlob();
  } catch (err) {
    console.error("[PDF] Échec du rendu du document :", err);
    throw err instanceof Error ? err : new Error("Échec du rendu PDF.");
  }
}
