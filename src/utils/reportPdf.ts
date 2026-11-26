import type { jsPDF as JsPDFDocument } from "jspdf";
import type { getReportSummary } from "../services/reports.service";

import {
  type ReportExportMetadata,
  REPORT_COLORS,
  REPORT_LABELS,
  REPORT_NOTES,
  formatReportDate,
  formatReportDateTime,
  formatReportPercentage,
  calculateReportPercentage,
  formatReportScope,
  getReportFilename,
} from "./reportExport";

type ReportSummary = Awaited<
  ReturnType<typeof getReportSummary>
>;

type RGB = [number, number, number];

type TableValue = string | number;

type DistributionItem = {
  label: string;
  count: number;
  color: string;
};

type SummaryCard = {
  label: string;
  value: string;
  description: string;
  color: string;
};

const MARGIN = 14;
const BOTTOM_MARGIN = 20;

function hexToRgb(hex: string): RGB {
  const value = hex.replace("#", "");

  return [
    parseInt(value.substring(0, 2), 16),
    parseInt(value.substring(2, 4), 16),
    parseInt(value.substring(4, 6), 16),
  ];
}

function setTextColor(
  pdf: JsPDFDocument,
  color: string
): void {
  pdf.setTextColor(...hexToRgb(color));
}

function setFillColor(
  pdf: JsPDFDocument,
  color: string
): void {
  pdf.setFillColor(...hexToRgb(color));
}

function setDrawColor(
  pdf: JsPDFDocument,
  color: string
): void {
  pdf.setDrawColor(...hexToRgb(color));
}

function pageWidth(pdf: JsPDFDocument): number {
  return pdf.internal.pageSize.getWidth();
}

function pageHeight(pdf: JsPDFDocument): number {
  return pdf.internal.pageSize.getHeight();
}

function contentWidth(pdf: JsPDFDocument): number {
  return pageWidth(pdf) - MARGIN * 2;
}

function ensureSpace(
  pdf: JsPDFDocument,
  y: number,
  requiredHeight: number
): number {
  if (
    y + requiredHeight >
    pageHeight(pdf) - BOTTOM_MARGIN
  ) {
    pdf.addPage();
    return MARGIN;
  }

  return y;
}

function drawHeader(pdf: JsPDFDocument): number {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(25);

  setTextColor(pdf, REPORT_COLORS.primary);

  pdf.text("INSPECTA", MARGIN, 21);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);

  setTextColor(pdf, REPORT_COLORS.secondary);

  pdf.text(
    "Seguridad e higiene industrial",
    MARGIN,
    28
  );

  pdf.setFontSize(9);

  setTextColor(pdf, REPORT_COLORS.muted);

  pdf.text(
    "REPORTE ESTADÍSTICO",
    pageWidth(pdf) - MARGIN,
    21,
    { align: "right" }
  );

  setFillColor(pdf, REPORT_COLORS.primary);

  pdf.rect(
    MARGIN,
    33,
    contentWidth(pdf),
    1,
    "F"
  );

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(17);

  setTextColor(pdf, REPORT_COLORS.primary);

  pdf.text(
    "Reporte de seguridad e higiene",
    MARGIN,
    44
  );

  return 52;
}

function drawMetadata(
  pdf: JsPDFDocument,
  metadata: ReportExportMetadata,
  startY: number
): number {
  let y = startY;

  const rows: [string, string][] = [
    ["Organización", metadata.organizationName],

    [
      "Periodo",
      `${formatReportDate(metadata.dateFrom)} - ` +
        formatReportDate(metadata.dateTo),
    ],

    ["Área", metadata.areaName],

    ["Alcance", formatReportScope(metadata.scope)],

    [
      "Generado",
      formatReportDateTime(metadata.generatedAt),
    ],
  ];

  const labelWidth = 32;

  for (const [label, value] of rows) {
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");

    const lines = pdf.splitTextToSize(
      value,
      contentWidth(pdf) - labelWidth
    ) as string[];

    const rowHeight = Math.max(6, lines.length * 4 + 2);

    y = ensureSpace(pdf, y, rowHeight);

    pdf.setFont("helvetica", "bold");
    setTextColor(pdf, REPORT_COLORS.primary);

    pdf.text(`${label}:`, MARGIN, y);

    pdf.setFont("helvetica", "normal");
    setTextColor(pdf, REPORT_COLORS.primary);

    pdf.text(lines, MARGIN + labelWidth, y);

    y += rowHeight;
  }

  return y + 4;
}

function drawSectionTitle(
  pdf: JsPDFDocument,
  title: string,
  startY: number,
  requiredHeight = 30
): number {
  const y = ensureSpace(
    pdf,
    startY,
    requiredHeight
  );

  setFillColor(pdf, REPORT_COLORS.primary);

  pdf.roundedRect(
    MARGIN,
    y,
    contentWidth(pdf),
    9,
    1.5,
    1.5,
    "F"
  );

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);

  setTextColor(pdf, REPORT_COLORS.white);

  pdf.text(title, MARGIN + 3, y + 6);

  return y + 15;
}

function drawSummaryCards(
  pdf: JsPDFDocument,
  cards: SummaryCard[],
  startY: number
): number {
  if (cards.length === 0) {
    return startY;
  }

  const gap = 4;
  const columns = 2;
  const height = 27;

  const width =
    (contentWidth(pdf) - gap) / columns;

  let y = startY;

  for (let index = 0; index < cards.length; index++) {
    const card = cards[index];

    const column = index % columns;

    if (column === 0) {
      y = ensureSpace(pdf, y, height + gap);
    }

    const x =
      MARGIN + column * (width + gap);

    setFillColor(pdf, REPORT_COLORS.background);
    setDrawColor(pdf, REPORT_COLORS.border);

    pdf.roundedRect(
      x,
      y,
      width,
      height,
      2,
      2,
      "FD"
    );

    setFillColor(pdf, card.color);

    pdf.rect(x + 2, y + 3, 1, height - 6, "F");

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);

    setTextColor(pdf, REPORT_COLORS.muted);

    pdf.text(card.label, x + 6, y + 7);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(19);

    setTextColor(pdf, card.color);

    pdf.text(card.value, x + 6, y + 16);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);

    setTextColor(pdf, REPORT_COLORS.muted);

    pdf.text(card.description, x + 6, y + 23);

    if (
      column === columns - 1 ||
      index === cards.length - 1
    ) {
      y += height + gap;
    }
  }

  return y + 4;
}

function drawMetric(
  pdf: JsPDFDocument,
  label: string,
  value: string,
  startY: number,
  color: string = REPORT_COLORS.primary
): number {
  const y = ensureSpace(pdf, startY, 9);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);

  setTextColor(pdf, REPORT_COLORS.primary);

  pdf.text(label, MARGIN, y);

  pdf.setFont("helvetica", "bold");

  setTextColor(pdf, color);

  pdf.text(
    value,
    pageWidth(pdf) - MARGIN,
    y,
    { align: "right" }
  );

  return y + 8;
}

function drawDistribution(
  pdf: JsPDFDocument,
  items: DistributionItem[],
  total: number,
  startY: number
): number {
  let y = startY;

  const width = contentWidth(pdf);

  for (const item of items) {
    y = ensureSpace(pdf, y, 16);

    const percentage =
      calculateReportPercentage(item.count, total);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);

    setTextColor(pdf, REPORT_COLORS.primary);

    pdf.text(item.label, MARGIN, y);

    setTextColor(pdf, REPORT_COLORS.muted);

    pdf.text(
      `${item.count} (${formatReportPercentage(
        percentage
      )})`,
      pageWidth(pdf) - MARGIN,
      y,
      { align: "right" }
    );

    setFillColor(pdf, REPORT_COLORS.background);

    pdf.roundedRect(
      MARGIN,
      y + 3,
      width,
      3,
      1,
      1,
      "F"
    );

    const barWidth =
      width *
      (Math.min(100, Math.max(0, percentage ?? 0)) /
        100);

    if (barWidth > 0) {
      setFillColor(pdf, item.color);

      const radius = Math.min(1, barWidth / 2);

      pdf.roundedRect(
        MARGIN,
        y + 3,
        barWidth,
        3,
        radius,
        radius,
        "F"
      );
    }

    y += 13;
  }

  return y + 3;
}

function drawParagraph(
  pdf: JsPDFDocument,
  text: string,
  startY: number
): number {
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);

  const lines = pdf.splitTextToSize(
    text,
    contentWidth(pdf)
  ) as string[];

  const height = lines.length * 4;

  const y = ensureSpace(
    pdf,
    startY,
    height + 4
  );

  setTextColor(pdf, REPORT_COLORS.muted);

  pdf.text(lines, MARGIN, y);

  return y + height + 4;
}

function drawFooters(pdf: JsPDFDocument): void {
  const pages = pdf.getNumberOfPages();

  for (let page = 1; page <= pages; page++) {
    pdf.setPage(page);

    const y = pageHeight(pdf) - 12;

    setDrawColor(pdf, REPORT_COLORS.border);

    pdf.line(
      MARGIN,
      y - 4,
      pageWidth(pdf) - MARGIN,
      y - 4
    );

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);

    setTextColor(pdf, REPORT_COLORS.muted);

    pdf.text(
      "INSPECTA | Reporte estadístico",
      MARGIN,
      y
    );

    pdf.text(
      `Página ${page} de ${pages}`,
      pageWidth(pdf) - MARGIN,
      y,
      { align: "right" }
    );
  }
}

export async function exportReportPdf(
  report: ReportSummary,
  metadata: ReportExportMetadata,
  canDownload: () => boolean = () => true
): Promise<void> {
  const [{ jsPDF }, { default: autoTable }] =
    await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);

  if (!canDownload()) {
    throw new Error(
      "El contexto del reporte ha cambiado."
    );
  }

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  pdf.setProperties({
    title: "INSPECTA - Reporte de seguridad e higiene",
    subject: "Indicadores estadísticos",
    author: "INSPECTA",
    creator: "INSPECTA",
  });

  const inspections = report.capabilities.inspections
    ? report.inspections
    : null;

  const incidents = report.capabilities.incidents
    ? report.incidents
    : null;

  const actions = report.capabilities.corrective_actions
    ? report.corrective_actions
    : null;

  let y = drawHeader(pdf);

  y = drawMetadata(pdf, metadata, y);

  function drawTable(
    headers: string[],
    rows: TableValue[][],
    startY: number
  ): number {
    const tableY = ensureSpace(pdf, startY, 25);

    autoTable(pdf, {
      startY: tableY,

      head: [headers],
      body: rows,

      theme: "grid",

      margin: {
        top: MARGIN,
        bottom: BOTTOM_MARGIN,
        left: MARGIN,
        right: MARGIN,
      },

      styles: {
        font: "helvetica",
        fontSize: 9,
        cellPadding: 3,
        overflow: "linebreak",
        textColor: hexToRgb(REPORT_COLORS.primary),
        lineColor: hexToRgb(REPORT_COLORS.border),
        lineWidth: 0.15,
        valign: "middle",
      },

      headStyles: {
        fillColor: hexToRgb(REPORT_COLORS.primary),
        textColor: hexToRgb(REPORT_COLORS.white),
        fontStyle: "bold",
      },

      alternateRowStyles: {
        fillColor: hexToRgb(REPORT_COLORS.background),
      },

      rowPageBreak: "avoid",
      showHead: "everyPage",
    });

    const document = pdf as JsPDFDocument & {
      lastAutoTable?: {
        finalY: number;
      };
    };

    return (
      document.lastAutoTable?.finalY ?? tableY
    ) + 9;
  }

  // ==================================================
  // RESUMEN GENERAL
  // ==================================================

  const cards: SummaryCard[] = [];

  if (inspections) {
    cards.push({
      label: "Inspecciones",
      value: String(inspections.total),
      description: "Inspecciones registradas",
      color: REPORT_COLORS.primary,
    });
  }

  if (incidents) {
    cards.push({
      label: "Incidencias",
      value: String(incidents.total),
      description:
        incidents.critical === 1
          ? "1 crítica"
          : `${incidents.critical} críticas`,
      color: REPORT_COLORS.error,
    });
  }

  if (actions) {
    cards.push({
      label: "Acciones correctivas",
      value: String(actions.total),
      description:
        actions.overdue === 1
          ? "1 vencida"
          : `${actions.overdue} vencidas`,
      color: REPORT_COLORS.info,
    });
  }

  if (inspections) {
    cards.push({
      label: "Finalización",
      value: formatReportPercentage(
        inspections.completion_rate
      ),
      description: "Inspecciones finalizadas",
      color:
        inspections.completion_rate === null
          ? REPORT_COLORS.muted
          : REPORT_COLORS.success,
    });
  }

  y = drawSummaryCards(pdf, cards, y);

  let sectionNumber = 1;

  // ==================================================
  // INSPECCIONES
  // ==================================================

  if (inspections) {
    y = drawSectionTitle(
      pdf,
      `${sectionNumber++}. Inspecciones`,
      y,
      45
    );

    y = drawMetric(
      pdf,
      "Inspecciones finalizadas",
      `${inspections.finalized} / ${inspections.total}`,
      y
    );

    y = drawMetric(
      pdf,
      "Tasa de finalización",
      formatReportPercentage(
        inspections.completion_rate
      ),
      y,
      inspections.completion_rate === null
        ? REPORT_COLORS.muted
        : REPORT_COLORS.success
    );

    y = drawDistribution(
      pdf,
      [
        {
          label: REPORT_LABELS.inspectionStatus.draft,
          count: inspections.by_status.draft,
          color: REPORT_COLORS.info,
        },
        {
          label: REPORT_LABELS.inspectionStatus.completed,
          count: inspections.by_status.completed,
          color: REPORT_COLORS.secondary,
        },
        {
          label: REPORT_LABELS.inspectionStatus.confirmed,
          count: inspections.by_status.confirmed,
          color: REPORT_COLORS.success,
        },
        {
          label: REPORT_LABELS.inspectionStatus.rejected,
          count: inspections.by_status.rejected,
          color: REPORT_COLORS.error,
        },
      ],
      inspections.total,
      y
    );

    y = drawMetric(
      pdf,
      "Inspecciones revisadas",
      String(inspections.reviewed),
      y
    );

    y = drawMetric(
      pdf,
      "Tasa de aprobación",
      formatReportPercentage(
        inspections.approval_rate
      ),
      y,
      inspections.approval_rate === null
        ? REPORT_COLORS.muted
        : REPORT_COLORS.success
    );

    y = drawParagraph(
      pdf,
      `${inspections.by_status.confirmed} confirmadas ` +
        `de ${inspections.reviewed} inspecciones revisadas.`,
      y
    );
  }

  // ==================================================
  // INCIDENCIAS
  // ==================================================

  if (incidents) {
    y = drawSectionTitle(
      pdf,
      `${sectionNumber++}. Incidencias`,
      y,
      45
    );

    y = drawMetric(
      pdf,
      "Incidencias registradas",
      String(incidents.total),
      y
    );

    y = drawMetric(
      pdf,
      "Incidencias críticas",
      String(incidents.critical),
      y,
      REPORT_COLORS.error
    );

    y = drawMetric(
      pdf,
      "Abiertas / En proceso",
      String(incidents.open),
      y
    );

    y = drawMetric(
      pdf,
      "Resueltas / Cerradas",
      String(incidents.resolved),
      y
    );

    y = drawTable(
      ["Estado", "Cantidad", "Porcentaje"],
      Object.entries(REPORT_LABELS.incidentStatus).map(
        ([key, label]) => {
          const count =
            incidents.by_status[
              key as keyof typeof incidents.by_status
            ];

          return [
            label,
            count,
            formatReportPercentage(
              calculateReportPercentage(
                count,
                incidents.total
              )
            ),
          ];
        }
      ),
      y
    );

    y = drawTable(
      ["Nivel de riesgo", "Cantidad", "Porcentaje"],
      Object.entries(REPORT_LABELS.incidentRisk).map(
        ([key, label]) => {
          const count =
            incidents.by_risk_level[
              key as keyof typeof incidents.by_risk_level
            ];

          return [
            label,
            count,
            formatReportPercentage(
              calculateReportPercentage(
                count,
                incidents.total
              )
            ),
          ];
        }
      ),
      y
    );

    y = drawSectionTitle(
      pdf,
      "Distribución de incidencias por área",
      y
    );

    if (incidents.by_area.length > 0) {
      y = drawTable(
        ["Área", "Incidencias", "Porcentaje"],
        incidents.by_area.map((area) => [
          area.area_name,
          area.count,
          formatReportPercentage(area.percentage),
        ]),
        y
      );
    } else {
      y = drawParagraph(
        pdf,
        "No se registraron incidencias durante el periodo seleccionado.",
        y
      );
    }
  }

  // ==================================================
  // ACCIONES CORRECTIVAS
  // ==================================================

  if (actions) {
    y = drawSectionTitle(
      pdf,
      `${sectionNumber++}. Acciones correctivas`,
      y,
      45
    );

    y = drawMetric(
      pdf,
      "Acciones correctivas registradas",
      String(actions.total),
      y
    );

    y = drawDistribution(
      pdf,
      [
        {
          label: REPORT_LABELS.correctiveActionStatus.pending,
          count: actions.by_status.pending,
          color: REPORT_COLORS.info,
        },
        {
          label: REPORT_LABELS.correctiveActionStatus.in_progress,
          count: actions.by_status.in_progress,
          color: REPORT_COLORS.info,
        },
        {
          label: REPORT_LABELS.correctiveActionStatus.completed,
          count: actions.by_status.completed,
          color: REPORT_COLORS.secondary,
        },
        {
          label: REPORT_LABELS.correctiveActionStatus.verified,
          count: actions.by_status.verified,
          color: REPORT_COLORS.success,
        },
      ],
      actions.total,
      y
    );

    y = drawMetric(
      pdf,
      "Acciones pendientes de ejecución",
      String(actions.pending),
      y
    );

    y = drawMetric(
      pdf,
      "Acciones verificadas",
      String(actions.verified),
      y
    );

    y = drawMetric(
      pdf,
      "Acciones vencidas",
      String(actions.overdue),
      y,
      actions.overdue > 0
        ? REPORT_COLORS.error
        : REPORT_COLORS.primary
    );

    y = drawMetric(
      pdf,
      "Tasa de verificación",
      formatReportPercentage(
        actions.verification_rate
      ),
      y,
      actions.verification_rate === null
        ? REPORT_COLORS.muted
        : REPORT_COLORS.success
    );
  }

  // ==================================================
  // REPORTE SIN SECCIONES AUTORIZADAS
  // ==================================================

  if (!inspections && !incidents && !actions) {
    y = drawParagraph(
      pdf,
      "No existen secciones disponibles para los permisos actuales del usuario.",
      y
    );
  }

  // ==================================================
  // NOTAS METODOLÓGICAS
  // ==================================================

  y = drawSectionTitle(
    pdf,
    "Notas metodológicas",
    y,
    35
  );

  const notes: string[] = [
    REPORT_NOTES.period,
    REPORT_NOTES.permissions,
  ];

  if (inspections) {
    notes.push(
      REPORT_NOTES.completion,
      REPORT_NOTES.approval,
      REPORT_NOTES.compliance
    );
  }

  if (actions) {
    notes.push(
      REPORT_NOTES.verification,
      REPORT_NOTES.overdue
    );
  }

  for (const note of notes) {
    y = drawParagraph(pdf, `- ${note}`, y);
  }

  drawFooters(pdf);

  if (!canDownload()) {
    throw new Error(
      "El contexto del reporte ha cambiado."
    );
  }

  pdf.save(getReportFilename(metadata, "pdf"));
}