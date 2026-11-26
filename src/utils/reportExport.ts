export type ReportExportMetadata = {
  organizationName: string;
  areaName: string;
  dateFrom: string;
  dateTo: string;
  scope: "all" | "own";
  generatedAt: Date;
};

export const REPORT_COLORS = {
  primary: "#16324F",
  secondary: "#0F9D8A",
  success: "#16803C",
  warning: "#B77900",
  error: "#B42318",
  info: "#2673C9",
  muted: "#81909D",
  background: "#F4F7FA",
  border: "#E1E8EF",
  white: "#FFFFFF",
} as const;

export const REPORT_LABELS = {
  inspectionStatus: {
    draft: "Borradores",
    completed: "Completadas",
    confirmed: "Confirmadas",
    rejected: "Rechazadas",
  },

  incidentStatus: {
    open: "Abiertas",
    in_progress: "En proceso",
    resolved: "Resueltas",
    closed: "Cerradas",
  },

  incidentRisk: {
    low: "Bajo",
    medium: "Medio",
    high: "Alto",
    critical: "Crítico",
  },

  correctiveActionStatus: {
    pending: "Pendientes",
    in_progress: "En proceso",
    completed: "Completadas",
    verified: "Verificadas",
  },
} as const;

export const REPORT_NOTES = {
  period:
    "Los indicadores reflejan el estado actual de los registros generados durante el periodo seleccionado.",

  completion:
    "Las inspecciones finalizadas incluyen las completadas, confirmadas y rechazadas.",

  approval:
    "La tasa de aprobación se calcula sobre las inspecciones revisadas por un supervisor.",

  verification:
    "La tasa de verificación corresponde a las acciones verificadas respecto al total de acciones correctivas.",

  overdue:
    "Las acciones vencidas son aquellas pendientes o en proceso cuya fecha límite es anterior a la fecha actual.",

  compliance:
    "La tasa de finalización no representa el cumplimiento de requisitos normativos.",

  permissions:
    "El reporte contiene únicamente información accesible según los permisos y las ubicaciones autorizadas del usuario.",
} as const;

export function formatReportDate(value: string): string {
  const parts = value.split("-");

  if (parts.length !== 3) {
    return value;
  }

  const [year, month, day] = parts;

  return `${day}/${month}/${year}`;
}

export function formatReportDateTime(value: Date): string {
  return value.toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatReportPercentage(
  value: number | null
): string {
  if (value === null || !Number.isFinite(value)) {
    return "Sin datos";
  }

  return `${new Intl.NumberFormat("es-MX", {
    maximumFractionDigits: 2,
  }).format(value)}%`;
}

export function calculateReportPercentage(
  count: number,
  total: number
): number | null {
  if (total <= 0) {
    return null;
  }

  return Math.round((count / total) * 10000) / 100;
}

export function toExcelPercentage(
  value: number | null
): number | null {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }

  return value / 100;
}

export function formatReportScope(
  scope: "all" | "own"
): string {
  return scope === "own"
    ? "Registros propios autorizados"
    : "Registros accesibles de la organización";
}

export function getReportFilename(
  metadata: ReportExportMetadata,
  extension: "pdf" | "xlsx"
): string {
  return (
    `INSPECTA-Reporte-${metadata.dateFrom}` +
    `_a_${metadata.dateTo}.${extension}`
  );
}

export function downloadReportBlob(
  blob: Blob,
  filename: string
): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);

  try {
    link.click();
  } finally {
    link.remove();

    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }
}