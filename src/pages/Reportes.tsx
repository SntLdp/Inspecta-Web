import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import AssessmentIcon from "@mui/icons-material/Assessment";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import DownloadIcon from "@mui/icons-material/Download";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import RefreshIcon from "@mui/icons-material/Refresh";

import { useOrganization } from "../contexts/OrganizationContext";
import { API_ACCESS_EVENT, getAuthToken, getOrganizationId } from "../api/client";
import type { ReportExportMetadata } from "../utils/reportExport";

import { getReportSummary } from "../services/reports.service";
import { getLocationAreas } from "../services/locations.service";

import type {
  ReportSummaryResponse,
  ReportPeriod,
} from "../types/reports";

import type { LocationAreaOption } from "../types/locations";

type Periodo =
  | "Esta semana"
  | "Este mes"
  | "Últimos 3 meses"
  | "Este año"
  | "Personalizado";

interface ReporteResumenProps {
  titulo: string;
  valor: string | number;
  descripcion: string;
  icon: ReactNode;
  color: string;
}

interface BarraProgresoProps {
  porcentaje: number;
  color: string;
}

interface DistribucionItemProps {
  nombre: string;
  cantidad: number;
  total: number;
  color: string;
}

const COLORS = {
  primary: "#16324F",
  blue: "#2673C9",
  green: "#16803C",
  teal: "#0F9D8A",
  yellow: "#F2A900",
  red: "#B42318",
  darkRed: "#7A1A13",
  border: "#DCE6EE",
  background: "#F4F7FA",
};

/**
 * Convierte una fecha local a YYYY-MM-DD sin
 * realizar conversiones a UTC.
 */
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * Obtiene el rango de fechas correspondiente
 * al periodo seleccionado.
 */
function getPeriodDates(
  periodo: Exclude<Periodo, "Personalizado">
): ReportPeriod {
  const today = new Date();

  const start = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  switch (periodo) {
    case "Esta semana": {
      const day = start.getDay();

      const difference = (day + 6) % 7;

      start.setDate(
        start.getDate() - difference
      );

      break;
    }

    case "Este mes":
      start.setDate(1);
      break;

    case "Últimos 3 meses":
      start.setDate(1);
      start.setMonth(start.getMonth() - 2);
      break;

    case "Este año":
      start.setMonth(0, 1);
      break;
  }

  return {
    date_from: formatLocalDate(start),
    date_to: formatLocalDate(today),
  };
}

/**
 * Formatea fechas YYYY-MM-DD para mostrarlas
 * en formato DD/MM/YYYY.
 */
function formatDisplayDate(date: string): string {
  const [year, month, day] = date.split("-");

  return `${day}/${month}/${year}`;
}

/**
 * Distingue una tasa sin datos de una tasa
 * calculada cuyo resultado es cero.
 */
function formatPercentage(
  value: number | null
): string {
  if (value === null) {
    return "Sin datos";
  }

  return `${Number(value.toFixed(2))}%`;
}

function calculatePercentage(
  count: number,
  total: number
): number {
  if (total === 0) {
    return 0;
  }

  return Math.round(
    (count / total) * 10000
  ) / 100;
}

function getErrorMessage(
  error: unknown,
  fallback: string
): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

/**
 * Tarjeta de indicador principal.
 */
function ReporteResumen({
  titulo,
  valor,
  descripcion,
  icon,
  color,
}: ReporteResumenProps) {
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent
        sx={{
          p: 2.5,
          "&:last-child": { pb: 2.5 },
        }}
      >
        <Stack
          direction="row"
          spacing={2}
          sx={{
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box>
            <Typography
              sx={{
                fontSize: 13,
                color: "text.secondary",
                mb: 0.25,
              }}
            >
              {titulo}
            </Typography>

            <Typography
              sx={{
                fontSize:
                  valor === "Sin datos" ? 22 : 30,
                lineHeight: 1.05,
                fontWeight: 700,
                color:
                  valor === "Sin datos"
                    ? "text.secondary"
                    : COLORS.primary,
              }}
            >
              {valor}
            </Typography>

            <Typography
              sx={{
                fontSize: 12,
                color: "text.secondary",
                mt: 0.35,
              }}
            >
              {descripcion}
            </Typography>
          </Box>

          <Box
            sx={{
              width: 46,
              height: 46,
              flexShrink: 0,
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: `${color}15`,
              color,
            }}
          >
            {icon}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

/**
 * Barra de progreso reutilizable.
 */
function BarraProgreso({
  porcentaje,
  color,
}: BarraProgresoProps) {
  const safePercentage = Math.min(
    100,
    Math.max(0, porcentaje)
  );

  return (
    <Box
      role="progressbar"
      aria-valuenow={safePercentage}
      aria-valuemin={0}
      aria-valuemax={100}
      sx={{
        width: "100%",
        height: 9,
        borderRadius: 4,
        backgroundColor: COLORS.background,
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          width: `${safePercentage}%`,
          height: "100%",
          backgroundColor: color,
          borderRadius: 4,
          transition: "width 0.3s ease",
        }}
      />
    </Box>
  );
}

/**
 * Elemento de distribución con cantidad,
 * porcentaje y barra de progreso.
 */
function DistribucionItem({
  nombre,
  cantidad,
  total,
  color,
}: DistribucionItemProps) {
  const porcentaje = calculatePercentage(
    cantidad,
    total
  );

  return (
    <Box>
      <Stack
        direction="row"
        sx={{
          justifyContent: "space-between",
          alignItems: "center",
          mb: 0.35,
        }}
      >
        <Typography sx={{ fontSize: 12 }}>
          {nombre}
        </Typography>

        <Typography
          sx={{
            fontSize: 12,
            color: "text.secondary",
          }}
        >
          {cantidad} ({formatPercentage(porcentaje)})
        </Typography>
      </Stack>

      <BarraProgreso
        porcentaje={porcentaje}
        color={color}
      />
    </Box>
  );
}

/**
 * Componente principal del módulo de reportes.
 */
export default function Reportes() {
  const organizationId = localStorage.getItem(
    "inspecta_organization_id"
  );

  const { organization, capabilities, loading: organizationLoading } = useOrganization();
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const exportLock = useRef(false);
  const exportContext = useRef<object | null>(null);

  const [periodo, setPeriodo] =
    useState<Periodo>("Este mes");

  const [area, setArea] = useState("");

  const [fechaInicial, setFechaInicial] =
    useState(
      () => getPeriodDates("Este mes").date_from
    );

  const [fechaFinal, setFechaFinal] =
    useState(
      () => getPeriodDates("Este mes").date_to
    );

  const [areas, setAreas] =
    useState<LocationAreaOption[]>([]);

  const [report, setReport] =
    useState<ReportSummaryResponse | null>(null);

  const [loading, setLoading] = useState(true);

  const [loadingAreas, setLoadingAreas] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [locationsError, setLocationsError] =
    useState<string | null>(null);

  const [reloadKey, setReloadKey] = useState(0);

  /*
  |--------------------------------------------------------------------------
  | Periodo seleccionado
  |--------------------------------------------------------------------------
  */

  const fechas = useMemo<ReportPeriod>(() => {
    if (periodo === "Personalizado") {
      return {
        date_from: fechaInicial,
        date_to: fechaFinal,
      };
    }

    return getPeriodDates(periodo);
  }, [
    periodo,
    fechaInicial,
    fechaFinal,
    reloadKey,
  ]);

  const validPeriod =
    Boolean(fechas.date_from) &&
    Boolean(fechas.date_to) &&
    fechas.date_from <= fechas.date_to;

  /*
  |--------------------------------------------------------------------------
  | Consulta de ubicaciones
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const controller = new AbortController();

    setAreas([]);
    setArea("");
    setLocationsError(null);

    if (!organizationId) {
      setLoadingAreas(false);

      return () => controller.abort();
    }

    setLoadingAreas(true);

    const isCurrentRequest = () =>
      !controller.signal.aborted &&
      localStorage.getItem(
        "inspecta_organization_id"
      ) === organizationId;

    async function loadAreas() {
      try {
        const response = await getLocationAreas(
          controller.signal
        );

        if (!isCurrentRequest()) {
          return;
        }

        setAreas(response);
      } catch (err) {
        if (!isCurrentRequest()) {
          return;
        }

        const status = (
          err as { status?: number } | null
        )?.status;

        if (status === 403) {
          setLocationsError(
            "No tienes permisos para consultar las ubicaciones. " +
            "Puedes consultar el reporte general."
          );
        } else {
          setLocationsError(
            getErrorMessage(
              err,
              "No fue posible cargar las áreas."
            )
          );
        }

        setAreas([]);
        setArea("");
      } finally {
        if (isCurrentRequest()) {
          setLoadingAreas(false);
        }
      }
    }

    void loadAreas();

    return () => controller.abort();
  }, [organizationId]);

  /*
  |--------------------------------------------------------------------------
  | Consulta del reporte estadístico
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const controller = new AbortController();

    setReport(null);
    setError(null);

    if (!organizationId) {
      setLoading(false);

      setError(
        "No hay una organización activa."
      );

      return () => controller.abort();
    }

    if (!validPeriod) {
      setLoading(false);

      return () => controller.abort();
    }

    setLoading(true);

    const isCurrentRequest = () =>
      !controller.signal.aborted &&
      localStorage.getItem(
        "inspecta_organization_id"
      ) === organizationId;

    async function loadReport() {
      try {
        const response = await getReportSummary(
          {
            date_from: fechas.date_from,
            date_to: fechas.date_to,
            ...(area ? { area_id: area } : {}),
          },
          controller.signal
        );

        if (!isCurrentRequest()) {
          return;
        }

        if (
          response.organization_id !== organizationId
        ) {
          throw new Error(
            "El reporte recibido no corresponde " +
            "a la organización activa."
          );
        }

        setReport(response);
      } catch (err) {
        if (!isCurrentRequest()) {
          return;
        }

        setError(
          getErrorMessage(
            err,
            "No fue posible cargar el reporte."
          )
        );
      } finally {
        if (isCurrentRequest()) {
          setLoading(false);
        }
      }
    }

    void loadReport();

    return () => controller.abort();
  }, [
    organizationId,
    fechas.date_from,
    fechas.date_to,
    area,
    validPeriod,
    reloadKey,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Datos derivados de la respuesta
  |--------------------------------------------------------------------------
  */

  const selectedArea = areas.find(
    (item) => item.id === area
  );

  const areaName = selectedArea
    ? selectedArea.name
    : "Todas las áreas";

  const reportMatchesFilters =
    report !== null &&
    report.organization_id === organizationId &&
    report.period.date_from === fechas.date_from &&
    report.period.date_to === fechas.date_to &&
    report.filters.area_id === (area || null);

  const currentReport = reportMatchesFilters
    ? report
    : null;

  const inspections =
    currentReport?.capabilities.inspections
      ? currentReport.inspections
      : null;

  const incidents =
    currentReport?.capabilities.incidents
      ? currentReport.incidents
      : null;

  const actions =
    currentReport?.capabilities.corrective_actions
      ? currentReport.corrective_actions
      : null;

  const hasVisibleSections = Boolean(
    inspections || incidents || actions
  );

  const canExport = Boolean(
    currentReport && hasVisibleSections && validPeriod && !loading && !error &&
    !organizationLoading && organization && organization.id === organizationId &&
    capabilities && capabilities.organization_id === organizationId && capabilities.modules.reports &&
    (!inspections || capabilities.modules.inspections) &&
    (!incidents || capabilities.modules.incidents) &&
    (!actions || capabilities.modules.corrective_actions) &&
    (!area || selectedArea)
  );

  // Invalidar cualquier exportación iniciada con otro contexto.
  useLayoutEffect(() => {
    exportContext.current = canExport ? {} : null;
    setExportError(null);
    const invalidate = () => { exportContext.current = null; };
    window.addEventListener(API_ACCESS_EVENT, invalidate);
    return () => {
      invalidate();
      window.removeEventListener(API_ACCESS_EVENT, invalidate);
    };
  }, [canExport, currentReport, organization, capabilities, area, fechas.date_from, fechas.date_to, reloadKey]);

  async function handleExport(format: "pdf" | "excel") {
    const context = exportContext.current;
    const token = getAuthToken();
    if (!canExport || !currentReport || !organization || !context || !token ||
        getOrganizationId() !== organization.id || exportLock.current) return;

    const canDownload = () => exportContext.current === context &&
      getAuthToken() === token && getOrganizationId() === organization.id;

    const metadata: ReportExportMetadata = {
      organizationName: organization.name,
      areaName: selectedArea ? `${selectedArea.name} — ${selectedArea.plant_name}` : "Todas las áreas",
      dateFrom: currentReport.period.date_from,
      dateTo: currentReport.period.date_to,
      scope: currentReport.scope,
      generatedAt: new Date(),
    };

    exportLock.current = true;
    setExporting(format);
    setExportError(null);
    try {
      if (format === "pdf") {
        const { exportReportPdf } = await import("../utils/reportPdf");
        if (canDownload()) await exportReportPdf(currentReport, metadata, canDownload);
      } else {
        const { exportReportExcel } = await import("../utils/reportExcel");
        if (canDownload()) await exportReportExcel(currentReport, metadata, canDownload);
      }
    } catch (err) {
      if (canDownload()) setExportError(getErrorMessage(err, "No fue posible generar el archivo."));
    } finally {
      exportLock.current = false;
      setExporting(null);
    }
  }

  const severidades = incidents
    ? [
      {
        nombre: "Bajo",
        cantidad: incidents.by_risk_level.low,
        color: COLORS.blue,
      },
      {
        nombre: "Medio",
        cantidad: incidents.by_risk_level.medium,
        color: COLORS.yellow,
      },
      {
        nombre: "Alto",
        cantidad: incidents.by_risk_level.high,
        color: COLORS.red,
      },
      {
        nombre: "Crítico",
        cantidad: incidents.by_risk_level.critical,
        color: COLORS.darkRed,
      },
    ]
    : [];

  const accionesEstado = actions
    ? [
      {
        nombre: "Pendientes",
        cantidad: actions.by_status.pending,
        color: COLORS.blue,
      },
      {
        nombre: "En proceso",
        cantidad: actions.by_status.in_progress,
        color: COLORS.blue,
      },
      {
        nombre: "Completadas",
        cantidad: actions.by_status.completed,
        color: COLORS.teal,
      },
      {
        nombre: "Verificadas",
        cantidad: actions.by_status.verified,
        color: COLORS.green,
      },
    ]
    : [];

  const inspeccionesEstado = inspections
    ? [
      {
        nombre: "Borradores",
        cantidad: inspections.by_status.draft,
        color: COLORS.blue,
      },
      {
        nombre: "Completadas",
        cantidad: inspections.by_status.completed,
        color: COLORS.teal,
      },
      {
        nombre: "Confirmadas",
        cantidad: inspections.by_status.confirmed,
        color: COLORS.green,
      },
      {
        nombre: "Rechazadas",
        cantidad: inspections.by_status.rejected,
        color: COLORS.red,
      },
    ]
    : [];

  /*
  |--------------------------------------------------------------------------
  | Eventos de interfaz
  |--------------------------------------------------------------------------
  */

  function handlePeriodChange(value: Periodo) {
    if (value === "Personalizado") {
      setFechaInicial(fechas.date_from);
      setFechaFinal(fechas.date_to);
    }

    setPeriodo(value);
  }

  function handleReload() {
    setReport(null);
    setError(null);
    setLoading(true);

    setReloadKey((previous) => previous + 1);
  }

  /*
  |--------------------------------------------------------------------------
  | Renderizado
  |--------------------------------------------------------------------------
  */

  return (
    <Box sx={{ width: "100%" }}>
      {/* Encabezado */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{
          justifyContent: "space-between",
          alignItems: {
            xs: "stretch",
            sm: "center",
          },
          mb: 2.5,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: COLORS.primary,
            }}
          >
            Reportes
          </Typography>

          <Typography
            sx={{
              color: "text.secondary",
              fontSize: 14,
              mt: 0.25,
            }}
          >
            Consulta y análisis de los indicadores
            de seguridad e higiene.
          </Typography>
        </Box>

        <Stack
          direction="row"
          spacing={1.25}
          sx={{ flexWrap: "wrap" }}
        >
          <Button
            variant="outlined"
            size="small"
            startIcon={exporting === "pdf" ? <CircularProgress size={16} color="inherit" /> : <PictureAsPdfIcon />}
            onClick={() => void handleExport("pdf")}
            disabled={!canExport || exporting !== null}
            sx={{
              color: COLORS.primary,
              borderColor: COLORS.border,
            }}
          >
            {exporting === "pdf" ? "Generando PDF..." : "Exportar PDF"}
          </Button>

          <Button
            variant="contained"
            size="small"
            startIcon={exporting === "excel" ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
            onClick={() => void handleExport("excel")}
            disabled={!canExport || exporting !== null}
            sx={{
              backgroundColor: COLORS.primary,
              "&:hover": {
                backgroundColor: "#0F263D",
              },
            }}
          >
            {exporting === "excel" ? "Generando Excel..." : "Exportar Excel"}
          </Button>
        </Stack>
      </Stack>

      {exportError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setExportError(null)}>
          {exportError}
        </Alert>
      )}

      {/* Filtros compactos */}
      <Card sx={{ mb: 2 }}>
        <CardContent
          sx={{
            p: 2,
            "&:last-child": { pb: 2 },
          }}
        >
          <Stack
            direction={{
              xs: "column",
              md: "row",
            }}
            spacing={2}
            sx={{
              alignItems: {
                xs: "stretch",
                md: "center",
              },
            }}
          >
            {/* Periodo */}
            <FormControl
              size="small"
              sx={{
                minWidth: {
                  xs: "100%",
                  md: 180,
                },
              }}
            >
              <InputLabel id="report-period-label">
                Periodo
              </InputLabel>

              <Select
                labelId="report-period-label"
                value={periodo}
                label="Periodo"
                onChange={(event) =>
                  handlePeriodChange(
                    event.target.value as Periodo
                  )
                }
              >
                <MenuItem value="Esta semana">
                  Esta semana
                </MenuItem>

                <MenuItem value="Este mes">
                  Este mes
                </MenuItem>

                <MenuItem value="Últimos 3 meses">
                  Últimos 3 meses
                </MenuItem>

                <MenuItem value="Este año">
                  Este año
                </MenuItem>

                <MenuItem value="Personalizado">
                  Personalizado
                </MenuItem>
              </Select>
            </FormControl>

            {/* Área */}
            <FormControl
              size="small"
              disabled={
                loadingAreas ||
                Boolean(locationsError) ||
                areas.length === 0
              }
              sx={{
                minWidth: {
                  xs: "100%",
                  md: 220,
                },
                maxWidth: {
                  xs: "100%",
                  md: 320,
                },
              }}
            >
              <InputLabel id="report-area-label" shrink>
                Área
              </InputLabel>

              <Select
                labelId="report-area-label"
                value={area}
                label="Área"
                displayEmpty
                onChange={(event) =>
                  setArea(event.target.value)
                }
              >
                <MenuItem value="">
                  {loadingAreas
                    ? "Cargando áreas..."
                    : "Todas"}
                </MenuItem>

                {areas.map((item) => (
                  <MenuItem
                    key={item.id}
                    value={item.id}
                  >
                    {item.name} — {item.plant_name}
                    {!item.status
                      ? " (Inactiva)"
                      : ""}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Actualizar reporte */}
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={handleReload}
              disabled={loading || !validPeriod}
              sx={{
                color: COLORS.primary,
                borderColor: COLORS.border,
                minHeight: 38,
              }}
            >
              Actualizar
            </Button>

            {/* Descripción del periodo */}
            <Box
              sx={{
                flex: 1,
                textAlign: {
                  xs: "left",
                  md: "right",
                },
              }}
            >
              <Typography
                sx={{
                  fontSize: 13,
                  color: "text.secondary",
                }}
              >
                Mostrando información de{" "}
                <strong>{areaName}</strong>.
              </Typography>

              {validPeriod && (
                <Typography
                  sx={{
                    fontSize: 12,
                    color: "text.secondary",
                    mt: 0.25,
                  }}
                >
                  {formatDisplayDate(
                    fechas.date_from
                  )}{" "}
                  —{" "}
                  {formatDisplayDate(
                    fechas.date_to
                  )}
                </Typography>
              )}
            </Box>
          </Stack>

          {/* Periodo personalizado */}
          {periodo === "Personalizado" && (
            <Stack
              direction={{
                xs: "column",
                sm: "row",
              }}
              spacing={2}
              sx={{ mt: 2 }}
            >
              <TextField
                label="Fecha inicial"
                type="date"
                size="small"
                value={fechaInicial}
                onChange={(event) =>
                  setFechaInicial(
                    event.target.value
                  )
                }
                error={!validPeriod}
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                  htmlInput: {
                    max: fechaFinal || undefined,
                  },
                }}
                sx={{
                  minWidth: {
                    xs: "100%",
                    sm: 180,
                  },
                }}
              />

              <TextField
                label="Fecha final"
                type="date"
                size="small"
                value={fechaFinal}
                onChange={(event) =>
                  setFechaFinal(
                    event.target.value
                  )
                }
                error={!validPeriod}
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                  htmlInput: {
                    min: fechaInicial || undefined,
                  },
                }}
                sx={{
                  minWidth: {
                    xs: "100%",
                    sm: 180,
                  },
                }}
              />
            </Stack>
          )}

          {locationsError && (
            <Alert
              severity="warning"
              sx={{ mt: 2 }}
            >
              {locationsError}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Validación de fechas */}
      {!validPeriod && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
        >
          Selecciona un periodo válido. La fecha
          final debe ser igual o posterior a la
          fecha inicial.
        </Alert>
      )}

      {/* Estado de carga */}
      {loading && validPeriod && (
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ py: 5 }}>
            <Stack
              spacing={2}
              sx={{
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CircularProgress
                size={34}
                sx={{ color: COLORS.primary }}
              />

              <Typography
                sx={{
                  fontSize: 14,
                  color: "text.secondary",
                }}
              >
                Cargando indicadores del reporte...
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Error de consulta */}
      {!loading && error && validPeriod && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={handleReload}
            >
              Reintentar
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Reporte cargado */}
      {!loading &&
        !error &&
        validPeriod &&
        currentReport && (
          <>
            {/* Alcance de permisos */}
            {currentReport.scope === "own" && (
              <Alert
                severity="info"
                sx={{ mb: 2 }}
              >
                El reporte muestra únicamente
                los registros propios que tienes
                autorizados.
              </Alert>
            )}

            {/* Usuario sin módulos operativos */}
            {!hasVisibleSections && (
              <Alert severity="info">
                No tienes permisos para consultar
                los indicadores de inspecciones,
                incidencias o acciones correctivas.
              </Alert>
            )}

            {/* Indicadores principales */}
            {hasVisibleSections && (
              <Grid
                container
                spacing={2}
                sx={{ mb: 2 }}
              >
                {inspections && (
                  <Grid
                    size={{
                      xs: 12,
                      sm: 6,
                      md: 3,
                    }}
                  >
                    <ReporteResumen
                      titulo="Inspecciones"
                      valor={inspections.total}
                      descripcion="Registradas"
                      color={COLORS.primary}
                      icon={<AssessmentIcon />}
                    />
                  </Grid>
                )}

                {incidents && (
                  <Grid
                    size={{
                      xs: 12,
                      sm: 6,
                      md: 3,
                    }}
                  >
                    <ReporteResumen
                      titulo="Incidencias"
                      valor={incidents.total}
                      descripcion={`${incidents.critical} ${incidents.critical === 1 ? "crítica" : "críticas"
                        }`}
                      color={COLORS.red}
                      icon={<WarningAmberIcon />}
                    />
                  </Grid>
                )}

                {actions && (
                  <Grid
                    size={{
                      xs: 12,
                      sm: 6,
                      md: 3,
                    }}
                  >
                    <ReporteResumen
                      titulo="Acciones correctivas"
                      valor={actions.total}
                      descripcion={`${actions.overdue} ${actions.overdue === 1 ? "vencida" : "vencidas"
                        }`}
                      color={COLORS.blue}
                      icon={
                        <AssignmentTurnedInIcon />
                      }
                    />
                  </Grid>
                )}

                {inspections && (
                  <Grid
                    size={{
                      xs: 12,
                      sm: 6,
                      md: 3,
                    }}
                  >
                    <ReporteResumen
                      titulo="Finalización"
                      valor={formatPercentage(
                        inspections.completion_rate
                      )}
                      descripcion="Inspecciones finalizadas"
                      color={COLORS.green}
                      icon={<CheckCircleIcon />}
                    />
                  </Grid>
                )}
              </Grid>
            )}

            {/* Finalización + severidad */}
            {(inspections || incidents) && (
              <Grid
                container
                spacing={2}
                sx={{ mb: 2 }}
              >
                {/* Finalización de inspecciones */}
                {inspections && (
                  <Grid
                    size={{
                      xs: 12,
                      md: incidents ? 7 : 12,
                    }}
                  >
                    <Card sx={{ height: "100%" }}>
                      <CardContent
                        sx={{
                          p: 2.5,
                          "&:last-child": {
                            pb: 2.5,
                          },
                        }}
                      >
                        <Stack
                          direction={{
                            xs: "column",
                            sm: "row",
                          }}
                          spacing={2}
                          sx={{
                            alignItems: {
                              xs: "stretch",
                              sm: "center",
                            },
                          }}
                        >
                          <Box sx={{ flex: 1 }}>
                            <Stack
                              direction="row"
                              spacing={1}
                              sx={{
                                justifyContent:
                                  "space-between",
                                alignItems: "center",
                                mb: 0.75,
                              }}
                            >
                              <Box>
                                <Typography
                                  sx={{
                                    fontSize: 18,
                                    fontWeight: 700,
                                    color:
                                      COLORS.primary,
                                  }}
                                >
                                  Finalización de
                                  inspecciones
                                </Typography>

                                <Typography
                                  sx={{
                                    fontSize: 13,
                                    color:
                                      "text.secondary",
                                    mt: 0.25,
                                  }}
                                >
                                  Porcentaje de
                                  inspecciones cuya
                                  ejecución ha
                                  finalizado.
                                </Typography>
                              </Box>

                              <Typography
                                sx={{
                                  fontSize:
                                    inspections.completion_rate === null
                                      ? 16
                                      : 24,
                                  fontWeight: 700,
                                  color:
                                    inspections.completion_rate === null
                                      ? "text.secondary"
                                      : COLORS.green,
                                  flexShrink: 0,
                                }}
                              >
                                {formatPercentage(
                                  inspections.completion_rate
                                )}
                              </Typography>
                            </Stack>

                            <BarraProgreso
                              porcentaje={
                                inspections.completion_rate ??
                                0
                              }
                              color={COLORS.green}
                            />
                          </Box>

                          <Divider
                            orientation="vertical"
                            flexItem
                            sx={{
                              display: {
                                xs: "none",
                                sm: "block",
                              },
                            }}
                          />

                          <Box
                            sx={{
                              minWidth: {
                                xs: "100%",
                                sm: 130,
                              },
                            }}
                          >
                            <Typography
                              sx={{
                                fontSize: 13,
                                color:
                                  "text.secondary",
                              }}
                            >
                              Inspecciones finalizadas
                            </Typography>

                            <Typography
                              sx={{
                                fontSize: 24,
                                fontWeight: 700,
                                color: COLORS.primary,
                                mt: 0.25,
                              }}
                            >
                              {inspections.finalized}

                              <Typography
                                component="span"
                                sx={{
                                  fontSize: 13,
                                  color:
                                    "text.secondary",
                                  ml: 0.5,
                                }}
                              >
                                / {inspections.total}
                              </Typography>
                            </Typography>
                          </Box>
                        </Stack>

                        <Divider sx={{ my: 2 }} />

                        {/* Estados de inspecciones */}
                        <Typography
                          sx={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: COLORS.primary,
                            mb: 1.25,
                          }}
                        >
                          Distribución por estado
                        </Typography>

                        <Grid
                          container
                          spacing={1.5}
                        >
                          {inspeccionesEstado.map(
                            (item) => (
                              <Grid
                                key={item.nombre}
                                size={{
                                  xs: 12,
                                  sm: 6,
                                }}
                              >
                                <DistribucionItem
                                  nombre={item.nombre}
                                  cantidad={
                                    item.cantidad
                                  }
                                  total={
                                    inspections.total
                                  }
                                  color={item.color}
                                />
                              </Grid>
                            )
                          )}
                        </Grid>

                        <Divider sx={{ my: 1.5 }} />

                        {/* Aprobación */}
                        <Stack
                          direction="row"
                          spacing={1}
                          sx={{
                            justifyContent:
                              "space-between",
                            alignItems: "center",
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: 13,
                              color:
                                "text.secondary",
                            }}
                          >
                            Tasa de aprobación
                          </Typography>

                          <Typography
                            sx={{
                              fontSize: 16,
                              fontWeight: 700,
                              color:
                                inspections.approval_rate === null
                                  ? "text.secondary"
                                  : COLORS.green,
                            }}
                          >
                            {formatPercentage(
                              inspections.approval_rate
                            )}
                          </Typography>
                        </Stack>

                        <Typography
                          sx={{
                            fontSize: 12,
                            color: "text.secondary",
                            mt: 0.5,
                          }}
                        >
                          {inspections.by_status.confirmed}{" "}
                          confirmadas de{" "}
                          {inspections.reviewed}{" "}
                          inspecciones revisadas.
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {/* Incidencias por severidad */}
                {incidents && (
                  <Grid
                    size={{
                      xs: 12,
                      md: inspections ? 5 : 12,
                    }}
                  >
                    <Card sx={{ height: "100%" }}>
                      <CardContent
                        sx={{
                          p: 2.5,
                          "&:last-child": {
                            pb: 2.5,
                          },
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: 18,
                            fontWeight: 700,
                            color: COLORS.primary,
                          }}
                        >
                          Incidencias por severidad
                        </Typography>

                        <Typography
                          sx={{
                            fontSize: 13,
                            color: "text.secondary",
                            mt: 0.25,
                            mb: 1.5,
                          }}
                        >
                          Clasificación de las
                          incidencias registradas.
                        </Typography>

                        <Grid
                          container
                          spacing={1.25}
                        >
                          {severidades.map((item) => (
                            <Grid
                              key={item.nombre}
                              size={{
                                xs: 6,
                                sm: 3,
                                md: inspections
                                  ? 6
                                  : 3,
                              }}
                            >
                              <Box
                                sx={{
                                  border: `1px solid ${COLORS.border}`,
                                  borderRadius: 2,
                                  p: 1.5,
                                  height: "100%",
                                  boxSizing:
                                    "border-box",
                                }}
                              >
                                <Stack
                                  direction="row"
                                  sx={{
                                    justifyContent:
                                      "space-between",
                                    alignItems:
                                      "center",
                                  }}
                                >
                                  <Chip
                                    label={
                                      item.nombre
                                    }
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                      color:
                                        item.color,
                                      borderColor:
                                        item.color,
                                      fontSize: 12,
                                    }}
                                  />

                                  <Typography
                                    sx={{
                                      fontSize: 22,
                                      fontWeight: 700,
                                      color:
                                        COLORS.primary,
                                    }}
                                  >
                                    {item.cantidad}
                                  </Typography>
                                </Stack>
                              </Box>
                            </Grid>
                          ))}
                        </Grid>

                        <Divider sx={{ my: 2 }} />

                        {/* Resumen de estado */}
                        <Grid
                          container
                          spacing={1.25}
                        >
                          <Grid size={6}>
                            <Typography
                              sx={{
                                fontSize: 13,
                                color:
                                  "text.secondary",
                              }}
                            >
                              Abiertas / En proceso
                            </Typography>

                            <Typography
                              sx={{
                                fontSize: 24,
                                fontWeight: 700,
                                color: COLORS.red,
                              }}
                            >
                              {incidents.open}
                            </Typography>
                          </Grid>

                          <Grid size={6}>
                            <Typography
                              sx={{
                                fontSize: 13,
                                color:
                                  "text.secondary",
                              }}
                            >
                              Resueltas / Cerradas
                            </Typography>

                            <Typography
                              sx={{
                                fontSize: 24,
                                fontWeight: 700,
                                color: COLORS.green,
                              }}
                            >
                              {incidents.resolved}
                            </Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </Grid>
            )}

            {/* Incidencias por área + acciones */}
            {(incidents || actions) && (
              <Grid container spacing={2}>
                {/* Incidencias por área */}
                {incidents && (
                  <Grid
                    size={{
                      xs: 12,
                      md: actions ? 7 : 12,
                    }}
                  >
                    <Card sx={{ height: "100%" }}>
                      <CardContent
                        sx={{
                          p: 2.5,
                          "&:last-child": {
                            pb: 2.5,
                          },
                        }}
                      >
                        <Stack
                          direction="row"
                          sx={{
                            justifyContent:
                              "space-between",
                            alignItems: "center",
                            mb: 1.5,
                          }}
                        >
                          <Box>
                            <Typography
                              sx={{
                                fontSize: 18,
                                fontWeight: 700,
                                color: COLORS.primary,
                              }}
                            >
                              Incidencias por área
                            </Typography>

                            <Typography
                              sx={{
                                fontSize: 13,
                                color:
                                  "text.secondary",
                                mt: 0.25,
                              }}
                            >
                              Distribución de
                              incidencias detectadas.
                            </Typography>
                          </Box>

                          <TrendingUpIcon
                            sx={{
                              color: COLORS.primary,
                              fontSize: 20,
                            }}
                          />
                        </Stack>

                        {incidents.by_area.length ===
                          0 ? (
                          <Box
                            sx={{
                              py: 4,
                              textAlign: "center",
                            }}
                          >
                            <Typography
                              sx={{
                                fontSize: 13,
                                color:
                                  "text.secondary",
                              }}
                            >
                              No se registraron
                              incidencias durante el
                              periodo seleccionado.
                            </Typography>
                          </Box>
                        ) : (
                          <Stack spacing={1.25}>
                            {incidents.by_area.map(
                              (item, index) => (
                                <Box key={item.area_id}>
                                  <Stack
                                    direction="row"
                                    spacing={1}
                                    sx={{
                                      justifyContent:
                                        "space-between",
                                      alignItems:
                                        "center",
                                      mb: 0.35,
                                    }}
                                  >
                                    <Typography
                                      sx={{
                                        fontSize: 13,
                                        fontWeight:
                                          index === 0
                                            ? 700
                                            : 500,
                                      }}
                                    >
                                      {item.area_name}
                                    </Typography>

                                    <Typography
                                      sx={{
                                        fontSize: 12,
                                        color:
                                          "text.secondary",
                                      }}
                                    >
                                      {item.count}{" "}
                                      {item.count === 1
                                        ? "incidencia"
                                        : "incidencias"}
                                    </Typography>
                                  </Stack>

                                  <BarraProgreso
                                    porcentaje={
                                      item.percentage ??
                                      0
                                    }
                                    color={
                                      index === 0
                                        ? COLORS.primary
                                        : COLORS.teal
                                    }
                                  />
                                </Box>
                              )
                            )}
                          </Stack>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {/* Estado de acciones correctivas */}
                {actions && (
                  <Grid
                    size={{
                      xs: 12,
                      md: incidents ? 5 : 12,
                    }}
                  >
                    <Card sx={{ height: "100%" }}>
                      <CardContent
                        sx={{
                          p: 2.5,
                          "&:last-child": {
                            pb: 2.5,
                          },
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: 18,
                            fontWeight: 700,
                            color: COLORS.primary,
                          }}
                        >
                          Estado de acciones
                          correctivas
                        </Typography>

                        <Typography
                          sx={{
                            fontSize: 13,
                            color: "text.secondary",
                            mt: 0.25,
                            mb: 1.5,
                          }}
                        >
                          Seguimiento de las acciones
                          generadas.
                        </Typography>

                        <Stack spacing={1.25}>
                          {accionesEstado.map(
                            (item) => (
                              <DistribucionItem
                                key={item.nombre}
                                nombre={item.nombre}
                                cantidad={
                                  item.cantidad
                                }
                                total={actions.total}
                                color={item.color}
                              />
                            )
                          )}
                        </Stack>

                        <Divider sx={{ my: 1.5 }} />

                        <Typography
                          sx={{
                            fontSize: 13,
                            color: "text.secondary",
                          }}
                        >
                          Porcentaje de acciones
                          verificadas:{" "}
                          <strong>
                            {formatPercentage(
                              actions.verification_rate
                            )}
                          </strong>
                        </Typography>

                        <Typography
                          sx={{
                            fontSize: 13,
                            color: "text.secondary",
                            mt: 0.75,
                          }}
                        >
                          Acciones pendientes:{" "}
                          <strong>
                            {actions.pending}
                          </strong>
                        </Typography>

                        <Typography
                          sx={{
                            fontSize: 13,
                            color:
                              actions.overdue > 0
                                ? COLORS.red
                                : "text.secondary",
                            mt: 0.75,
                          }}
                        >
                          Acciones vencidas:{" "}
                          <strong>
                            {actions.overdue}
                          </strong>
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </Grid>
            )}

            {/* Nota sobre interpretación del reporte */}
            {hasVisibleSections && (
              <Typography
                sx={{
                  fontSize: 12,
                  color: "text.secondary",
                  mt: 2,
                }}
              >
                Los indicadores reflejan el estado
                actual de los registros generados
                durante el periodo seleccionado.
                Las acciones vencidas se calculan
                respecto a la fecha actual.
              </Typography>
            )}
          </>
        )}
    </Box>
  );
}