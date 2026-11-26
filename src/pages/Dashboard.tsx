import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IonIcon } from "@ionic/react";

import {
  shieldCheckmarkOutline,
  warningOutline,
  clipboardOutline,
  checkmarkDoneOutline,
  arrowUpOutline,
  arrowDownOutline,
  chevronForwardOutline,
  statsChartOutline,
} from "ionicons/icons";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";

import {
  Alert,
  CircularProgress,
} from "@mui/material";

import {
  getDashboard,
  type DashboardResponse,
  type DashboardRiskLevel,
  type DashboardInspectionStatus,
  type DashboardGranularity,
  type DashboardApprovalTrendPoint,
} from "../services/dashboard.service";

import { getStoredUser } from "../services/auth.service";
import { getOrganizationId } from "../api/client";

/* =====================================================
   CONSTANTES
   ===================================================== */

const riskLabels: Record<DashboardRiskLevel, string> = {
  low: "Bajo",
  medium: "Medio",
  high: "Alto",
  critical: "Crítico",
};

const inspectionStatuses: Record<
  DashboardInspectionStatus,
  { label: string; color: string }
> = {
  draft: {
    label: "Borrador",
    color: "low",
  },
  completed: {
    label: "Por revisar",
    color: "medium",
  },
  confirmed: {
    label: "Aprobada",
    color: "success",
  },
  rejected: {
    label: "Rechazada",
    color: "critical",
  },
};

const numberFormatter = new Intl.NumberFormat("es-MX", {
  maximumFractionDigits: 2,
});

const granularityOptions: {
  value: DashboardGranularity;
  label: string;
}[] = [
    {
      value: "weekly",
      label: "Semanal",
    },
    {
      value: "monthly",
      label: "Mensual",
    },
    {
      value: "yearly",
      label: "Anual",
    },
  ];

const approvalEmptyMessages: Record<
  DashboardGranularity,
  string
> = {
  weekly:
    "No hay inspecciones revisadas durante el mes seleccionado.",

  monthly:
    "No hay inspecciones revisadas durante los últimos cinco meses del periodo seleccionado.",

  yearly:
    "No hay inspecciones revisadas durante los cinco años del periodo seleccionado.",
};

/* =====================================================
   FUNCIONES AUXILIARES
   ===================================================== */

function getCurrentMonth(): string {
  const now = new Date();

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;
}

function getGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";

  return "Buenas noches";
}

function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

function formatPercentage(value: number | null): string {
  return value === null
    ? "—"
    : `${formatNumber(value)}%`;
}

function formatMonth(month: string): string {
  const date = new Date(`${month}-01T12:00:00`);

  return new Intl.DateTimeFormat("es-MX", {
    month: "short",
  })
    .format(date)
    .replace(".", "");
}

function formatApprovalPeriod(
  point: DashboardApprovalTrendPoint,
  granularity: DashboardGranularity
): string {
  switch (granularity) {
    case "weekly": {
      const startDay = Number(
        point.date_from.substring(8, 10)
      );

      const endDay = Number(
        point.date_to.substring(8, 10)
      );

      return startDay === endDay
        ? `${startDay}`
        : `${startDay}–${endDay}`;
    }

    case "yearly":
      return point.period;

    case "monthly":
    default:
      return formatMonth(point.month);
  }
}

function formatApprovalDateRange(
  dateFrom: string,
  dateTo: string
): string {
  const formatter = new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const start = new Date(`${dateFrom}T12:00:00`);
  const end = new Date(`${dateTo}T12:00:00`);

  if (dateFrom === dateTo) {
    return formatter.format(start);
  }

  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

function formatDate(value: string | null): string {
  if (!value) return "Sin fecha";

  const date = new Date(
    value.length === 10
      ? `${value}T12:00:00`
      : value
  );

  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function formatLocation(
  plant: string | null,
  area: string | null,
  line: string | null
): string {
  return (
    [plant, area, line].filter(Boolean).join(" · ") ||
    "Sin ubicación"
  );
}

function getTrend(
  change: number | null
): "up" | "down" | "neutral" {
  if (change === null || change === 0) {
    return "neutral";
  }

  return change > 0 ? "up" : "down";
}

function formatChange(
  change: number | null,
  suffix = ""
): string {
  if (change === null) {
    return "Sin comparación disponible";
  }

  if (change === 0) {
    return "Sin cambios respecto al mes anterior";
  }

  const sign = change > 0 ? "+" : "";

  return `${sign}${formatNumber(change)}${suffix} vs. mes anterior`;
}

/* =====================================================
   DASHBOARD
   ===================================================== */

export default function Dashboard() {
  const navigate = useNavigate();

  const user = getStoredUser();
  const organizationId = getOrganizationId();

  const [month, setMonth] = useState(getCurrentMonth);

  const [granularity, setGranularity] =
    useState<DashboardGranularity>("monthly");

  const [dashboard, setDashboard] =
    useState<DashboardResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [approvalTrend, setApprovalTrend] =
    useState<DashboardApprovalTrendPoint[]>([]);

  const [approvalLoading, setApprovalLoading] =
    useState(false);

  const [approvalError, setApprovalError] =
    useState<string | null>(null);

  const [approvalReloadKey, setApprovalReloadKey] =
    useState(0);

  const [loadedGranularity, setLoadedGranularity] =
    useState<DashboardGranularity | null>(null);

  /* =====================================================
     CARGA DE INFORMACIÓN
     ===================================================== */

  /* =====================================================
     CARGA GENERAL DEL DASHBOARD
     ===================================================== */

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard() {
      setLoading(true);
      setError(null);
      setDashboard(null);

      setApprovalTrend([]);
      setApprovalError(null);
      setApprovalLoading(false);
      setLoadedGranularity(null);

      try {
        const response = await getDashboard(
          month,
          controller.signal,
          "monthly"
        );

        if (controller.signal.aborted) return;

        if (
          response.organization_id !== organizationId ||
          response.organization_id !== getOrganizationId()
        ) {
          throw new Error(
            "La información recibida no corresponde a la organización activa."
          );
        }

        if (
          response.period.month !== month ||
          response.period.granularity !== "monthly"
        ) {
          throw new Error(
            "La información recibida no corresponde al periodo solicitado."
          );
        }

        setDashboard(response);

        setApprovalTrend(
          response.charts.approval_trend ?? []
        );

        setLoadedGranularity("monthly");
      } catch (err) {
        if (controller.signal.aborted) return;

        setError(
          err instanceof Error
            ? err.message
            : "No fue posible cargar el Dashboard."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => controller.abort();
  }, [
    month,
    organizationId,
    reloadKey,
  ]);

  /* =====================================================
     CARGA INDEPENDIENTE DE LA TENDENCIA
     ===================================================== */

  useEffect(() => {
    if (
      loading ||
      error ||
      !dashboard ||
      !dashboard.capabilities.inspections ||
      dashboard.organization_id !== organizationId ||
      dashboard.period.month !== month
    ) {
      return;
    }

    if (loadedGranularity === granularity) {
      setApprovalLoading(false);
      setApprovalError(null);

      return;
    }

    const controller = new AbortController();

    async function loadApprovalTrend() {
      setApprovalLoading(true);
      setApprovalError(null);

      try {
        const response = await getDashboard(
          month,
          controller.signal,
          granularity
        );

        if (controller.signal.aborted) return;

        if (
          response.organization_id !== organizationId ||
          response.organization_id !== getOrganizationId()
        ) {
          throw new Error(
            "La información recibida no corresponde a la organización activa."
          );
        }

        if (
          response.period.month !== month ||
          response.period.granularity !== granularity
        ) {
          throw new Error(
            "La información recibida no corresponde al periodo solicitado."
          );
        }

        setApprovalTrend(
          response.charts.approval_trend ?? []
        );

        setLoadedGranularity(granularity);
      } catch (err) {
        if (controller.signal.aborted) return;

        setApprovalError(
          err instanceof Error
            ? err.message
            : "No fue posible actualizar la tendencia de aprobación."
        );
      } finally {
        if (!controller.signal.aborted) {
          setApprovalLoading(false);
        }
      }
    }

    void loadApprovalTrend();

    return () => controller.abort();
  }, [
    granularity,
    month,
    organizationId,
    dashboard,
    loading,
    error,
    loadedGranularity,
    approvalReloadKey,
    reloadKey,
  ]);

  /* =====================================================
     DATOS DERIVADOS
     ===================================================== */

  const data =
    dashboard?.organization_id === organizationId &&
      dashboard?.period.month === month
      ? dashboard
      : null;

  const approval = data?.summary.approval_rate;
  const inspections = data?.summary.inspections;
  const incidents = data?.summary.open_incidents;
  const actions = data?.summary.pending_corrective_actions;

  const approvalData = approvalTrend.map((item) => ({
    ...item,

    label: formatApprovalPeriod(
      item,
      loadedGranularity ?? granularity
    ),

    dateRange: formatApprovalDateRange(
      item.date_from,
      item.date_to
    ),
  }));

  const approvalTrendTotals = approvalData.reduce(
    (totals, point) => ({
      approved: totals.approved + point.approved,
      rejected: totals.rejected + point.rejected,
      reviewed: totals.reviewed + point.reviewed,
    }),
    {
      approved: 0,
      rejected: 0,
      reviewed: 0,
    }
  );

  const approvalTrendRate =
    approvalTrendTotals.reviewed > 0
      ? Math.round(
        (
          approvalTrendTotals.approved /
          approvalTrendTotals.reviewed
        ) * 10000
      ) / 100
      : null;

  const approvalTrendLabels: Record<
    DashboardGranularity,
    string
  > = {
    weekly: "Aprobación del mes",
    monthly: "Aprobación de 5 meses",
    yearly: "Aprobación de 5 años",
  };

  const isApprovalUpdating =
    approvalLoading ||
    (
      loadedGranularity !== granularity &&
      !approvalError
    );

  const incidentsData = (
    data?.charts.incidents_by_risk ?? []
  ).map((item) => ({
    ...item,
    name: riskLabels[item.risk_level],
  }));

  const hasApprovalData = approvalData.some(
    (item) => item.value !== null
  );

  const firstName =
    user?.name?.trim().split(/\s+/)[0] || "";

  const greeting = firstName
    ? `${getGreeting()}, ${firstName}`
    : getGreeting();

  const hasStatistics =
    approval !== undefined ||
    inspections !== undefined ||
    incidents !== undefined ||
    actions !== undefined;

  /* =====================================================
     RENDERIZADO
     ===================================================== */

  return (
    <div className="inspecta-dashboard">

      {/* ENCABEZADO */}

      <div className="dashboard-header">
        <div className="dashboard-title-row">
          <div>
            <span className="dashboard-kicker">
              RESUMEN GENERAL
            </span>

            <h1>{greeting}</h1>

            <p>
              Este es el estado actual de seguridad e
              higiene de tu organización.
            </p>
          </div>
        </div>

        <div className="dashboard-actions">
          <input
            type="month"
            className="date-button dashboard-month-input"
            aria-label="Seleccionar periodo del Dashboard"
            value={month}
            max={getCurrentMonth()}
            onChange={(event) => {
              const value = event.currentTarget.value;

              if (value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
                setMonth(value);
              }
            }}
          />
        </div>
      </div>

      {/* ESTADO DE CARGA */}

      {loading && (
        <div className="dashboard-card dashboard-state">
          <CircularProgress
            size={32}
            sx={{ color: "#0F9D8A" }}
          />

          <strong>Cargando Dashboard</strong>

          <span>
            Consultando los indicadores de la organización.
          </span>
        </div>
      )}

      {/* ESTADO DE ERROR */}

      {!loading && error && (
        <div className="dashboard-card dashboard-state">
          <Alert severity="error" sx={{ width: "100%" }}>
            {error}
          </Alert>

          <button
            type="button"
            className="primary-button"
            onClick={() =>
              setReloadKey((previous) => previous + 1)
            }
          >
            Reintentar
          </button>
        </div>
      )}

      {/* DASHBOARD CON INFORMACIÓN */}

      {!loading && !error && data && (
        <>

          {/* SIN PERMISOS OPERATIVOS */}

          {!hasStatistics && (
            <div className="dashboard-card dashboard-state">
              <IonIcon icon={statsChartOutline} />

              <strong>
                No hay indicadores disponibles
              </strong>

              <span>
                Tu rol no cuenta con permisos para
                consultar estadísticas operativas en
                esta organización.
              </span>
            </div>
          )}

          {/* TARJETAS KPI */}

          {hasStatistics && (
            <div className="metric-grid">

              {approval && (
                <MetricCard
                  icon={shieldCheckmarkOutline}
                  title="Tasa de aprobación"
                  value={formatPercentage(approval.value)}
                  period="Periodo seleccionado"
                  detail={formatChange(
                    approval.change,
                    " pp"
                  )}
                  trend={getTrend(approval.change)}
                  type="teal"
                />
              )}

              {inspections && (
                <MetricCard
                  icon={clipboardOutline}
                  title="Inspecciones"
                  value={formatNumber(inspections.value)}
                  period="Periodo seleccionado"
                  detail={formatChange(inspections.change)}
                  trend={getTrend(inspections.change)}
                  type="blue"
                />
              )}

              {incidents && (
                <MetricCard
                  icon={warningOutline}
                  title="Incidencias abiertas"
                  value={formatNumber(incidents.value)}
                  period="Actualmente"
                  detail={`${incidents.critical} de riesgo crítico`}
                  trend="neutral"
                  type="orange"
                  warning={incidents.critical > 0}
                />
              )}

              {actions && (
                <MetricCard
                  icon={checkmarkDoneOutline}
                  title="Acciones pendientes"
                  value={formatNumber(actions.value)}
                  period="Actualmente"
                  detail={`${actions.overdue} ${actions.overdue === 1
                    ? "vencida"
                    : "vencidas"
                    }`}
                  trend="neutral"
                  type="purple"
                  warning={actions.overdue > 0}
                />
              )}

            </div>
          )}

          {/* GRÁFICAS */}

          {(data.charts.approval_trend ||
            data.charts.incidents_by_risk) && (
              <div className="dashboard-main-grid">

                {/* TENDENCIA DE APROBACIÓN */}

                {data.charts.approval_trend && (
                  <section className="dashboard-card compliance-card">
                    <div className="card-header">
                      <div>
                        <span className="card-label">
                          INDICADOR
                        </span>

                        <h2>Tendencia de aprobación</h2>
                      </div>

                      <select
                        className="small-filter dashboard-granularity-select"
                        aria-label="Agrupación temporal de la tendencia de aprobación"
                        value={granularity}
                        onChange={(event) => {
                          const value = event.currentTarget.value;

                          if (
                            value !== "weekly" &&
                            value !== "monthly" &&
                            value !== "yearly"
                          ) {
                            return;
                          }

                          setApprovalError(null);
                          setGranularity(value);
                        }}
                      >
                        {granularityOptions.map((option) => (
                          <option
                            key={option.value}
                            value={option.value}
                          >
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="compliance-content">
                      <div className="compliance-number">
                        <strong>
                          {isApprovalUpdating || approvalError
                            ? "—"
                            : formatPercentage(approvalTrendRate)}
                        </strong>

                        <small className="dashboard-approval-period">
                          {approvalTrendLabels[granularity]}
                        </small>

                        {!isApprovalUpdating && !approvalError && (
                          <>
                            <span className="dashboard-trend-neutral">
                              {formatNumber(approvalTrendTotals.approved)} aprobadas
                            </span>

                            <small>
                              {formatNumber(approvalTrendTotals.rejected)} rechazadas
                            </small>

                            <small>
                              {formatNumber(approvalTrendTotals.reviewed)} revisadas
                            </small>
                          </>
                        )}
                      </div>

                      <div
                        className="chart-container"
                        aria-busy={isApprovalUpdating}
                      >
                        {isApprovalUpdating ? (
                          <div className="dashboard-chart-state">
                            <CircularProgress
                              size={26}
                              sx={{ color: "#0F9D8A" }}
                            />

                            <span>Actualizando tendencia...</span>
                          </div>
                        ) : approvalError ? (
                          <div className="dashboard-chart-state">
                            <Alert
                              severity="error"
                              sx={{ width: "100%" }}
                            >
                              {approvalError}
                            </Alert>

                            <button
                              type="button"
                              className="link-button"
                              onClick={() => {
                                setApprovalError(null);

                                setApprovalReloadKey(
                                  (previous) => previous + 1
                                );
                              }}
                            >
                              Reintentar
                            </button>
                          </div>
                        ) : hasApprovalData ? (
                          <ResponsiveContainer
                            width="100%"
                            height={210}
                          >
                            <AreaChart
                              data={approvalData}
                              margin={{
                                top: 10,
                                right: 20,
                                left: -15,
                                bottom: 0,
                              }}
                            >
                              <defs>
                                <linearGradient
                                  id="complianceGradient"
                                  x1="0"
                                  y1="0"
                                  x2="0"
                                  y2="1"
                                >
                                  <stop
                                    offset="0%"
                                    stopColor="#0F9D8A"
                                    stopOpacity={0.35}
                                  />

                                  <stop
                                    offset="100%"
                                    stopColor="#0F9D8A"
                                    stopOpacity={0}
                                  />
                                </linearGradient>
                              </defs>

                              <CartesianGrid
                                stroke="#E8EEF2"
                                vertical={false}
                              />

                              <XAxis
                                dataKey="label"
                                axisLine={false}
                                tickLine={false}
                                interval={0}
                                tick={{
                                  fontSize: 11,
                                  fill: "#81909D",
                                }}
                                padding={{
                                  left: 10,
                                  right: 10,
                                }}
                              />

                              <YAxis
                                domain={[0, 100]}
                                ticks={[0, 25, 50, 75, 100]}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(value) =>
                                  `${value}%`
                                }
                                tick={{
                                  fontSize: 10,
                                  fill: "#81909D",
                                }}
                              />

                              <Tooltip
                                content={({ active, payload }) => {
                                  if (
                                    !active ||
                                    !payload ||
                                    payload.length === 0
                                  ) {
                                    return null;
                                  }

                                  const point = payload[0].payload as
                                    DashboardApprovalTrendPoint & {
                                      label: string;
                                      dateRange: string;
                                    };

                                  return (
                                    <div className="dashboard-chart-tooltip">
                                      <strong>
                                        {point.dateRange}
                                      </strong>

                                      <div className="dashboard-tooltip-rate">
                                        {formatPercentage(point.value)}
                                      </div>

                                      <div>
                                        Aprobadas:{" "}
                                        <b>{point.approved}</b>
                                      </div>

                                      <div>
                                        Rechazadas:{" "}
                                        <b>{point.rejected}</b>
                                      </div>

                                      <div>
                                        Revisadas:{" "}
                                        <b>{point.reviewed}</b>
                                      </div>
                                    </div>
                                  );
                                }}
                              />

                              <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#0F9D8A"
                                strokeWidth={3}
                                fill="url(#complianceGradient)"
                                connectNulls={false}
                                dot={{
                                  r: 3,
                                  fill: "#0F9D8A",
                                  strokeWidth: 0,
                                }}
                                activeDot={{ r: 5 }}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <EmptyState
                            message={
                              approvalEmptyMessages[granularity]
                            }
                          />
                        )}
                      </div>
                    </div>
                  </section>
                )}

                {/* INCIDENCIAS POR RIESGO */}

                {data.charts.incidents_by_risk && (
                  <section className="dashboard-card">
                    <div className="card-header">
                      <div>
                        <span className="card-label">
                          SEGURIDAD
                        </span>

                        <h2>Incidencias por severidad</h2>
                      </div>

                      <div className="card-header-icon">
                        <IonIcon icon={statsChartOutline} />
                      </div>
                    </div>

                    <div className="incident-chart">
                      <ResponsiveContainer
                        width="100%"
                        height={210}
                      >
                        <BarChart
                          data={incidentsData}
                          margin={{
                            top: 10,
                            right: 10,
                            left: -20,
                            bottom: 0,
                          }}
                        >
                          <CartesianGrid
                            stroke="#E8EEF2"
                            vertical={false}
                          />

                          <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{
                              fontSize: 11,
                              fill: "#81909D",
                            }}
                          />

                          <YAxis
                            allowDecimals={false}
                            axisLine={false}
                            tickLine={false}
                            tick={{
                              fontSize: 10,
                              fill: "#81909D",
                            }}
                          />

                          <Tooltip
                            formatter={(value) => [
                              value,
                              "Incidencias",
                            ]}
                          />

                          <Bar
                            dataKey="value"
                            fill="#16324F"
                            radius={[8, 8, 0, 0]}
                            maxBarSize={48}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="severity-summary">
                      {incidentsData.map((item) => (
                        <Severity
                          key={item.risk_level}
                          color={item.risk_level}
                          label={item.name}
                          value={item.value}
                        />
                      ))}
                    </div>
                  </section>
                )}

              </div>
            )}

          {/* LISTADOS INFERIORES */}

          {(data.capabilities.inspections ||
            data.capabilities.corrective_actions) && (
              <div className="dashboard-lower-grid">

                {/* INSPECCIONES RECIENTES */}

                {data.capabilities.inspections && (
                  <section className="dashboard-card">
                    <div className="card-header">
                      <div>
                        <span className="card-label">
                          ACTIVIDAD
                        </span>

                        <h2>Inspecciones recientes</h2>
                      </div>

                      <button
                        type="button"
                        className="link-button"
                        onClick={() =>
                          navigate("/inspecciones")
                        }
                      >
                        Ver todas
                      </button>
                    </div>

                    <div className="inspection-list">
                      {data.recent_inspections.length === 0 ? (
                        <EmptyState
                          message="No hay inspecciones registradas en el periodo seleccionado."
                        />
                      ) : (
                        data.recent_inspections.map(
                          (inspection) => {
                            const status =
                              inspectionStatuses[
                              inspection.status
                              ];

                            const location = formatLocation(
                              inspection.plant_name,
                              inspection.area_name,
                              inspection.production_line_name
                            );

                            return (
                              <div
                                className="inspection-row"
                                key={inspection.id}
                              >
                                <div className="inspection-icon">
                                  <IonIcon
                                    icon={clipboardOutline}
                                  />
                                </div>

                                <div className="inspection-info">
                                  <strong
                                    title={
                                      inspection.checklist_name ??
                                      "Inspección"
                                    }
                                  >
                                    {inspection.checklist_name ??
                                      "Inspección"}
                                  </strong>

                                  <span title={location}>
                                    {location}
                                  </span>
                                </div>

                                <span className="inspection-date">
                                  {formatDate(
                                    inspection.started_at
                                  )}
                                </span>

                                <div className="dashboard-inspection-status">
                                  <span
                                    className={`status-pill ${status.color}`}
                                  >
                                    {status.label}
                                  </span>
                                </div>

                                <div
                                  className="inspection-progress"
                                  title={`${inspection.answered_questions} de ${inspection.required_questions} preguntas obligatorias`}
                                >
                                  <strong>
                                    {formatPercentage(
                                      inspection.progress
                                    )}
                                  </strong>

                                  {inspection.progress !==
                                    null && (
                                      <div className="mini-progress">
                                        <span
                                          style={{
                                            width: `${Math.max(
                                              0,
                                              Math.min(
                                                100,
                                                inspection.progress
                                              )
                                            )}%`,
                                          }}
                                        />
                                      </div>
                                    )}
                                </div>

                                <button
                                  type="button"
                                  className="row-arrow dashboard-row-button"
                                  aria-label="Ver detalle de inspección"
                                  title="Ver detalle de inspección"
                                  onClick={() =>
                                    navigate(
                                      `/inspecciones?inspectionId=${encodeURIComponent(inspection.id)}`
                                    )
                                  }
                                >
                                  <IonIcon icon={chevronForwardOutline} />
                                </button>
                              </div>
                            );
                          }
                        )
                      )}
                    </div>
                  </section>
                )}

                {/* ACCIONES CORRECTIVAS */}

                {data.capabilities.corrective_actions && (
                  <section className="dashboard-card">
                    <div className="card-header">
                      <div>
                        <span className="card-label">
                          SEGUIMIENTO
                        </span>

                        <h2>Acciones correctivas</h2>
                      </div>

                      <button
                        type="button"
                        className="link-button"
                        onClick={() =>
                          navigate("/acciones-correctivas")
                        }
                      >
                        Ver todas
                      </button>
                    </div>

                    <div className="action-list">
                      {data.pending_corrective_actions.length ===
                        0 ? (
                        <EmptyState
                          message="No hay acciones correctivas pendientes."
                        />
                      ) : (
                        data.pending_corrective_actions.map(
                          (action) => (
                            <div
                              className="action-row"
                              key={action.id}
                            >
                              <div
                                className={`action-status priority-${action.priority}`}
                                title={`Prioridad: ${riskLabels[action.priority]
                                  }`}
                              />

                              <div className="dashboard-action-info">
                                <strong
                                  title={action.description}
                                >
                                  {action.description}
                                </strong>

                                <span>
                                  {formatLocation(
                                    action.plant_name,
                                    action.area_name,
                                    action.production_line_name
                                  )}
                                </span>

                                <span>
                                  {action.due_date
                                    ? `Vence: ${formatDate(
                                      action.due_date
                                    )}`
                                    : "Sin fecha límite"}
                                </span>
                              </div>

                              <span
                                className={`action-pill ${action.overdue
                                  ? "critical"
                                  : action.status ===
                                    "in_progress"
                                    ? "medium"
                                    : "low"
                                  }`}
                              >
                                {action.overdue
                                  ? "Vencida"
                                  : action.status ===
                                    "in_progress"
                                    ? "En progreso"
                                    : "Pendiente"}
                              </span>
                            </div>
                          )
                        )
                      )}
                    </div>
                  </section>
                )}

              </div>
            )}

        </>
      )}
    </div>
  );
}

/* =====================================================
   TARJETA KPI
   ===================================================== */

interface MetricCardProps {
  icon: string;
  title: string;
  value: string;
  period: string;
  detail: string;
  trend: "up" | "down" | "neutral";
  type: "teal" | "blue" | "orange" | "purple";
  warning?: boolean;
}

function MetricCard({
  icon,
  title,
  value,
  period,
  detail,
  trend,
  type,
  warning = false,
}: MetricCardProps) {
  const trendClass = warning
    ? "trend-negative"
    : trend === "up"
      ? "trend-positive"
      : trend === "down"
        ? "trend-negative"
        : "trend-neutral";

  return (
    <article className={`metric-card ${type}`}>
      <div className="metric-top">
        <div className="metric-icon">
          <IonIcon icon={icon} />
        </div>

        <span>{period}</span>
      </div>

      <div className="metric-title">
        {title}
      </div>

      <div className="metric-value">
        {value}
      </div>

      <small className={trendClass}>
        {trend !== "neutral" && (
          <IonIcon
            icon={
              trend === "up"
                ? arrowUpOutline
                : arrowDownOutline
            }
          />
        )}

        {detail}
      </small>
    </article>
  );
}

/* =====================================================
   SEVERIDAD
   ===================================================== */

interface SeverityProps {
  color: DashboardRiskLevel;
  label: string;
  value: number;
}

function Severity({
  color,
  label,
  value,
}: SeverityProps) {
  return (
    <div className="severity-item">
      <span className={`severity-dot ${color}`} />

      <span>{label}</span>

      <strong>{value}</strong>
    </div>
  );
}

/* =====================================================
   ESTADO VACÍO
   ===================================================== */

function EmptyState({
  message,
}: {
  message: string;
}) {
  return (
    <div className="dashboard-empty-state">
      <IonIcon icon={clipboardOutline} />

      <span>{message}</span>
    </div>
  );
}