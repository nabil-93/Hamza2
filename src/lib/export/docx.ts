import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from "docx";
import type {
  PatientForm,
  CalculationResult,
  GeneratedProgram,
  Locale,
} from "@/types";
import { getReportLabels } from "./labels";
import { macroPercents } from "@/lib/utils";

/**
 * Convertit une data-URL image (PNG/JPEG) en octets pour docx.
 * Retourne null si le format n'est pas exploitable.
 */
function dataUrlToImage(
  src?: string,
): { data: Uint8Array; type: "png" | "jpg" } | null {
  if (!src) return null;
  const match = /^data:image\/(png|jpe?g);base64,(.+)$/i.exec(src);
  if (!match) return null;
  const type = match[1].toLowerCase().startsWith("jp") ? "jpg" : "png";
  try {
    const binary = atob(match[2]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return { data: bytes, type };
  } catch {
    return null;
  }
}

/** Paragraphe contenant une image branding, ou null si image invalide. */
function imageParagraph(
  src: string | undefined,
  width: number,
  height: number,
  alignment: (typeof AlignmentType)[keyof typeof AlignmentType],
): Paragraph | null {
  const img = dataUrlToImage(src);
  if (!img) return null;
  return new Paragraph({
    alignment,
    children: [
      new ImageRun({
        data: img.data,
        type: img.type,
        transformation: { width, height },
      }),
    ],
  });
}

const PRIMARY = "0F4C81";
const SECONDARY = "2E8B57";

interface ReportData {
  form: PatientForm;
  calc: CalculationResult;
  program: GeneratedProgram;
  locale: Locale;
}

/**
 * Fabrique de paragraphes sensible à la direction (RTL pour l'arabe).
 * `bidirectional` + alignement à droite assurent un rendu correct en arabe.
 */
function makeHelpers(rtl: boolean) {
  const align = rtl ? AlignmentType.RIGHT : AlignmentType.LEFT;

  const h = (text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]) =>
    new Paragraph({
      heading: level,
      alignment: align,
      bidirectional: rtl,
      spacing: { before: 240, after: 120 },
      children: [new TextRun({ text, color: PRIMARY, bold: true })],
    });

  const p = (text: string) =>
    new Paragraph({
      alignment: align,
      bidirectional: rtl,
      spacing: { after: 80 },
      children: [new TextRun(text)],
    });

  const bullet = (text: string) =>
    new Paragraph({
      bullet: { level: 0 },
      alignment: align,
      bidirectional: rtl,
      children: [new TextRun(text)],
    });

  const numbered = (text: string) =>
    new Paragraph({
      numbering: { reference: "steps", level: 0 },
      alignment: align,
      bidirectional: rtl,
      children: [new TextRun(text)],
    });

  const kvTable = (rows: [string, string][]): Table =>
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      visuallyRightToLeft: rtl,
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
        left: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
        right: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
      },
      rows: rows.map(
        ([k, v]) =>
          new TableRow({
            children: [
              new TableCell({
                width: { size: 40, type: WidthType.PERCENTAGE },
                shading: { fill: "F1F5F9" },
                children: [
                  new Paragraph({
                    alignment: align,
                    bidirectional: rtl,
                    children: [new TextRun({ text: k, bold: true })],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 60, type: WidthType.PERCENTAGE },
                children: [new Paragraph({ alignment: align, bidirectional: rtl, children: [new TextRun(v)] })],
              }),
            ],
          }),
      ),
    });

  return { h, p, bullet, numbered, kvTable, align };
}

export async function buildDocx({ form, calc, program, locale }: ReportData): Promise<Blob> {
  const L = getReportLabels(locale);
  const rtl = locale === "ar";
  const { h, p, bullet, numbered, kvTable } = makeHelpers(rtl);
  const children: (Paragraph | Table)[] = [];

  // Cover — logo du cabinet
  const logoPar = imageParagraph(form.branding.logo, 120, 64, AlignmentType.CENTER);
  if (logoPar) children.push(logoPar);

  if (form.branding.nomCabinet) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        bidirectional: rtl,
        children: [new TextRun({ text: form.branding.nomCabinet, bold: true, size: 28, color: SECONDARY })],
      }),
    );
  }
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: rtl,
      spacing: { before: 240, after: 120 },
      children: [new TextRun({ text: L.reportTitle, bold: true, size: 40, color: PRIMARY })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      bidirectional: rtl,
      spacing: { after: 360 },
      children: [new TextRun({ text: `${form.prenom} ${form.nom}`, size: 28 })],
    }),
  );

  // 1. Patient
  children.push(h(L.s1, HeadingLevel.HEADING_1));
  children.push(
    kvTable([
      [L.fullName, `${form.prenom} ${form.nom}`],
      [L.age, `${calc.age} ${L.years}`],
      [L.sex, form.sexe],
      [L.height, `${form.taille} cm`],
      [L.weightCurrentTarget, `${form.poidsActuel} kg → ${form.poidsCible} kg`],
    ]),
  );

  // 2. Analyse corporelle
  children.push(h(L.s2, HeadingLevel.HEADING_1));
  children.push(
    kvTable([
      [L.bmi, `${calc.imc} (${calc.imcCategorie})`],
      [L.bmr, `${calc.bmr} kcal`],
      [L.tdee, `${calc.tdee} kcal`],
      [L.targetCalories, `${calc.caloriesObjectif} kcal`],
      [L.hydration, `${calc.besoinHydrique} L`],
    ]),
  );

  // 3. Analyse médicale
  children.push(h(L.s3, HeadingLevel.HEADING_1));
  children.push(p(program.analyse.resumeProfil));
  children.push(p(`${L.weightRisks} : ${program.analyse.risquesPoids}`));
  children.push(p(`${L.diabetes} : ${program.analyse.analyseDiabete}`));
  children.push(p(`${L.nutrition} : ${program.analyse.analyseNutritionnelle}`));
  children.push(p(`${L.activity} : ${program.analyse.analyseActivite}`));

  // 4. Programme alimentaire (un ou plusieurs jours)
  children.push(h(L.s4, HeadingLevel.HEADING_1));
  program.nutrition.plans.forEach((plan) => {
    children.push(h(`${plan.jour} — ${plan.caloriesTotales} kcal`, HeadingLevel.HEADING_2));
    const mp = macroPercents(plan.macros);
    children.push(
      p(
        `Macros : Protéines ${plan.macros.proteines} g (${mp.proteines} %) · Glucides ${plan.macros.glucides} g (${mp.glucides} %) · Lipides ${plan.macros.lipides} g (${mp.lipides} %)`,
      ),
    );
    plan.repas.forEach((r) => {
      children.push(h(`${r.type} — ${r.nom} (${r.calories} kcal)`, HeadingLevel.HEADING_3));
      r.ingredients.forEach((ing) => children.push(bullet(`${ing.nom} : ${ing.quantite}`)));
    });
  });

  // 5. Recettes
  children.push(h(L.s5, HeadingLevel.HEADING_1));
  program.nutrition.recettes.forEach((rec) => {
    children.push(h(`${rec.nom} (${rec.calories} kcal · ${rec.tempsCuisson})`, HeadingLevel.HEADING_3));
    children.push(p(`${L.ingredients} :`));
    rec.ingredients.forEach((ing) => children.push(bullet(`${ing.nom} : ${ing.quantite}`)));
    children.push(p(`${L.preparation} :`));
    rec.etapes.forEach((e) => children.push(numbered(e)));
  });

  // 6. Liste de courses
  children.push(h(L.s6, HeadingLevel.HEADING_1));
  program.nutrition.listeCourses.forEach((cat) => {
    children.push(h(cat.categorie, HeadingLevel.HEADING_3));
    cat.items.forEach((it) => children.push(bullet(`${it.nom} : ${it.quantite}`)));
  });

  // 7. Programme sportif
  children.push(h(L.s7, HeadingLevel.HEADING_1));
  program.sport.semaines.forEach((sem) => {
    children.push(h(`${L.week} ${sem.semaine} — ${sem.objectif}`, HeadingLevel.HEADING_2));
    sem.jours.forEach((jour) => {
      children.push(h(`${jour.jour} : ${jour.focus}`, HeadingLevel.HEADING_3));
      children.push(p(`${L.warmup} : ${jour.echauffement}`));
      if (jour.cardio) children.push(p(`${L.cardio} : ${jour.cardio}`));
      jour.exercices.forEach((ex) =>
        children.push(
          bullet(
            `${ex.nom} — ${[ex.series && `${ex.series} ${L.series}`, ex.repetitions, ex.duree].filter(Boolean).join(", ")}`,
          ),
        ),
      );
    });
  });

  // 8. Recommandations
  children.push(h(L.s8, HeadingLevel.HEADING_1));
  program.analyse.recommandationsGenerales.forEach((r) => children.push(bullet(r)));

  // Cachet + Signature + nom du médecin (avec images si fournies)
  const sigAlign = rtl ? AlignmentType.LEFT : AlignmentType.RIGHT;

  const cachetPar = imageParagraph(form.branding.cachet, 110, 60, AlignmentType.LEFT);
  if (cachetPar) {
    children.push(new Paragraph({ spacing: { before: 360 }, children: [new TextRun({ text: L.stamp, color: "64748B" })] }));
    children.push(cachetPar);
  }

  children.push(
    new Paragraph({
      spacing: { before: cachetPar ? 120 : 480 },
      alignment: sigAlign,
      children: [
        new TextRun({
          text: form.branding.nomMedecin ? `${L.doctorPrefix} ${form.branding.nomMedecin}` : L.signature,
          italics: true,
        }),
      ],
    }),
  );

  const signaturePar = imageParagraph(form.branding.signature, 110, 60, sigAlign);
  if (signaturePar) children.push(signaturePar);

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "steps",
          levels: [{ level: 0, format: "decimal", text: "%1.", alignment: AlignmentType.START }],
        },
      ],
    },
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}
