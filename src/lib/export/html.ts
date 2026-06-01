import type { PatientForm, CalculationResult, GeneratedProgram, Locale, Macros } from "@/types";
import { getReportLabels } from "./labels";

const C = { primary: "#0F4C81", secondary: "#2E8B57", amber: "#F59E0B", muted: "#64748B", border: "#E5E7EB", bg: "#F8FAFC" };

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Donut SVG des macronutriments (sans dépendance JS). */
function macrosDonut(m: Macros, labels: { p: string; g: string; l: string }): string {
  const total = Math.max(1, m.proteines + m.glucides + m.lipides);
  const segs = [
    { v: m.proteines, color: C.primary, label: labels.p },
    { v: m.glucides, color: C.secondary, label: labels.g },
    { v: m.lipides, color: C.amber, label: labels.l },
  ];
  const r = 60;
  const cx = 80;
  const cy = 80;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const circles = segs
    .map((s) => {
      const frac = s.v / total;
      const dash = frac * circ;
      const el = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${s.color}" stroke-width="22" stroke-dasharray="${dash} ${circ - dash}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})" />`;
      offset += dash;
      return el;
    })
    .join("");
  const legend = segs
    .map(
      (s) =>
        `<span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;margin:0 8px"><span style="width:10px;height:10px;border-radius:50%;background:${s.color};display:inline-block"></span>${esc(s.label)} ${s.v}g</span>`,
    )
    .join("");
  return `<div style="text-align:center"><svg width="160" height="160" viewBox="0 0 160 160">${circles}</svg><div style="margin-top:8px">${legend}</div></div>`;
}

/** Barres SVG de la projection de poids. */
function projectionBars(points: { mois: number; poids: number }[], unitKg: string, actuelLabel: string): string {
  if (points.length === 0) return "";
  const max = Math.max(...points.map((p) => p.poids));
  const min = Math.min(...points.map((p) => p.poids));
  const range = Math.max(1, max - min);
  const bars = points
    .map((p) => {
      const h = 30 + ((p.poids - min) / range) * 90;
      const name = p.mois === 0 ? actuelLabel : `${p.mois}m`;
      return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1">
        <span style="font-size:12px;font-weight:600;color:${C.primary}">${p.poids}</span>
        <div style="width:70%;height:${h}px;background:linear-gradient(${C.primary},${C.secondary});border-radius:6px 6px 0 0"></div>
        <span style="font-size:10px;color:${C.muted}">${esc(name)}</span>
      </div>`;
    })
    .join("");
  return `<div style="display:flex;align-items:flex-end;gap:8px;height:160px;padding:8px 0">${bars}</div><p style="font-size:10px;color:${C.muted};text-align:center">${esc(unitKg)}</p>`;
}

interface ReportData {
  form: PatientForm;
  calc: CalculationResult;
  program: GeneratedProgram;
  locale: Locale;
}

/**
 * Génère un document HTML autonome, éditable (contenteditable) et imprimable
 * en PDF depuis le navigateur, reproduisant l'aperçu (cartes, graphes, tableaux).
 */
export function buildHtml({ form, calc, program, locale }: ReportData): string {
  const L = getReportLabels(locale);
  const rtl = locale === "ar";
  const dir = rtl ? "rtl" : "ltr";
  const fontFamily = rtl
    ? "'Cairo','Segoe UI',Tahoma,sans-serif"
    : "'Inter','Segoe UI',Arial,sans-serif";

  const stat = (label: string, value: string) =>
    `<div style="border:1px solid ${C.border};border-radius:10px;padding:14px;background:#fff">
      <div style="font-size:11px;text-transform:uppercase;color:${C.muted};letter-spacing:.5px">${esc(label)}</div>
      <div style="font-size:22px;font-weight:700;margin-top:6px">${esc(value)}</div>
    </div>`;

  const meal = (m: GeneratedProgram["nutrition"]["plan"]["repas"][number]) =>
    `<div style="border:1px solid ${C.border};border-radius:8px;padding:12px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <strong><span style="color:${C.primary}">${esc(m.type)}</span> — ${esc(m.nom)}</strong>
        <span style="background:${C.secondary}1a;color:${C.secondary};border-radius:999px;padding:2px 10px;font-size:12px;font-weight:600">${m.calories} kcal</span>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        ${m.ingredients
          .map(
            (i) =>
              `<tr><td style="padding:3px 0;color:${C.muted}">${esc(i.nom)}</td><td style="padding:3px 0;text-align:${rtl ? "left" : "right"};font-weight:600">${esc(i.quantite)}</td></tr>`,
          )
          .join("")}
      </table>
    </div>`;

  const recipe = (r: GeneratedProgram["nutrition"]["recettes"][number]) =>
    `<div style="border:1px solid ${C.border};border-radius:8px;padding:14px;margin-bottom:10px">
      <h4 style="margin:0 0 6px;color:${C.secondary}">${esc(r.nom)} <span style="font-weight:400;color:${C.muted};font-size:13px">(${r.calories} kcal · ${esc(r.tempsCuisson)})</span></h4>
      <div style="font-size:11px;color:${C.muted};margin-bottom:6px">P ${r.macros.proteines}g · G ${r.macros.glucides}g · L ${r.macros.lipides}g</div>
      <strong style="font-size:12px">${esc(L.ingredients)}</strong>
      <ul style="margin:4px 0 8px;padding-${rtl ? "right" : "left"}:18px;font-size:13px">${r.ingredients.map((i) => `<li>${esc(i.nom)} : ${esc(i.quantite)}</li>`).join("")}</ul>
      <strong style="font-size:12px">${esc(L.preparation)}</strong>
      <ol style="margin:4px 0;padding-${rtl ? "right" : "left"}:18px;font-size:13px">${r.etapes.map((e) => `<li>${esc(e)}</li>`).join("")}</ol>
    </div>`;

  const shoppingCat = (cat: GeneratedProgram["nutrition"]["listeCourses"][number]) =>
    `<div style="border:1px solid ${C.border};border-radius:8px;padding:12px">
      <h4 style="margin:0 0 8px;color:${C.primary}">${esc(cat.categorie)}</h4>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        ${cat.items.map((i) => `<tr><td style="padding:3px 0;border-bottom:1px dashed ${C.border}">${esc(i.nom)}</td><td style="padding:3px 0;border-bottom:1px dashed ${C.border};text-align:${rtl ? "left" : "right"};font-weight:600;color:${C.secondary}">${esc(i.quantite)}</td></tr>`).join("")}
      </table>
    </div>`;

  const week = (w: GeneratedProgram["sport"]["semaines"][number]) =>
    `<div style="border:1px solid ${C.border};border-radius:8px;padding:14px;margin-bottom:10px">
      <h4 style="margin:0 0 8px;color:${C.primary}">${esc(L.week)} ${w.semaine} — ${esc(w.objectif)}</h4>
      ${w.jours
        .map(
          (j) =>
            `<div style="margin-bottom:8px;padding:8px;background:${C.bg};border-radius:6px">
              <strong>${esc(j.jour)} · <span style="color:${C.secondary}">${esc(j.focus)}</span></strong>
              <div style="font-size:12px;color:${C.muted};margin:4px 0">${esc(L.warmup)}: ${esc(j.echauffement)}${j.cardio ? ` | ${esc(L.cardio)}: ${esc(j.cardio)}` : ""}</div>
              <ul style="margin:0;padding-${rtl ? "right" : "left"}:18px;font-size:13px">${j.exercices.map((ex) => `<li>${esc(ex.nom)} — ${[ex.series && `${ex.series} ${L.series}`, ex.repetitions, ex.duree].filter(Boolean).join(", ")}</li>`).join("")}</ul>
            </div>`,
        )
        .join("")}
    </div>`;

  const a = program.analyse;
  const macros = program.nutrition.plan.macros;

  return `<!DOCTYPE html>
<html lang="${locale}" dir="${dir}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(L.reportTitle)} — ${esc(form.prenom)} ${esc(form.nom)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: ${fontFamily}; color:#0F172A; background:${C.bg}; margin:0; padding:0; }
  .toolbar { position:sticky; top:0; background:#fff; border-bottom:1px solid ${C.border}; padding:10px 24px; display:flex; gap:10px; justify-content:flex-end; z-index:10; }
  .toolbar button { background:${C.primary}; color:#fff; border:none; border-radius:8px; padding:10px 18px; font-size:14px; font-weight:600; cursor:pointer; font-family:inherit; }
  .toolbar .hint { margin-${rtl ? "left" : "right"}:auto; color:${C.muted}; font-size:13px; align-self:center; }
  .page { max-width:900px; margin:0 auto; padding:32px 24px 80px; }
  .cover { text-align:center; padding:40px 0; border-bottom:3px solid ${C.primary}; margin-bottom:24px; }
  .cover h1 { color:${C.primary}; margin:8px 0; }
  .cover .clinic { color:${C.secondary}; font-weight:700; font-size:18px; }
  h2 { color:${C.primary}; border-bottom:1px solid ${C.border}; padding-bottom:6px; margin-top:28px; }
  .grid4 { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
  .grid2 { display:grid; grid-template-columns:repeat(2,1fr); gap:16px; }
  .card { border:1px solid ${C.border}; border-radius:10px; padding:16px; background:#fff; }
  [contenteditable]:focus { outline:2px solid ${C.primary}33; border-radius:4px; }
  @page { size: A4; margin: 14mm 12mm; }
  @media print {
    .toolbar { display:none !important; }
    html, body { background:#fff !important; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .page { max-width:100%; padding:0; margin:0; }
    h2 { page-break-after:avoid; }
    .card, .meal { page-break-inside:avoid; }
    img { page-break-inside:avoid; }
  }
  @media(max-width:640px){ .grid4{grid-template-columns:repeat(2,1fr)} .grid2{grid-template-columns:1fr} }
</style>
</head>
<body>
  <div class="toolbar">
    <span class="hint">${rtl ? "✏️ هذا المستند قابل للتعديل — اضغط داخل النص لتعديله، ثم احفظ PDF باختيار «حفظ بصيغة PDF» في نافذة الطباعة." : "✏️ Document modifiable — cliquez dans le texte pour l'éditer, puis enregistrez en PDF via « Enregistrer au format PDF » dans la fenêtre d'impression."}</span>
    <button onclick="window.print()">${rtl ? "🖨️ طباعة / حفظ PDF" : "🖨️ Imprimer / Enregistrer en PDF"}</button>
  </div>
  <div class="page" contenteditable="true">
    <div class="cover">
      ${form.branding.logo ? `<img src="${form.branding.logo}" style="max-height:70px" alt="logo"/>` : ""}
      ${form.branding.nomCabinet ? `<div class="clinic">${esc(form.branding.nomCabinet)}</div>` : ""}
      <h1>${esc(L.reportTitle)}</h1>
      <div style="font-size:18px">${esc(form.prenom)} ${esc(form.nom)}</div>
      <div style="color:${C.muted};margin-top:4px">${calc.age} ${esc(L.years)} · ${esc(L.bmi)} ${calc.imc}</div>
    </div>

    <h2>${esc(L.s2)}</h2>
    <div class="grid4">
      ${stat(L.bmi, `${calc.imc}`)}
      ${stat(L.bmr, `${calc.bmr} kcal`)}
      ${stat(L.tdee, `${calc.tdee} kcal`)}
      ${stat(L.targetCalories, `${calc.caloriesObjectif} kcal`)}
    </div>
    <div class="grid2" style="margin-top:16px">
      <div class="card"><h4 style="margin-top:0">${esc(rtl ? "توقع الوزن" : "Projection de poids")}</h4>${projectionBars(calc.projection, "kg", rtl ? "الآن" : "Actuel")}</div>
      <div class="card"><h4 style="margin-top:0">${esc(rtl ? "توزيع المغذيات" : "Macronutriments")}</h4>${macrosDonut(macros, { p: rtl ? "بروتين" : "Protéines", g: rtl ? "كربوهيدرات" : "Glucides", l: rtl ? "دهون" : "Lipides" })}</div>
    </div>

    <h2>${esc(L.s3)}</h2>
    <p>${esc(a.resumeProfil)}</p>
    <div class="grid2">
      <div class="card"><strong>${esc(L.weightRisks)}</strong><p style="margin:6px 0 0;color:${C.muted}">${esc(a.risquesPoids)}</p></div>
      <div class="card"><strong>${esc(L.diabetes)}</strong><p style="margin:6px 0 0;color:${C.muted}">${esc(a.analyseDiabete)}</p></div>
      <div class="card"><strong>${esc(L.nutrition)}</strong><p style="margin:6px 0 0;color:${C.muted}">${esc(a.analyseNutritionnelle)}</p></div>
      <div class="card"><strong>${esc(L.activity)}</strong><p style="margin:6px 0 0;color:${C.muted}">${esc(a.analyseActivite)}</p></div>
    </div>

    <h2>${esc(L.s4)} — ${program.nutrition.plan.caloriesTotales} kcal</h2>
    ${program.nutrition.plan.repas.map(meal).join("")}

    <h2>${esc(L.s5)}</h2>
    ${program.nutrition.recettes.map(recipe).join("")}

    <h2>${esc(L.s6)}</h2>
    <div class="grid2">${program.nutrition.listeCourses.map(shoppingCat).join("")}</div>

    <h2>${esc(L.s7)}</h2>
    <p style="color:${C.muted}">${esc(program.sport.resume)}</p>
    ${program.sport.semaines.map(week).join("")}

    <h2>${esc(L.s8)}</h2>
    <ul>${a.recommandationsGenerales.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>

    <div style="display:flex;justify-content:space-between;margin-top:40px">
      <div><div style="color:${C.muted};font-size:13px">${esc(L.stamp)}</div>${form.branding.cachet ? `<img src="${form.branding.cachet}" style="max-height:60px"/>` : ""}</div>
      <div style="text-align:${rtl ? "left" : "right"}"><div style="color:${C.muted};font-size:13px">${form.branding.nomMedecin ? `${esc(L.doctorPrefix)} ${esc(form.branding.nomMedecin)}` : esc(L.signature)}</div>${form.branding.signature ? `<img src="${form.branding.signature}" style="max-height:60px"/>` : ""}</div>
    </div>
  </div>
</body>
</html>`;
}
