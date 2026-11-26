import type {
  Workbook,
  Worksheet,
  Cell,
} from "exceljs";

import type { getReportSummary } from "../services/reports.service";

import {
  type ReportExportMetadata,
  REPORT_COLORS,
  REPORT_LABELS,
  REPORT_NOTES,
  formatReportDate,
  formatReportDateTime,
  calculateReportPercentage,
  toExcelPercentage,
  formatReportScope,
  getReportFilename,
  downloadReportBlob,
} from "./reportExport";

type ReportSummary = Awaited<
  ReturnType<typeof getReportSummary>
>;

type ExcelValue = string | number | null;

type ExcelColumn = {
  title: string;
  width: number;
};

const EXCEL_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

// ==================================================
// CONFIGURACIÓN GLOBAL DEL DISEÑO
// ==================================================

const LAYOUT = {
  startColumn: 2,
  startRow: 2,

  leftMarginWidth: 30,
  topMarginHeight: 16,

  totalContentWidth: 130,

  zoomScale: 100,

  titleHeight: 36,
  subtitleHeight: 30,
  headerHeight: 26,

  horizontalCentered: true,
} as const;

const TITLE_ROW = LAYOUT.startRow;
const SUBTITLE_ROW = TITLE_ROW + 1;
const SEPARATOR_ROW = TITLE_ROW + 2;
const HEADER_ROW = TITLE_ROW + 3;

// ==================================================
// UTILIDADES DE FORMATO
// ==================================================

function toArgb(hex: string): string {
  return `FF${hex.replace("#", "").toUpperCase()}`;
}

function contentColumn(index: number): number {
  return LAYOUT.startColumn + index - 1;
}

function percentageValue(
  value: number | null
): number | string {
  return toExcelPercentage(value) ?? "Sin datos";
}

function distributionPercentage(
  count: number,
  total: number
): number | string {
  return percentageValue(
    calculateReportPercentage(count, total)
  );
}

function stylePercentage(cell: Cell): void {
  if (typeof cell.value === "number") {
    cell.numFmt = "0.00%";
  } else if (cell.value === "Sin datos") {
    cell.font = {
      ...cell.font,
      color: {
        argb: toArgb(REPORT_COLORS.muted),
      },
    };
  }
}

function styleHeader(cell: Cell): void {
  cell.font = {
    name: "Calibri",
    size: 11,
    bold: true,
    color: {
      argb: toArgb(REPORT_COLORS.white),
    },
  };

  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: toArgb(REPORT_COLORS.primary),
    },
  };

  cell.alignment = {
    vertical: "middle",
    horizontal: "left",
    wrapText: true,
  };
}

function styleBody(
  cell: Cell,
  alternate: boolean
): void {
  cell.font = {
    name: "Calibri",
    size: 11,
    color: {
      argb: toArgb(REPORT_COLORS.primary),
    },
  };

  cell.alignment = {
    vertical: "middle",
    horizontal:
      typeof cell.value === "number"
        ? "right"
        : "left",
    wrapText: true,
  };

  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: toArgb(
        alternate
          ? REPORT_COLORS.background
          : REPORT_COLORS.white
      ),
    },
  };

  cell.border = {
    bottom: {
      style: "thin",
      color: {
        argb: toArgb(REPORT_COLORS.border),
      },
    },
  };

  if (typeof cell.value === "number") {
    cell.numFmt = "#,##0";
  }

  if (cell.value === "Sin datos") {
    cell.font = {
      ...cell.font,
      color: {
        argb: toArgb(REPORT_COLORS.muted),
      },
    };
  }
}

// ==================================================
// CONFIGURACIÓN DE HOJAS
// ==================================================

function createWorksheet(
  workbook: Workbook,
  name: string,
  title: string,
  subtitle: string,
  columns: ExcelColumn[],
  tabColor: string
): Worksheet {
  const worksheet = workbook.addWorksheet(name, {
    properties: {
      tabColor: {
        argb: toArgb(tabColor),
      },
      defaultRowHeight: 22,
    },

    views: [
      {
        state: "frozen",
        ySplit: HEADER_ROW,
        showGridLines: false,
        zoomScale: LAYOUT.zoomScale,
      },
    ],

    pageSetup: {
      paperSize: 9,
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,

      horizontalCentered:
        LAYOUT.horizontalCentered,

      margins: {
        left: 0.4,
        right: 0.4,
        top: 0.5,
        bottom: 0.5,
        header: 0.2,
        footer: 0.2,
      },
    },
  });

  // ==================================================
  // MÁRGENES LATERALES
  // ==================================================

  const marginColumns =
    LAYOUT.startColumn - 1;

  for (
    let index = 1;
    index <= marginColumns;
    index++
  ) {
    worksheet.getColumn(index).width =
      LAYOUT.leftMarginWidth / marginColumns;
  }

  // ==================================================
  // MARGEN SUPERIOR
  // ==================================================

  for (
    let index = 1;
    index < LAYOUT.startRow;
    index++
  ) {
    worksheet.getRow(index).height =
      LAYOUT.topMarginHeight;
  }

  // ==================================================
  // ANCHO UNIFORME DEL CONTENIDO
  // ==================================================

  const originalTotalWidth = columns.reduce(
    (sum, column) => sum + column.width,
    0
  );

  columns.forEach((column, index) => {
    const proportion =
      column.width / originalTotalWidth;

    worksheet.getColumn(
      contentColumn(index + 1)
    ).width =
      proportion * LAYOUT.totalContentWidth;
  });

  const firstColumn = LAYOUT.startColumn;

  const lastColumn = contentColumn(
    columns.length
  );

  // ==================================================
  // TÍTULO PRINCIPAL
  // ==================================================

  worksheet.mergeCells(
    TITLE_ROW,
    firstColumn,
    TITLE_ROW,
    lastColumn
  );

  const titleCell = worksheet.getCell(
    TITLE_ROW,
    firstColumn
  );

  titleCell.value = title;

  titleCell.font = {
    name: "Calibri",
    size: 19,
    bold: true,
    color: {
      argb: toArgb(REPORT_COLORS.white),
    },
  };

  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: toArgb(REPORT_COLORS.primary),
    },
  };

  titleCell.alignment = {
    vertical: "middle",
    horizontal: "left",
    indent: 1,
  };

  worksheet.getRow(TITLE_ROW).height =
    LAYOUT.titleHeight;

  // ==================================================
  // SUBTÍTULO
  // ==================================================

  worksheet.mergeCells(
    SUBTITLE_ROW,
    firstColumn,
    SUBTITLE_ROW,
    lastColumn
  );

  const subtitleCell = worksheet.getCell(
    SUBTITLE_ROW,
    firstColumn
  );

  subtitleCell.value = subtitle;

  subtitleCell.font = {
    name: "Calibri",
    size: 10,
    italic: true,
    color: {
      argb: toArgb(REPORT_COLORS.muted),
    },
  };

  subtitleCell.alignment = {
    vertical: "middle",
    horizontal: "left",
    wrapText: true,
  };

  worksheet.getRow(SUBTITLE_ROW).height =
    LAYOUT.subtitleHeight;

  worksheet.getRow(SEPARATOR_ROW).height = 8;

  // ==================================================
  // ENCABEZADOS
  // ==================================================

  const header = worksheet.getRow(HEADER_ROW);

  columns.forEach((column, index) => {
    const cell = header.getCell(
      contentColumn(index + 1)
    );

    cell.value = column.title;

    styleHeader(cell);
  });

  header.height = LAYOUT.headerHeight;

  worksheet.pageSetup.printTitlesRow =
    `${TITLE_ROW}:${HEADER_ROW}`;

  worksheet.headerFooter.oddFooter =
    "&LINSPECTA&R Página &P de &N";

  return worksheet;
}

// ==================================================
// INSERCIÓN DE FILAS
// ==================================================

function addDataRow(
  worksheet: Worksheet,
  values: ExcelValue[],
  percentageColumns: number[] = []
): number {
  const row = worksheet.addRow([]);

  const alternate = row.number % 2 === 0;

  for (
    let index = 1;
    index <= values.length;
    index++
  ) {
    const cell = row.getCell(
      contentColumn(index)
    );

    cell.value = values[index - 1];

    styleBody(cell, alternate);

    if (percentageColumns.includes(index)) {
      stylePercentage(cell);
    }
  }

  const lineCount = Math.max(
    1,
    ...values.map((value, index) => {
      if (typeof value !== "string") {
        return 1;
      }

      const width =
        worksheet.getColumn(
          contentColumn(index + 1)
        ).width ?? 20;

      const charactersPerLine = Math.max(
        8,
        Math.floor(width * 0.9)
      );

      return value
        .split("\n")
        .reduce(
          (total, line) =>
            total +
            Math.max(
              1,
              Math.ceil(
                line.length / charactersPerLine
              )
            ),
          0
        );
    })
  );

  row.height = Math.min(
    409,
    Math.max(24, lineCount * 15 + 8)
  );

  return row.number;
}

function addSection(
  worksheet: Worksheet,
  title: string,
  columnCount: number
): void {
  const separator = worksheet.addRow([]);

  separator.height = 8;

  const row = worksheet.addRow([]);

  worksheet.mergeCells(
    row.number,
    LAYOUT.startColumn,
    row.number,
    contentColumn(columnCount)
  );

  const cell = row.getCell(
    LAYOUT.startColumn
  );

  cell.value = title;

  cell.font = {
    name: "Calibri",
    size: 11,
    bold: true,
    color: {
      argb: toArgb(REPORT_COLORS.white),
    },
  };

  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: toArgb(REPORT_COLORS.secondary),
    },
  };

  cell.alignment = {
    vertical: "middle",
    horizontal: "left",
    indent: 1,
  };

  row.height = 25;
}

function addTotalRow(
  worksheet: Worksheet,
  values: ExcelValue[],
  percentageColumns: number[] = []
): void {
  const rowNumber = addDataRow(
    worksheet,
    values,
    percentageColumns
  );

  const row = worksheet.getRow(rowNumber);

  for (
    let index = 1;
    index <= values.length;
    index++
  ) {
    const cell = row.getCell(
      contentColumn(index)
    );

    cell.font = {
      ...cell.font,
      bold: true,
    };

    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: {
        argb: toArgb(REPORT_COLORS.border),
      },
    };
  }
}

function addNote(
  worksheet: Worksheet,
  text: string,
  columnCount: number
): void {
  const row = worksheet.addRow([]);

  worksheet.mergeCells(
    row.number,
    LAYOUT.startColumn,
    row.number,
    contentColumn(columnCount)
  );

  const cell = row.getCell(
    LAYOUT.startColumn
  );

  cell.value = text;

  cell.font = {
    name: "Calibri",
    size: 10,
    italic: true,
    color: {
      argb: toArgb(REPORT_COLORS.muted),
    },
  };

  cell.alignment = {
    vertical: "middle",
    horizontal: "left",
    wrapText: true,
  };

  const totalWidth = Array.from(
    { length: columnCount },
    (_, index) =>
      worksheet.getColumn(
        contentColumn(index + 1)
      ).width ?? 20
  ).reduce((sum, width) => sum + width, 0);

  row.height = Math.min(
    409,
    Math.max(
      28,
      Math.ceil(
        text.length / (totalWidth * 0.85)
      ) * 15 + 8
    )
  );
}

function highlightOverdue(
  worksheet: Worksheet,
  rowNumber: number,
  columnNumber: number,
  overdue: number
): void {
  if (overdue <= 0) {
    return;
  }

  const cell = worksheet
    .getRow(rowNumber)
    .getCell(contentColumn(columnNumber));

  cell.font = {
    ...cell.font,
    bold: true,
    color: {
      argb: toArgb(REPORT_COLORS.error),
    },
  };
}

// ==================================================
// CONFIGURACIÓN FINAL DE IMPRESIÓN
// ==================================================

function configurePrintArea(
  worksheet: Worksheet,
  columnCount: number
): void {
  const firstCell = worksheet.getCell(
    TITLE_ROW,
    LAYOUT.startColumn
  );

  const lastCell = worksheet.getCell(
    worksheet.rowCount,
    contentColumn(columnCount)
  );

  worksheet.pageSetup.printArea =
    `${firstCell.address}:${lastCell.address}`;
}

// ==================================================
// HOJA 1: RESUMEN GENERAL
// ==================================================

function createSummarySheet(
  workbook: Workbook,
  report: ReportSummary,
  metadata: ReportExportMetadata
): void {
  const worksheet = createWorksheet(
    workbook,
    "Resumen",
    "INSPECTA | Reporte estadístico",
    "Reporte de seguridad e higiene industrial",
    [
      { title: "Indicador", width: 38 },
      { title: "Resultado", width: 58 },
    ],
    REPORT_COLORS.primary
  );

  addDataRow(worksheet, [
    "Organización",
    metadata.organizationName,
  ]);

  addDataRow(worksheet, [
    "Fecha inicial",
    formatReportDate(metadata.dateFrom),
  ]);

  addDataRow(worksheet, [
    "Fecha final",
    formatReportDate(metadata.dateTo),
  ]);

  addDataRow(worksheet, [
    "Área",
    metadata.areaName,
  ]);

  addDataRow(worksheet, [
    "Alcance",
    formatReportScope(metadata.scope),
  ]);

  addDataRow(worksheet, [
    "Fecha de generación",
    formatReportDateTime(metadata.generatedAt),
  ]);

  addSection(
    worksheet,
    "Indicadores principales",
    2
  );

  const inspections = report.capabilities.inspections
    ? report.inspections
    : null;

  const incidents = report.capabilities.incidents
    ? report.incidents
    : null;

  const actions =
    report.capabilities.corrective_actions
      ? report.corrective_actions
      : null;

  if (inspections) {
    addDataRow(worksheet, [
      "Inspecciones registradas",
      inspections.total,
    ]);

    addDataRow(worksheet, [
      "Inspecciones finalizadas",
      inspections.finalized,
    ]);

    addDataRow(
      worksheet,
      [
        "Tasa de finalización",
        percentageValue(
          inspections.completion_rate
        ),
      ],
      [2]
    );

    addDataRow(
      worksheet,
      [
        "Tasa de aprobación",
        percentageValue(
          inspections.approval_rate
        ),
      ],
      [2]
    );
  }

  if (incidents) {
    addDataRow(worksheet, [
      "Incidencias registradas",
      incidents.total,
    ]);

    addDataRow(worksheet, [
      "Incidencias críticas",
      incidents.critical,
    ]);

    addDataRow(worksheet, [
      "Incidencias abiertas / En proceso",
      incidents.open,
    ]);

    addDataRow(worksheet, [
      "Incidencias resueltas / Cerradas",
      incidents.resolved,
    ]);
  }

  if (actions) {
    addDataRow(worksheet, [
      "Acciones correctivas registradas",
      actions.total,
    ]);

    addDataRow(worksheet, [
      "Acciones verificadas",
      actions.verified,
    ]);

    addDataRow(worksheet, [
      "Acciones pendientes de ejecución",
      actions.pending,
    ]);

    const overdueRow = addDataRow(
      worksheet,
      [
        "Acciones vencidas",
        actions.overdue,
      ]
    );

    highlightOverdue(
      worksheet,
      overdueRow,
      2,
      actions.overdue
    );

    addDataRow(
      worksheet,
      [
        "Tasa de verificación",
        percentageValue(
          actions.verification_rate
        ),
      ],
      [2]
    );
  }

  if (!inspections && !incidents && !actions) {
    addNote(
      worksheet,
      "No existen secciones disponibles para los permisos actuales del usuario.",
      2
    );
  }

  addSection(
    worksheet,
    "Notas metodológicas",
    2
  );

  addNote(worksheet, REPORT_NOTES.period, 2);

  addNote(
    worksheet,
    REPORT_NOTES.permissions,
    2
  );

  if (inspections) {
    addNote(
      worksheet,
      REPORT_NOTES.completion,
      2
    );

    addNote(
      worksheet,
      REPORT_NOTES.approval,
      2
    );

    addNote(
      worksheet,
      REPORT_NOTES.compliance,
      2
    );
  }

  if (actions) {
    addNote(
      worksheet,
      REPORT_NOTES.verification,
      2
    );

    addNote(
      worksheet,
      REPORT_NOTES.overdue,
      2
    );
  }

  configurePrintArea(worksheet, 2);
}

// ==================================================
// HOJA 2: INSPECCIONES
// ==================================================

function createInspectionsSheet(
  workbook: Workbook,
  inspections: NonNullable<
    ReportSummary["inspections"]
  >
): void {
  const worksheet = createWorksheet(
    workbook,
    "Inspecciones",
    "INSPECTA | Inspecciones",
    "Distribución por estado e indicadores de finalización y aprobación.",
    [
      { title: "Indicador", width: 42 },
      { title: "Cantidad", width: 18 },
      { title: "Porcentaje", width: 20 },
    ],
    REPORT_COLORS.info
  );

  for (const [key, label] of Object.entries(
    REPORT_LABELS.inspectionStatus
  )) {
    const count =
      inspections.by_status[
        key as keyof typeof inspections.by_status
      ];

    addDataRow(
      worksheet,
      [
        label,
        count,
        distributionPercentage(
          count,
          inspections.total
        ),
      ],
      [3]
    );
  }

  addTotalRow(
    worksheet,
    [
      "Total",
      inspections.total,
      distributionPercentage(
        inspections.total,
        inspections.total
      ),
    ],
    [3]
  );

  addSection(
    worksheet,
    "Indicadores de finalización",
    3
  );

  addDataRow(
    worksheet,
    [
      "Inspecciones finalizadas",
      inspections.finalized,
      percentageValue(
        inspections.completion_rate
      ),
    ],
    [3]
  );

  addSection(
    worksheet,
    "Indicadores de aprobación",
    3
  );

  addDataRow(worksheet, [
    "Inspecciones revisadas",
    inspections.reviewed,
    null,
  ]);

  addDataRow(worksheet, [
    "Inspecciones confirmadas",
    inspections.by_status.confirmed,
    null,
  ]);

  addDataRow(worksheet, [
    "Inspecciones rechazadas",
    inspections.by_status.rejected,
    null,
  ]);

  addTotalRow(
    worksheet,
    [
      "Tasa de aprobación",
      null,
      percentageValue(
        inspections.approval_rate
      ),
    ],
    [3]
  );

  addSection(
    worksheet,
    "Interpretación de indicadores",
    3
  );

  addNote(
    worksheet,
    REPORT_NOTES.completion,
    3
  );

  addNote(
    worksheet,
    REPORT_NOTES.approval,
    3
  );

  addNote(
    worksheet,
    REPORT_NOTES.compliance,
    3
  );

  configurePrintArea(worksheet, 3);
}

// ==================================================
// HOJA 3: INCIDENCIAS
// ==================================================

function createIncidentsSheet(
  workbook: Workbook,
  incidents: NonNullable<
    ReportSummary["incidents"]
  >
): void {
  const worksheet = createWorksheet(
    workbook,
    "Incidencias",
    "INSPECTA | Incidencias",
    "Distribución de incidencias por estado y nivel de riesgo.",
    [
      { title: "Indicador", width: 42 },
      { title: "Cantidad", width: 18 },
      { title: "Porcentaje", width: 20 },
    ],
    REPORT_COLORS.error
  );

  addSection(
    worksheet,
    "Distribución por estado",
    3
  );

  for (const [key, label] of Object.entries(
    REPORT_LABELS.incidentStatus
  )) {
    const count =
      incidents.by_status[
        key as keyof typeof incidents.by_status
      ];

    addDataRow(
      worksheet,
      [
        label,
        count,
        distributionPercentage(
          count,
          incidents.total
        ),
      ],
      [3]
    );
  }

  addTotalRow(
    worksheet,
    [
      "Total",
      incidents.total,
      distributionPercentage(
        incidents.total,
        incidents.total
      ),
    ],
    [3]
  );

  addSection(
    worksheet,
    "Distribución por nivel de riesgo",
    3
  );

  for (const [key, label] of Object.entries(
    REPORT_LABELS.incidentRisk
  )) {
    const count =
      incidents.by_risk_level[
        key as keyof typeof incidents.by_risk_level
      ];

    const rowNumber = addDataRow(
      worksheet,
      [
        label,
        count,
        distributionPercentage(
          count,
          incidents.total
        ),
      ],
      [3]
    );

    if (key === "critical" && count > 0) {
      const cell = worksheet
        .getRow(rowNumber)
        .getCell(contentColumn(2));

      cell.font = {
        ...cell.font,
        bold: true,
        color: {
          argb: toArgb(REPORT_COLORS.error),
        },
      };
    }
  }

  addTotalRow(
    worksheet,
    [
      "Total",
      incidents.total,
      distributionPercentage(
        incidents.total,
        incidents.total
      ),
    ],
    [3]
  );

  addSection(
    worksheet,
    "Indicadores de seguimiento",
    3
  );

  addDataRow(
    worksheet,
    [
      "Abiertas / En proceso",
      incidents.open,
      distributionPercentage(
        incidents.open,
        incidents.total
      ),
    ],
    [3]
  );

  addDataRow(
    worksheet,
    [
      "Resueltas / Cerradas",
      incidents.resolved,
      distributionPercentage(
        incidents.resolved,
        incidents.total
      ),
    ],
    [3]
  );

  addDataRow(
    worksheet,
    [
      "Incidencias críticas",
      incidents.critical,
      distributionPercentage(
        incidents.critical,
        incidents.total
      ),
    ],
    [3]
  );

  configurePrintArea(worksheet, 3);
}

// ==================================================
// HOJA 4: INCIDENCIAS POR ÁREA
// ==================================================

function createAreasSheet(
  workbook: Workbook,
  incidents: NonNullable<
    ReportSummary["incidents"]
  >
): void {
  const worksheet = createWorksheet(
    workbook,
    "Áreas",
    "INSPECTA | Incidencias por área",
    "Distribución de incidencias en las áreas autorizadas.",
    [
      { title: "Área", width: 45 },
      { title: "Incidencias", width: 18 },
      { title: "Porcentaje", width: 20 },
    ],
    REPORT_COLORS.secondary
  );

  if (incidents.by_area.length === 0) {
    addNote(
      worksheet,
      "No se registraron incidencias durante el periodo seleccionado.",
      3
    );

    configurePrintArea(worksheet, 3);

    return;
  }

  for (const area of incidents.by_area) {
    addDataRow(
      worksheet,
      [
        area.area_name,
        area.count,
        percentageValue(area.percentage),
      ],
      [3]
    );
  }

  const lastDataRow = worksheet.rowCount;

  worksheet.autoFilter = {
    from: {
      row: HEADER_ROW,
      column: LAYOUT.startColumn,
    },
    to: {
      row: lastDataRow,
      column: contentColumn(3),
    },
  };

  const areaTotal = incidents.by_area.reduce(
    (total, area) => total + area.count,
    0
  );

  addTotalRow(
    worksheet,
    [
      "Total",
      areaTotal,
      distributionPercentage(
        areaTotal,
        incidents.total
      ),
    ],
    [3]
  );

  addNote(
    worksheet,
    "El porcentaje de cada área corresponde a su proporción respecto al total de incidencias del reporte.",
    3
  );

  configurePrintArea(worksheet, 3);
}

// ==================================================
// HOJA 5: ACCIONES CORRECTIVAS
// ==================================================

function createCorrectiveActionsSheet(
  workbook: Workbook,
  actions: NonNullable<
    ReportSummary["corrective_actions"]
  >
): void {
  const worksheet = createWorksheet(
    workbook,
    "Acciones correctivas",
    "INSPECTA | Acciones correctivas",
    "Seguimiento de estados, vencimientos y verificación.",
    [
      { title: "Indicador", width: 42 },
      { title: "Cantidad", width: 18 },
      { title: "Porcentaje", width: 20 },
    ],
    REPORT_COLORS.success
  );

  for (const [key, label] of Object.entries(
    REPORT_LABELS.correctiveActionStatus
  )) {
    const count =
      actions.by_status[
        key as keyof typeof actions.by_status
      ];

    addDataRow(
      worksheet,
      [
        label,
        count,
        distributionPercentage(
          count,
          actions.total
        ),
      ],
      [3]
    );
  }

  addTotalRow(
    worksheet,
    [
      "Total",
      actions.total,
      distributionPercentage(
        actions.total,
        actions.total
      ),
    ],
    [3]
  );

  addSection(
    worksheet,
    "Indicadores de seguimiento",
    3
  );

  addDataRow(
    worksheet,
    [
      "Acciones pendientes de ejecución",
      actions.pending,
      distributionPercentage(
        actions.pending,
        actions.total
      ),
    ],
    [3]
  );

  const overdueRow = addDataRow(
    worksheet,
    [
      "Acciones vencidas",
      actions.overdue,
      null,
    ]
  );

  highlightOverdue(
    worksheet,
    overdueRow,
    2,
    actions.overdue
  );

  addTotalRow(
    worksheet,
    [
      "Acciones verificadas",
      actions.verified,
      percentageValue(
        actions.verification_rate
      ),
    ],
    [3]
  );

  addSection(
    worksheet,
    "Interpretación de indicadores",
    3
  );

  addNote(
    worksheet,
    REPORT_NOTES.verification,
    3
  );

  addNote(
    worksheet,
    REPORT_NOTES.overdue,
    3
  );

  configurePrintArea(worksheet, 3);
}

// ==================================================
// FUNCIÓN PRINCIPAL DE EXPORTACIÓN
// ==================================================

export async function exportReportExcel(
  report: ReportSummary,
  metadata: ReportExportMetadata,
  canDownload: () => boolean = () => true
): Promise<void> {
  const { default: ExcelJS } =
    await import("exceljs");

  if (!canDownload()) {
    throw new Error(
      "El contexto del reporte ha cambiado."
    );
  }

  const workbook = new ExcelJS.Workbook();

  workbook.creator = "INSPECTA";
  workbook.lastModifiedBy = "INSPECTA";

  workbook.created = metadata.generatedAt;
  workbook.modified = metadata.generatedAt;

  workbook.title =
    "INSPECTA - Reporte de seguridad e higiene";

  workbook.subject =
    "Indicadores estadísticos de seguridad e higiene";

  workbook.description =
    "Reporte generado mediante la plataforma INSPECTA.";

  workbook.company = "INSPECTA";

  // Resumen general
  createSummarySheet(
    workbook,
    report,
    metadata
  );

  // Inspecciones
  if (
    report.capabilities.inspections &&
    report.inspections
  ) {
    createInspectionsSheet(
      workbook,
      report.inspections
    );
  }

  // Incidencias y distribución por área
  if (
    report.capabilities.incidents &&
    report.incidents
  ) {
    createIncidentsSheet(
      workbook,
      report.incidents
    );

    createAreasSheet(
      workbook,
      report.incidents
    );
  }

  // Acciones correctivas
  if (
    report.capabilities.corrective_actions &&
    report.corrective_actions
  ) {
    createCorrectiveActionsSheet(
      workbook,
      report.corrective_actions
    );
  }

  // Generar el contenido binario.
  const buffer =
    await workbook.xlsx.writeBuffer();

  if (!canDownload()) {
    throw new Error(
      "El contexto del reporte ha cambiado."
    );
  }

  const bytes = new Uint8Array(
    buffer.byteLength
  );

  bytes.set(new Uint8Array(buffer));

  const blob = new Blob(
    [bytes.buffer],
    {
      type: EXCEL_MIME,
    }
  );

  downloadReportBlob(
    blob,
    getReportFilename(metadata, "xlsx")
  );
}