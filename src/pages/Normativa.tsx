
import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import VisibilityIcon from "@mui/icons-material/Visibility";
import GavelIcon from "@mui/icons-material/Gavel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ArchiveIcon from "@mui/icons-material/Archive";
import BusinessIcon from "@mui/icons-material/Business";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import ListAltOutlinedIcon from "@mui/icons-material/ListAltOutlined";

import NormForm from "../components/norms/NormForm";
import NormRequirements from "../components/norms/NormRequirements";

import {
  getAllNorms,
  getNorm,
  createNorm,
  updateNorm,
  updateNormStatus,
} from "../services/norms.service";

import type {
  Norm,
  NormPayload,
} from "../types/norms";

const NAVY = "#16324F";
const GREEN = "#0F9D8A";

const TABLE_COLUMNS =
  "minmax(170px, 0.8fr) minmax(260px, 1.6fr) 140px 100px 135px 110px 120px";

interface SummaryCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  color: string;
  description: string;
}

function errorText(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "No fue posible completar la solicitud.";
}

function dateText(value: string | null): string {
  if (!value) return "—";

  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})/
  );

  if (!match) return "—";

  return `${match[3]}/${match[2]}/${match[1]}`;
}

function dateTimeText(value: string | null): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function SummaryCard({
  title,
  value,
  icon,
  color,
  description,
}: SummaryCardProps) {
  return (
    <Card sx={{ flex: 1, minWidth: 0 }}>
      <CardContent>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: 13,
                color: "text.secondary",
                mb: 0.5,
              }}
            >
              {title}
            </Typography>

            <Typography
              sx={{
                fontSize: 30,
                fontWeight: 700,
                color: NAVY,
              }}
            >
              {value}
            </Typography>

            <Typography
              sx={{
                fontSize: 12,
                color: "text.secondary",
                mt: 0.5,
              }}
            >
              {description}
            </Typography>
          </Box>

          <Box
            sx={{
              width: 48,
              height: 48,
              flexShrink: 0,
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: `${color}15`,
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

function InfoField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <Box>
      <Typography
        sx={{
          fontSize: 12,
          color: "text.secondary",
          mb: 0.5,
        }}
      >
        {label}
      </Typography>

      <Typography
        sx={{
          color: NAVY,
          fontSize: 14,
          fontWeight: 500,
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

export default function Normativa() {
  const [normas, setNormas] = useState<Norm[]>([]);

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [filtroEmisor, setFiltroEmisor] = useState("Todos");

  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Creación y edición.
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Norm | null>(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // Consulta de detalle.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Norm | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  // Cambio de estado.
  const [statusTarget, setStatusTarget] = useState<Norm | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState("");

  // Administración de requisitos normativos.
  const [requirementsNorm, setRequirementsNorm] =
    useState<Norm | null>(null);

  const busy = loading || saving || statusSaving;

  const modalOpen =
    formOpen ||
    Boolean(selectedId) ||
    Boolean(statusTarget) ||
    Boolean(requirementsNorm);

  // Cargar catálogo completo.
  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");

    getAllNorms()
      .then((result) => {
        if (active) {
          setNormas(result);
        }
      })
      .catch((e) => {
        if (active) {
          setError(errorText(e));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [reload]);

  // Consultar detalle individual.
  useEffect(() => {
    if (!selectedId) return;

    let active = true;

    setDetail(null);
    setDetailLoading(true);
    setDetailError("");

    getNorm(selectedId)
      .then((response) => {
        if (active) {
          setDetail(response.data);
        }
      })
      .catch((e) => {
        if (active) {
          setDetailError(errorText(e));
        }
      })
      .finally(() => {
        if (active) {
          setDetailLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [selectedId]);

  // Organismos emisores disponibles.
  const emisores = useMemo(() => {
    const values = normas
      .map((norma) => norma.issuing_body?.trim())
      .filter(
        (value): value is string => Boolean(value)
      );

    return [...new Set(values)].sort((a, b) =>
      a.localeCompare(b, "es")
    );
  }, [normas]);

  useEffect(() => {
    if (
      filtroEmisor !== "Todos" &&
      filtroEmisor !== "__without_issuer__" &&
      !emisores.includes(filtroEmisor)
    ) {
      setFiltroEmisor("Todos");
    }
  }, [emisores, filtroEmisor]);

  // Indicadores.
  const resumen = useMemo(() => {
    const activas = normas.filter(
      (norma) => norma.status
    ).length;

    return {
      total: normas.length,
      activas,
      inactivas: normas.length - activas,
      emisores: emisores.length,
    };
  }, [normas, emisores]);

  // Búsqueda y filtros locales.
  const normasFiltradas = useMemo(() => {
    const texto = normalizeText(busqueda);

    return normas.filter((norma) => {
      const searchable = normalizeText(
        [
          norma.code,
          norma.name,
          norma.description ?? "",
          norma.issuing_body ?? "",
          norma.version ?? "",
        ].join(" ")
      );

      const coincideBusqueda =
        !texto || searchable.includes(texto);

      const coincideEstado =
        filtroEstado === "Todos" ||
        (filtroEstado === "Activa" && norma.status) ||
        (filtroEstado === "Inactiva" && !norma.status);

      const issuer = norma.issuing_body?.trim() ?? "";

      const coincideEmisor =
        filtroEmisor === "Todos" ||
        (
          filtroEmisor === "__without_issuer__" &&
          !issuer
        ) ||
        issuer === filtroEmisor;

      return (
        coincideBusqueda &&
        coincideEstado &&
        coincideEmisor
      );
    });
  }, [
    normas,
    busqueda,
    filtroEstado,
    filtroEmisor,
  ]);

  function openCreate() {
    if (busy || modalOpen) return;

    setEditing(null);
    setFormError("");
    setSuccess("");
    setFormOpen(true);
  }

  function openEdit(norma: Norm) {
    if (busy || !norma.status) return;

    setSelectedId(null);
    setDetail(null);

    setEditing(norma);
    setFormError("");
    setSuccess("");
    setFormOpen(true);
  }

  function closeForm() {
    if (saving) return;

    setFormOpen(false);
    setEditing(null);
    setFormError("");
  }

  async function saveNorm(payload: NormPayload) {
    if (saving) return;

    if (editing && !editing.status) {
      setFormError(
        "No se puede modificar una norma inactiva."
      );
      return;
    }

    setSaving(true);
    setFormError("");
    setSuccess("");

    try {
      if (editing) {
        await updateNorm(editing.id, payload);

        setSuccess(
          "Norma actualizada correctamente."
        );
      } else {
        await createNorm(payload);

        setSuccess(
          "Norma registrada correctamente."
        );
      }

      setFormOpen(false);
      setEditing(null);

      setReload((previous) => previous + 1);
    } catch (e) {
      setFormError(errorText(e));
    } finally {
      setSaving(false);
    }
  }

  function openDetail(normId: string) {
    if (busy || modalOpen) return;

    setDetail(null);
    setDetailError("");
    setDetailLoading(true);
    setSelectedId(normId);
  }

  function closeDetail() {
    setSelectedId(null);
    setDetail(null);
    setDetailError("");
  }

  function openStatus(norma: Norm) {
    if (busy) return;

    setStatusTarget(norma);
    setStatusError("");
    setSuccess("");
  }

  function closeStatus() {
    if (statusSaving) return;

    setStatusTarget(null);
    setStatusError("");
  }

  async function confirmStatus() {
    if (!statusTarget || statusSaving) return;

    setStatusSaving(true);
    setStatusError("");
    setSuccess("");

    try {
      const response = await updateNormStatus(
        statusTarget.id,
        !statusTarget.status
      );

      const updated = response.data;

      setNormas((previous) =>
        previous.map((norma) =>
          norma.id === updated.id
            ? updated
            : norma
        )
      );

      setDetail((previous) =>
        previous?.id === updated.id
          ? updated
          : previous
      );

      setSuccess(
        updated.status
          ? "Norma activada correctamente."
          : "Norma desactivada correctamente."
      );

      setStatusTarget(null);
    } catch (e) {
      setStatusError(errorText(e));
    } finally {
      setStatusSaving(false);
    }
  }

  const summaryUnavailable =
    loading || Boolean(error);

  return (
    <>
      <Box sx={{ width: "100%" }}>
        {/* Encabezado */}
        <Stack
          direction={{
            xs: "column",
            sm: "row",
          }}
          spacing={2}
          sx={{
            justifyContent: "space-between",
            alignItems: {
              xs: "stretch",
              sm: "center",
            },
            mb: 3,
          }}
        >
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: NAVY,
              }}
            >
              Normativa
            </Typography>

            <Typography
              sx={{
                color: "text.secondary",
                fontSize: 14,
                mt: 0.5,
              }}
            >
              Consulta y administración de la
              normativa de seguridad e higiene.
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            disabled={busy || modalOpen}
            onClick={openCreate}
            sx={{
              bgcolor: NAVY,
              textTransform: "none",
              "&:hover": {
                bgcolor: "#0F263D",
              },
            }}
          >
            Nueva norma
          </Button>
        </Stack>

        {/* Mensajes */}
        {success && (
          <Alert
            severity="success"
            onClose={() => setSuccess("")}
            sx={{ mb: 2 }}
          >
            {success}
          </Alert>
        )}

        {error && (
          <Alert
            severity="error"
            sx={{ mb: 2 }}
            action={
              <Button
                color="inherit"
                size="small"
                disabled={busy}
                onClick={() =>
                  setReload(
                    (previous) => previous + 1
                  )
                }
              >
                Reintentar
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        {/* Resumen */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
              lg: "repeat(4, minmax(0, 1fr))",
            },
            gap: 2,
            mb: 3,
          }}
        >
          <SummaryCard
            title="Total"
            value={
              summaryUnavailable
                ? "—"
                : resumen.total
            }
            description="Normas registradas"
            color={NAVY}
            icon={<GavelIcon />}
          />

          <SummaryCard
            title="Activas"
            value={
              summaryUnavailable
                ? "—"
                : resumen.activas
            }
            description="Habilitadas en el sistema"
            color="#16803C"
            icon={<CheckCircleIcon />}
          />

          <SummaryCard
            title="Inactivas"
            value={
              summaryUnavailable
                ? "—"
                : resumen.inactivas
            }
            description="Deshabilitadas en el sistema"
            color="#81909D"
            icon={<ArchiveIcon />}
          />

          <SummaryCard
            title="Organismos emisores"
            value={
              summaryUnavailable
                ? "—"
                : resumen.emisores
            }
            description="Organismos registrados"
            color={GREEN}
            icon={<BusinessIcon />}
          />
        </Box>

        {/* Filtros */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack
              direction={{
                xs: "column",
                md: "row",
              }}
              spacing={2}
            >
              <TextField
                fullWidth
                placeholder="Buscar por clave, nombre u organismo..."
                value={busqueda}
                onChange={(event) =>
                  setBusqueda(event.target.value)
                }
                slotProps={{
                  input: {
                    startAdornment: (
                      <SearchIcon
                        sx={{
                          color: "text.secondary",
                          mr: 1,
                        }}
                      />
                    ),
                  },
                }}
              />

              <FormControl
                sx={{
                  minWidth: {
                    xs: "100%",
                    md: 150,
                  },
                }}
              >
                <InputLabel>
                  Estado
                </InputLabel>

                <Select
                  value={filtroEstado}
                  label="Estado"
                  onChange={(event) =>
                    setFiltroEstado(event.target.value)
                  }
                >
                  <MenuItem value="Todos">
                    Todos
                  </MenuItem>

                  <MenuItem value="Activa">
                    Activa
                  </MenuItem>

                  <MenuItem value="Inactiva">
                    Inactiva
                  </MenuItem>
                </Select>
              </FormControl>

              <FormControl
                sx={{
                  minWidth: {
                    xs: "100%",
                    md: 180,
                  },
                  flexShrink: 0,
                }}
              >
                <InputLabel>
                  Organismo emisor
                </InputLabel>

                <Select
                  value={filtroEmisor}
                  label="Organismo emisor"
                  onChange={(event) =>
                    setFiltroEmisor(event.target.value)
                  }
                >
                  <MenuItem value="Todos">
                    Todos
                  </MenuItem>

                  {emisores.map((emisor) => (
                    <MenuItem
                      key={emisor}
                      value={emisor}
                    >
                      {emisor}
                    </MenuItem>
                  ))}

                  <MenuItem value="__without_issuer__">
                    Sin organismo
                  </MenuItem>
                </Select>
              </FormControl>

              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                disabled={busy || modalOpen}
                onClick={() =>
                  setReload(
                    (previous) => previous + 1
                  )
                }
                sx={{
                  color: GREEN,
                  borderColor: GREEN,
                  textTransform: "none",
                  whiteSpace: "nowrap",
                  minWidth: {
                    xs: "100%",
                    md: 120,
                  },
                  flexShrink: 0,
                  px: 2,
                }}
              >
                Actualizar
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {/* Tabla */}
        <Card>
          <CardContent sx={{ p: 0 }}>
            <Box
              sx={{
                overflowX: "auto",
                width: "100%",
              }}
            >
              <Box sx={{ minWidth: 1170 }}>
                {/* Encabezados */}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: TABLE_COLUMNS,
                    gap: 2,
                    alignItems: "center",
                    px: 3,
                    py: 2,
                    bgcolor: "#F4F7FA",
                  }}
                >
                  {[
                    "NORMA",
                    "NOMBRE",
                    "ORGANISMO",
                    "VERSIÓN",
                    "ENTRADA EN VIGOR",
                    "ESTADO",
                    "ACCIONES",
                  ].map((label) => (
                    <Typography
                      key={label}
                      sx={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "text.secondary",
                      }}
                    >
                      {label}
                    </Typography>
                  ))}
                </Box>

                <Divider />

                {loading ? (
                  <Stack
                    spacing={1.5}
                    sx={{
                      alignItems: "center",
                      py: 6,
                    }}
                  >
                    <CircularProgress
                      size={30}
                      sx={{ color: GREEN }}
                    />

                    <Typography
                      sx={{
                        fontSize: 13,
                        color: "text.secondary",
                      }}
                    >
                      Consultando normas...
                    </Typography>
                  </Stack>
                ) : error ? (
                  <Box
                    sx={{
                      py: 6,
                      textAlign: "center",
                    }}
                  >
                    <Typography
                      sx={{
                        color: "text.secondary",
                        fontSize: 14,
                      }}
                    >
                      No fue posible cargar
                      el catálogo normativo.
                    </Typography>
                  </Box>
                ) : (
                  <>
                    {normasFiltradas.map((norma) => (
                      <Box key={norma.id}>
                        <Box
                          sx={{
                            display: "grid",
                            gridTemplateColumns: TABLE_COLUMNS,
                            gap: 2,
                            alignItems: "center",
                            px: 3,
                            py: 2,
                            "&:hover": {
                              bgcolor: "#F8FAFC",
                            },
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: NAVY,
                              overflowWrap: "anywhere",
                            }}
                          >
                            {norma.code}
                          </Typography>

                          <Typography
                            sx={{
                              fontSize: 13,
                              color: "#273746",
                              overflowWrap: "anywhere",
                            }}
                          >
                            {norma.name}
                          </Typography>

                          <Box>
                            {norma.issuing_body ? (
                              <Chip
                                label={norma.issuing_body}
                                size="small"
                                variant="outlined"
                                sx={{
                                  maxWidth: "100%",
                                }}
                              />
                            ) : (
                              <Typography
                                sx={{
                                  color: "text.secondary",
                                  fontSize: 12,
                                }}
                              >
                                —
                              </Typography>
                            )}
                          </Box>

                          <Typography
                            sx={{
                              fontSize: 12,
                              color: "text.secondary",
                              overflowWrap: "anywhere",
                            }}
                          >
                            {norma.version || "—"}
                          </Typography>

                          <Typography
                            sx={{
                              fontSize: 12,
                              color: "text.secondary",
                            }}
                          >
                            {dateText(norma.effective_date)}
                          </Typography>

                          {/* Estado de la norma */}
                          <Box>
                            <Tooltip
                              title={
                                norma.status
                                  ? "Desactivar norma"
                                  : "Activar norma"
                              }
                            >
                              <span>
                                <Chip
                                  size="small"
                                  label={
                                    norma.status
                                      ? "Activa"
                                      : "Inactiva"
                                  }
                                  color={
                                    norma.status
                                      ? "success"
                                      : "default"
                                  }
                                  clickable
                                  disabled={busy || modalOpen}
                                  onClick={() => openStatus(norma)}
                                  sx={{
                                    fontWeight: 600,
                                    cursor: busy || modalOpen
                                      ? "default"
                                      : "pointer",
                                  }}
                                />
                              </span>
                            </Tooltip>
                          </Box>

                          {/* Acciones */}
                          <Stack
                            direction="row"
                            spacing={0.5}
                          >
                            <Tooltip title="Consultar norma">
                              <span>
                                <IconButton
                                  size="small"
                                  disabled={busy || modalOpen}
                                  onClick={() =>
                                    openDetail(norma.id)
                                  }
                                  sx={{
                                    color: NAVY,
                                  }}
                                >
                                  <VisibilityIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>

                            <Tooltip
                              title={
                                norma.status
                                  ? "Editar norma"
                                  : "Reactiva la norma para editarla"
                              }
                            >
                              <span>
                                <IconButton
                                  size="small"
                                  disabled={
                                    busy ||
                                    modalOpen ||
                                    !norma.status
                                  }
                                  onClick={() =>
                                    openEdit(norma)
                                  }
                                  sx={{
                                    color: GREEN,
                                  }}
                                >
                                  <EditOutlinedIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>

                            <Tooltip
                              title={
                                norma.status
                                  ? "Administrar requisitos normativos"
                                  : "Consultar requisitos normativos"
                              }
                            >
                              <span>
                                <IconButton
                                  size="small"
                                  disabled={busy || modalOpen}
                                  onClick={() =>
                                    setRequirementsNorm(norma)
                                  }
                                  sx={{
                                    color: GREEN,
                                  }}
                                >
                                  <ListAltOutlinedIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Stack>
                        </Box>

                        <Divider />
                      </Box>
                    ))}

                    {normasFiltradas.length === 0 && (
                      <Stack
                        spacing={1}
                        sx={{
                          alignItems: "center",
                          py: 6,
                        }}
                      >
                        <GavelIcon
                          sx={{
                            fontSize: 40,
                            color: "#81909D",
                          }}
                        />

                        <Typography
                          sx={{
                            color: NAVY,
                            fontWeight: 600,
                            fontSize: 14,
                          }}
                        >
                          {normas.length === 0
                            ? "Sin normas registradas"
                            : "No se encontraron normas"}
                        </Typography>

                        <Typography
                          sx={{
                            color: "text.secondary",
                            fontSize: 13,
                          }}
                        >
                          {normas.length === 0
                            ? "Registra una norma para comenzar."
                            : "Intenta modificar los filtros de búsqueda."}
                        </Typography>

                        {normas.length === 0 && (
                          <Button
                            variant="outlined"
                            startIcon={<AddIcon />}
                            disabled={busy || modalOpen}
                            onClick={openCreate}
                            sx={{
                              color: GREEN,
                              borderColor: GREEN,
                              textTransform: "none",
                            }}
                          >
                            Registrar primera norma
                          </Button>
                        )}
                      </Stack>
                    )}
                  </>
                )}
              </Box>
            </Box>

            {/* Pie de tabla */}
            <Box
              sx={{
                px: 3,
                py: 2,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography
                sx={{
                  color: "text.secondary",
                  fontSize: 12,
                }}
              >
                {loading
                  ? "Cargando registros..."
                  : error
                    ? "Listado no disponible"
                    : `Mostrando ${normasFiltradas.length} de ${normas.length} normas`}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Formulario de creación y edición */}
      {formOpen && (
        <NormForm
          key={editing?.id ?? "new-norm"}
          norm={editing}
          saving={saving}
          error={formError}
          onClose={closeForm}
          onSave={saveNorm}
        />
      )}

      {/* Detalle de norma */}
      <Dialog
        open={Boolean(selectedId)}
        onClose={() => {
          if (!statusTarget && !statusSaving) {
            closeDetail();
          }
        }}
        fullWidth
        maxWidth="sm"
        slotProps={{
          paper: {
            sx: { borderRadius: 3 },
          },
        }}
      >
        <DialogTitle
          sx={{
            color: NAVY,
            fontWeight: 700,
          }}
        >
          Detalle de la norma
        </DialogTitle>

        <DialogContent dividers>
          {detailLoading ? (
            <Stack
              sx={{
                alignItems: "center",
                py: 4,
              }}
            >
              <CircularProgress
                size={28}
                sx={{ color: GREEN }}
              />
            </Stack>
          ) : detailError ? (
            <Alert severity="error">
              {detailError}
            </Alert>
          ) : detail ? (
            <Stack spacing={2.5}>
              <Box
                sx={{
                  p: 2,
                  bgcolor: "#F4F7FA",
                  borderRadius: 2,
                }}
              >
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography
                    sx={{
                      color: NAVY,
                      fontWeight: 700,
                      fontSize: 17,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {detail.code}
                  </Typography>

                  <Chip
                    size="small"
                    label={
                      detail.status
                        ? "Activa"
                        : "Inactiva"
                    }
                    color={
                      detail.status
                        ? "success"
                        : "default"
                    }
                  />
                </Stack>

                <Typography
                  sx={{
                    fontSize: 14,
                    color: NAVY,
                    mt: 1,
                  }}
                >
                  {detail.name}
                </Typography>
              </Box>

              {/* Aviso de solo lectura */}
              {!detail.status && (
                <Alert severity="warning">
                  Esta norma se encuentra inactiva y su
                  contenido está en modo de solo lectura.
                  Reactívala para realizar modificaciones.
                </Alert>
              )}

              <InfoField
                label="Descripción"
                value={
                  detail.description ||
                  "Sin descripción."
                }
              />

              <Divider />

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "1fr 1fr",
                  },
                  gap: 2,
                }}
              >
                <InfoField
                  label="Organismo emisor"
                  value={
                    detail.issuing_body || "—"
                  }
                />

                <InfoField
                  label="Versión"
                  value={
                    detail.version || "—"
                  }
                />

                <InfoField
                  label="Entrada en vigor"
                  value={dateText(
                    detail.effective_date
                  )}
                />

                <InfoField
                  label="Estado en INSPECTA"
                  value={
                    detail.status
                      ? "Activa"
                      : "Inactiva"
                  }
                />
              </Box>

              <Divider />

              <InfoField
                label="Fecha de registro"
                value={dateTimeText(
                  detail.created_at
                )}
              />

              <InfoField
                label="Última actualización"
                value={dateTimeText(
                  detail.updated_at
                )}
              />

              <InfoField
                label="Identificador"
                value={detail.id}
              />
            </Stack>
          ) : null}
        </DialogContent>

        <DialogActions
          sx={{
            p: 2,
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          {detail && (
            <>
              {/* Activar o desactivar norma */}
              <Button
                variant="outlined"
                color={
                  detail.status
                    ? "error"
                    : "success"
                }
                disabled={
                  busy ||
                  Boolean(statusTarget)
                }
                onClick={() =>
                  openStatus(detail)
                }
                sx={{
                  textTransform: "none",
                }}
              >
                {detail.status
                  ? "Desactivar"
                  : "Activar"}
              </Button>

              {/* Editar únicamente normas activas */}
              <Tooltip
                title={
                  detail.status
                    ? "Editar norma"
                    : "Reactiva la norma para editarla"
                }
              >
                <span>
                  <Button
                    variant="outlined"
                    startIcon={<EditOutlinedIcon />}
                    disabled={
                      busy ||
                      Boolean(statusTarget) ||
                      !detail.status
                    }
                    onClick={() =>
                      openEdit(detail)
                    }
                    sx={{
                      color: GREEN,
                      borderColor: GREEN,
                      textTransform: "none",
                    }}
                  >
                    Editar norma
                  </Button>
                </span>
              </Tooltip>

              {/* Consultar requisitos en cualquier estado */}
              <Button
                variant="outlined"
                startIcon={<ListAltOutlinedIcon />}
                disabled={
                  busy ||
                  Boolean(statusTarget)
                }
                onClick={() => {
                  setRequirementsNorm(detail);
                  closeDetail();
                }}
                sx={{
                  color: GREEN,
                  borderColor: GREEN,
                  textTransform: "none",
                }}
              >
                Requisitos
              </Button>
            </>
          )}

          <Button
            variant="contained"
            disabled={
              statusSaving ||
              Boolean(statusTarget)
            }
            onClick={closeDetail}
            sx={{
              bgcolor: NAVY,
              textTransform: "none",
            }}
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmación de cambio de estado */}
      <Dialog
        open={Boolean(statusTarget)}
        onClose={closeStatus}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle
          sx={{
            color: NAVY,
            fontWeight: 700,
          }}
        >
          {statusTarget?.status
            ? "Desactivar norma"
            : "Activar norma"}
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2}>
            {statusError && (
              <Alert severity="error">
                {statusError}
              </Alert>
            )}

            <Typography sx={{ fontSize: 14 }}>
              ¿Deseas{" "}
              {statusTarget?.status
                ? "desactivar"
                : "activar"}{" "}
              la siguiente norma?
            </Typography>

            <Box
              sx={{
                bgcolor: "#F4F7FA",
                borderRadius: 2,
                p: 2,
              }}
            >
              <Typography
                sx={{
                  color: NAVY,
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                {statusTarget?.code}
              </Typography>

              <Typography
                sx={{
                  fontSize: 13,
                  mt: 0.5,
                }}
              >
                {statusTarget?.name}
              </Typography>
            </Box>

            {statusTarget?.status ? (
              <Alert severity="warning">
                <Stack spacing={1}>
                  <Typography
                    sx={{
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    La norma quedará en modo de solo lectura.
                  </Typography>

                  <Typography sx={{ fontSize: 13 }}>
                    La norma y sus requisitos permanecerán
                    disponibles únicamente para consulta.
                  </Typography>

                  <Typography sx={{ fontSize: 13 }}>
                    No podrán modificarse ni utilizarse
                    para nuevas vinculaciones normativas
                    hasta que la norma sea reactivada.
                  </Typography>

                  <Typography sx={{ fontSize: 13 }}>
                    Las vinculaciones existentes se conservarán.
                  </Typography>
                </Stack>
              </Alert>
            ) : (
              <Alert severity="info">
                La norma volverá a estar habilitada
                dentro del catálogo normativo.
                Podrá utilizarse para nuevas vinculaciones
                y realizar las modificaciones permitidas
                por el sistema.
              </Alert>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            disabled={statusSaving}
            onClick={closeStatus}
            sx={{
              textTransform: "none",
            }}
          >
            Cancelar
          </Button>

          <Button
            variant="contained"
            color={
              statusTarget?.status
                ? "error"
                : "success"
            }
            disabled={statusSaving}
            onClick={() =>
              void confirmStatus()
            }
            sx={{
              textTransform: "none",
            }}
          >
            {statusSaving
              ? "Guardando..."
              : statusTarget?.status
                ? "Desactivar"
                : "Activar"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Administración de requisitos normativos */}
      {requirementsNorm && (
        <NormRequirements
          key={requirementsNorm.id}
          norm={requirementsNorm}
          onClose={() =>
            setRequirementsNorm(null)
          }
        />
      )}
    </>
  );
}
