
import { useEffect, useMemo, useState } from "react";

import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import ChecklistIcon from "@mui/icons-material/Checklist";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlined";
import BlockIcon from "@mui/icons-material/Block";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import ChecklistVersions from "../components/checklists/ChecklistVersions";

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import {
  getAllChecklists,
  getChecklist,
  getChecklistActiveVersion,
  createChecklist,
  updateChecklist,
  updateChecklistStatus,
} from "../services/checklists.service";

import type {
  Checklist,
  ChecklistPayload,
  ActiveChecklistVersion,
} from "../types/checklists";

const NAVY = "#16324F";
const GREEN = "#0F9D8A";

type VersionState =
  | "loading"
  | "available"
  | "unavailable"
  | "error";

interface ChecklistView extends Checklist {
  activeVersion: ActiveChecklistVersion | null;
  versionState: VersionState;
}

const emptyForm: ChecklistPayload = {
  name: "",
  description: "",
};

const answerLabels: Record<string, string> = {
  boolean: "Sí / No",
  yes_no: "Sí / No",
  text: "Texto",
  number: "Numérica",
  numeric: "Numérica",
  multiple_choice: "Selección múltiple",
  single_choice: "Selección única",
  compliance: "Cumplimiento",
};

function errorText(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "No fue posible completar la solicitud.";
}

function isNotFound(error: unknown): boolean {
  if (typeof error === "object" && error !== null) {
    const value = error as {
      status?: number;
      statusCode?: number;
      code?: string;
    };

    if (
      value.status === 404 ||
      value.statusCode === 404 ||
      value.code === "not_found"
    ) {
      return true;
    }
  }

  return /404|not found|no encontrado|no se encontr/i.test(
    errorText(error)
  );
}

function dateText(value: string | null): string {
  if (!value) return "—";

  const date = new Date(
    value.length === 10
      ? `${value}T12:00:00`
      : value
  );

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("es-MX");
}

function questionCount(
  version: ActiveChecklistVersion | null
): number {
  if (!version) return 0;

  return version.sections.reduce(
    (total, section) =>
      total + (section.questions?.length ?? 0),
    0
  );
}

async function enrichChecklist(
  checklist: Checklist
): Promise<ChecklistView> {
  if (!checklist.status) {
    return {
      ...checklist,
      activeVersion: null,
      versionState: "unavailable",
    };
  }

  try {
    const response = await getChecklistActiveVersion(
      checklist.id
    );

    return {
      ...checklist,
      activeVersion: response.data.active_version,
      versionState: "available",
    };
  } catch (error) {
    return {
      ...checklist,
      activeVersion: null,
      versionState: isNotFound(error)
        ? "unavailable"
        : "error",
    };
  }
}

function SummaryCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <Paper
      sx={{
        p: 2.5,
        border: "1px solid #DCE6EE",
        borderRadius: 3,
        boxShadow: "none",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: 13,
              color: "#81909D",
              fontWeight: 600,
            }}
          >
            {label}
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
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 48,
            height: 48,
            borderRadius: 2,
            color,
            bgcolor: `${color}15`,
          }}
        >
          {icon}
        </Box>
      </Box>
    </Paper>
  );
}

export default function Checklists() {
  const [checklists, setChecklists] = useState<ChecklistView[]>([]);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);

  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("Todos");

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [modalFormulario, setModalFormulario] = useState(false);
  const [idEditando, setIdEditando] = useState<string | null>(null);
  const [form, setForm] = useState<ChecklistPayload>(emptyForm);
  const [formError, setFormError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [seleccionado, setSeleccionado] =
    useState<ChecklistView | null>(null);

  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState("");

  const [confirmarEstado, setConfirmarEstado] =
    useState<ChecklistView | null>(null);

  const [actualizandoEstado, setActualizandoEstado] =
    useState(false);

  const [errorEstado, setErrorEstado] = useState("");

  const [checklistVersiones, setChecklistVersiones] =
    useState<Checklist | null>(null);

  // Consulta del listado y sus versiones publicadas.
  useEffect(() => {
    let active = true;

    async function cargar() {
      setLoading(true);
      setError("");

      try {
        const result = await getAllChecklists();

        if (!active) return;

        const initial: ChecklistView[] = result.map(
          (item) => ({
            ...item,
            activeVersion: null,
            versionState: item.status
              ? "loading"
              : "unavailable",
          })
        );

        setChecklists(initial);

        // Consultar las versiones por grupos para no
        // enviar demasiadas solicitudes simultáneas.
        const batchSize = 5;

        for (
          let index = 0;
          index < result.length;
          index += batchSize
        ) {
          const batch = result.slice(
            index,
            index + batchSize
          );

          const enriched = await Promise.all(
            batch.map(enrichChecklist)
          );

          if (!active) return;

          setChecklists((previous) =>
            previous.map(
              (item) =>
                enriched.find(
                  (entry) =>
                    entry.id === item.id
                ) ?? item
            )
          );
        }
      } catch (e) {
        if (active) {
          setError(
            `No se pudieron consultar los checklists: ${errorText(e)}`
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void cargar();

    return () => {
      active = false;
    };
  }, [reload]);

  // Consulta del detalle directamente desde la API.
  useEffect(() => {
    let active = true;

    setSeleccionado(null);
    setErrorDetalle("");

    if (!selectedId) {
      setCargandoDetalle(false);

      return () => {
        active = false;
      };
    }

    setCargandoDetalle(true);

    async function cargarDetalle(id: string) {
      try {
        const response = await getChecklist(id);

        const detail = await enrichChecklist(
          response.data
        );

        if (active) {
          setSeleccionado(detail);
        }
      } catch (e) {
        if (active) {
          setErrorDetalle(errorText(e));
        }
      } finally {
        if (active) {
          setCargandoDetalle(false);
        }
      }
    }

    void cargarDetalle(selectedId);

    return () => {
      active = false;
    };
  }, [selectedId]);

  const resumen = useMemo(() => {
    return {
      total: checklists.length,
      activos: checklists.filter(
        (item) => item.status
      ).length,
      inactivos: checklists.filter(
        (item) => !item.status
      ).length,
      publicados: checklists.filter(
        (item) => item.versionState === "available"
      ).length,
    };
  }, [checklists]);

  const filtrados = useMemo(() => {
    const term = search.trim().toLowerCase();

    return checklists.filter((item) => {
      const matchSearch =
        !term ||
        item.name.toLowerCase().includes(term) ||
        (item.description ?? "")
          .toLowerCase()
          .includes(term);

      const matchEstado =
        estado === "Todos" ||
        (estado === "Activo" && item.status) ||
        (estado === "Inactivo" && !item.status);

      return matchSearch && matchEstado;
    });
  }, [checklists, search, estado]);

  function abrirNuevo() {
    setIdEditando(null);
    setForm({ ...emptyForm });
    setFormError("");
    setMensaje("");
    setModalFormulario(true);
  }

  function abrirEdicion(item: Checklist) {
    setIdEditando(item.id);

    setForm({
      name: item.name,
      description: item.description ?? "",
    });

    setFormError("");
    setMensaje("");
    setModalFormulario(true);
  }

  function cerrarFormulario() {
    if (guardando) return;

    setModalFormulario(false);
    setFormError("");
  }

  async function guardarChecklist() {
    if (guardando) return;

    const name = form.name.trim();

    if (!name) {
      setFormError(
        "El nombre del checklist es obligatorio."
      );
      return;
    }

    if (name.length > 150) {
      setFormError(
        "El nombre no puede superar los 150 caracteres."
      );
      return;
    }

    const description =
      form.description?.trim() || null;

    if (
      description &&
      new TextEncoder().encode(description).length > 65535
    ) {
      setFormError(
        "La descripción supera el tamaño permitido."
      );
      return;
    }

    const payload: ChecklistPayload = {
      name,
      description,
    };

    setGuardando(true);
    setFormError("");
    setMensaje("");

    try {
      if (idEditando) {
        await updateChecklist(idEditando, payload);

        setMensaje(
          "Checklist actualizado correctamente."
        );
      } else {
        await createChecklist(payload);

        setMensaje(
          "Checklist creado correctamente."
        );
      }

      setModalFormulario(false);
      setReload((previous) => previous + 1);
    } catch (e) {
      setFormError(errorText(e));
    } finally {
      setGuardando(false);
    }
  }

  function abrirConfirmacion(item: ChecklistView) {
    setErrorEstado("");
    setMensaje("");
    setConfirmarEstado(item);
  }

  async function cambiarEstado() {
    if (!confirmarEstado || actualizandoEstado) {
      return;
    }

    setActualizandoEstado(true);
    setErrorEstado("");

    try {
      const response = await updateChecklistStatus(
        confirmarEstado.id,
        !confirmarEstado.status
      );

      setMensaje(
        response.data.status
          ? "Checklist activado correctamente."
          : "Checklist desactivado correctamente."
      );

      setConfirmarEstado(null);
      setReload((previous) => previous + 1);
    } catch (e) {
      setErrorEstado(errorText(e));
    } finally {
      setActualizandoEstado(false);
    }
  }

  const tableColumns =
    "minmax(220px, 1.2fr) minmax(260px, 1.5fr) 120px 135px 130px 115px 140px";

  return (
    <section className="page-section">
      {/* Encabezado */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        sx={{
          justifyContent: "space-between",
          alignItems: {
            xs: "stretch",
            md: "center",
          },
          mb: 3,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: 13,
              color: "#81909D",
              fontWeight: 600,
            }}
          >
            MÓDULO
          </Typography>

          <Typography
            component="h1"
            sx={{
              fontSize: { xs: 28, md: 34 },
              fontWeight: 700,
              color: NAVY,
            }}
          >
            Checklists
          </Typography>

          <Typography
            sx={{
              fontSize: 15,
              color: "#81909D",
              mt: 0.5,
            }}
          >
            Administra cuestionarios de inspección,
            versiones y preguntas con fundamento normativo.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={abrirNuevo}
          sx={{
            minHeight: 44,
            bgcolor: NAVY,
            textTransform: "none",
            "&:hover": {
              bgcolor: "#0F263D",
            },
          }}
        >
          Nuevo checklist
        </Button>
      </Stack>

      {/* Mensajes generales */}
      {mensaje && (
        <Alert
          severity="success"
          onClose={() => setMensaje("")}
          sx={{ mb: 2 }}
        >
          {mensaje}
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
              onClick={() =>
                setReload((previous) => previous + 1)
              }
            >
              Reintentar
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Indicadores */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            lg: "repeat(4, 1fr)",
          },
          gap: 2,
          mb: 3,
        }}
      >
        <SummaryCard
          label="Total de checklists"
          value={resumen.total}
          color={NAVY}
          icon={<ChecklistIcon />}
        />

        <SummaryCard
          label="Activos"
          value={resumen.activos}
          color={GREEN}
          icon={<CheckCircleOutlineIcon />}
        />

        <SummaryCard
          label="Inactivos"
          value={resumen.inactivos}
          color="#B42318"
          icon={<BlockIcon />}
        />

        <SummaryCard
          label="Con versión activa"
          value={resumen.publicados}
          color="#2673C9"
          icon={<LayersOutlinedIcon />}
        />
      </Box>

      {/* Filtros */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        sx={{ mb: 2 }}
      >
        <TextField
          size="small"
          placeholder="Buscar checklist..."
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          sx={{
            flex: 1,
            minWidth: 200,
            "& .MuiInputBase-input": {
              fontSize: 14,
            },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon
                    sx={{
                      fontSize: 20,
                      color: "#81909D",
                    }}
                  />
                </InputAdornment>
              ),
            },
          }}
        />

        <FormControl
          size="small"
          sx={{ minWidth: 180 }}
        >
          <Select
            value={estado}
            onChange={(event) =>
              setEstado(event.target.value)
            }
          >
            <MenuItem value="Todos">
              Todos los estados
            </MenuItem>

            <MenuItem value="Activo">
              Activos
            </MenuItem>

            <MenuItem value="Inactivo">
              Inactivos
            </MenuItem>
          </Select>
        </FormControl>

        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          disabled={loading}
          onClick={() =>
            setReload((previous) => previous + 1)
          }
          sx={{
            color: GREEN,
            borderColor: GREEN,
            textTransform: "none",
          }}
        >
          Actualizar
        </Button>
      </Stack>

      {/* Tabla principal */}
      <Paper
        sx={{
          overflowX: "auto",
          border: "1px solid #DCE6EE",
          borderRadius: 3,
          boxShadow: "none",
        }}
      >
        <Box
          sx={{
            minWidth: 1070,
            display: "grid",
            gridTemplateColumns: tableColumns,
          }}
        >
          {[
            "CHECKLIST",
            "DESCRIPCIÓN",
            "PREGUNTAS",
            "VERSIÓN ACTIVA",
            "ACTUALIZACIÓN",
            "ESTADO",
            "ACCIONES",
          ].map((header) => (
            <Box
              key={header}
              sx={{
                p: 2,
                fontSize: 12,
                fontWeight: 700,
                color: "#71808C",
                bgcolor: "#F4F7FA",
                whiteSpace: "nowrap",
              }}
            >
              {header}
            </Box>
          ))}

          {loading && checklists.length === 0 ? (
            <Box
              sx={{
                gridColumn: "1 / -1",
                p: 5,
                textAlign: "center",
              }}
            >
              <CircularProgress
                size={30}
                sx={{ color: GREEN }}
              />

              <Typography
                sx={{
                  mt: 2,
                  fontSize: 14,
                  color: "#81909D",
                }}
              >
                Consultando checklists...
              </Typography>
            </Box>
          ) : (
            filtrados.map((item) => (
              <Box
                key={item.id}
                sx={{
                  gridColumn: "1 / -1",
                  display: "grid",
                  gridTemplateColumns: tableColumns,
                  borderTop: "1px solid #DCE6EE",
                  alignItems: "center",
                }}
              >
                <Box
                  sx={{
                    p: 2,
                    fontSize: 14,
                    fontWeight: 700,
                    color: NAVY,
                    overflowWrap: "anywhere",
                  }}
                >
                  {item.name}
                </Box>

                <Box
                  sx={{
                    p: 2,
                    fontSize: 13,
                    color: "#526477",
                    lineHeight: 1.5,
                    overflowWrap: "anywhere",
                  }}
                >
                  {item.description ||
                    "Sin descripción"}
                </Box>

                <Box
                  sx={{
                    p: 2,
                    fontSize: 14,
                    color: NAVY,
                  }}
                >
                  {item.versionState === "loading" ? (
                    <CircularProgress size={16} />
                  ) : item.activeVersion ? (
                    questionCount(item.activeVersion)
                  ) : (
                    "—"
                  )}
                </Box>

                <Box
                  sx={{
                    p: 2,
                    fontSize: 13,
                    color: NAVY,
                    fontWeight: 600,
                  }}
                >
                  {item.versionState === "loading" ? (
                    <CircularProgress size={16} />
                  ) : item.activeVersion ? (
                    item.activeVersion.version
                  ) : item.versionState === "error" ? (
                    <Typography
                      sx={{
                        fontSize: 12,
                        color: "error.main",
                      }}
                    >
                      No disponible
                    </Typography>
                  ) : (
                    <Typography
                      sx={{
                        fontSize: 12,
                        color: "#81909D",
                      }}
                    >
                      {item.status
                        ? "Sin versión activa"
                        : "No aplica"}
                    </Typography>
                  )}
                </Box>

                <Box
                  sx={{
                    p: 2,
                    fontSize: 13,
                    color: "#81909D",
                  }}
                >
                  {dateText(item.updated_at)}
                </Box>

                <Box sx={{ p: 2 }}>
                  <Tooltip
                    title={
                      item.status
                        ? "Desactivar checklist"
                        : "Activar checklist"
                    }
                  >
                    <Chip
                      size="small"
                      label={
                        item.status
                          ? "Activo"
                          : "Inactivo"
                      }
                      onClick={() =>
                        abrirConfirmacion(item)
                      }
                      sx={{
                        minWidth: 85,
                        color: "#FFF",
                        fontWeight: 700,
                        cursor: "pointer",
                        bgcolor: item.status
                          ? "#16803C"
                          : "#B42318",
                      }}
                    />
                  </Tooltip>
                </Box>

                <Stack
                  direction="row"
                  spacing={0.5}
                  sx={{
                    p: 1,
                    justifyContent: "center",
                  }}
                >
                  <Tooltip title="Ver detalle">
                    <IconButton
                      size="small"
                      onClick={() => setSelectedId(item.id)}
                      sx={{ color: NAVY }}
                    >
                      <VisibilityOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Editar checklist">
                    <IconButton
                      size="small"
                      onClick={() => abrirEdicion(item)}
                      sx={{ color: GREEN }}
                    >
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Gestionar versiones">
                    <IconButton
                      size="small"
                      onClick={() => setChecklistVersiones(item)}
                      sx={{ color: GREEN }}
                    >
                      <LayersOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>
            ))
          )}

          {!loading && filtrados.length === 0 && (
            <Box
              sx={{
                gridColumn: "1 / -1",
                p: 4,
                textAlign: "center",
                color: "#81909D",
              }}
            >
              {error
                ? "No fue posible cargar el listado."
                : "No hay checklists que coincidan con la búsqueda."}
            </Box>
          )}
        </Box>

        <Box
          sx={{
            p: 1.75,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid #DCE6EE",
          }}
        >
          <Typography
            sx={{
              fontSize: 13,
              color: "#81909D",
            }}
          >
            Mostrando {filtrados.length} de{" "}
            {checklists.length} checklists
          </Typography>

          <Typography
            sx={{
              fontSize: 13,
              color: "#81909D",
            }}
          >
            {filtrados.length === 1
              ? "1 resultado"
              : `${filtrados.length} resultados`}
          </Typography>
        </Box>
      </Paper>

      {/* Formulario de creación y edición */}
      <Dialog
        open={modalFormulario}
        onClose={cerrarFormulario}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle
          sx={{
            color: NAVY,
            fontWeight: 700,
          }}
        >
          {idEditando
            ? "Editar checklist"
            : "Crear checklist"}
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {formError && (
              <Alert severity="error">
                {formError}
              </Alert>
            )}

            <TextField
              label="Nombre del checklist"
              required
              fullWidth
              disabled={guardando}
              value={form.name}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  name: event.target.value,
                }))
              }
              helperText={`${form.name.length}/150 caracteres`}
              slotProps={{
                htmlInput: {
                  maxLength: 150,
                },
              }}
            />

            <TextField
              label="Descripción"
              fullWidth
              multiline
              minRows={4}
              disabled={guardando}
              value={form.description ?? ""}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  description: event.target.value,
                }))
              }
            />

            {!idEditando && (
              <Alert severity="info">
                El checklist se creará activo.
                Sus versiones, secciones y preguntas
                se administrarán por separado.
              </Alert>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            disabled={guardando}
            onClick={cerrarFormulario}
          >
            Cancelar
          </Button>

          <Button
            variant="contained"
            disabled={guardando}
            onClick={() => void guardarChecklist()}
            sx={{
              bgcolor: NAVY,
              textTransform: "none",
            }}
          >
            {guardando
              ? "Guardando..."
              : idEditando
                ? "Guardar cambios"
                : "Crear checklist"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de detalle */}
      <Dialog
        open={Boolean(selectedId)}
        onClose={() => setSelectedId(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle
          sx={{
            color: NAVY,
            fontWeight: 700,
          }}
        >
          Detalle del checklist
        </DialogTitle>

        <DialogContent dividers>
          {cargandoDetalle ? (
            <Box
              sx={{
                p: 4,
                textAlign: "center",
              }}
            >
              <CircularProgress
                sx={{ color: GREEN }}
              />
            </Box>
          ) : errorDetalle ? (
            <Alert severity="error">
              {errorDetalle}
            </Alert>
          ) : seleccionado ? (
            <Stack spacing={2}>
              <Typography
                variant="h6"
                sx={{
                  color: NAVY,
                  fontWeight: 700,
                }}
              >
                {seleccionado.name}
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 1,
                }}
              >
                <Chip
                  label={
                    seleccionado.status
                      ? "Activo"
                      : "Inactivo"
                  }
                  color={
                    seleccionado.status
                      ? "success"
                      : "error"
                  }
                />

                {seleccionado.activeVersion && (
                  <Chip
                    variant="outlined"
                    label={`Versión ${seleccionado.activeVersion.version}`}
                    sx={{
                      color: GREEN,
                      borderColor: GREEN,
                    }}
                  />
                )}
              </Box>

              <Typography
                sx={{
                  fontSize: 14,
                  whiteSpace: "pre-wrap",
                }}
              >
                {seleccionado.description ||
                  "Sin descripción registrada."}
              </Typography>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(2, 1fr)",
                  },
                  gap: 2,
                }}
              >
                <Paper
                  variant="outlined"
                  sx={{ p: 2, borderRadius: 2 }}
                >
                  <Typography
                    sx={{
                      fontSize: 12,
                      color: "#81909D",
                    }}
                  >
                    Fecha de creación
                  </Typography>

                  <Typography
                    sx={{
                      color: NAVY,
                      fontWeight: 600,
                    }}
                  >
                    {dateText(seleccionado.created_at)}
                  </Typography>
                </Paper>

                <Paper
                  variant="outlined"
                  sx={{ p: 2, borderRadius: 2 }}
                >
                  <Typography
                    sx={{
                      fontSize: 12,
                      color: "#81909D",
                    }}
                  >
                    Última actualización
                  </Typography>

                  <Typography
                    sx={{
                      color: NAVY,
                      fontWeight: 600,
                    }}
                  >
                    {dateText(seleccionado.updated_at)}
                  </Typography>
                </Paper>
              </Box>

              <Divider />

              <Typography
                sx={{
                  color: NAVY,
                  fontWeight: 700,
                }}
              >
                Versión publicada
              </Typography>

              {seleccionado.versionState === "error" ? (
                <Alert severity="warning">
                  No fue posible consultar la versión
                  activa del checklist.
                </Alert>
              ) : !seleccionado.activeVersion ? (
                <Alert severity="info">
                  {seleccionado.status
                    ? "Este checklist no tiene una versión activa disponible."
                    : "El checklist está inactivo. Su versión activa no está disponible para consulta."}
                </Alert>
              ) : (
                <>
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: "#F4F7FA",
                      borderRadius: 2,
                    }}
                  >
                    <Typography
                      sx={{
                        fontWeight: 700,
                        color: NAVY,
                      }}
                    >
                      Versión{" "}
                      {seleccionado.activeVersion.version}
                    </Typography>

                    <Typography
                      sx={{
                        fontSize: 13,
                        color: "#526477",
                        mt: 0.5,
                      }}
                    >
                      Publicada el{" "}
                      {dateText(
                        seleccionado.activeVersion
                          .published_at
                      )}
                    </Typography>

                    <Typography
                      sx={{
                        fontSize: 13,
                        color: "#526477",
                        mt: 0.5,
                      }}
                    >
                      {seleccionado.activeVersion.sections.length}{" "}
                      secciones ·{" "}
                      {questionCount(
                        seleccionado.activeVersion
                      )}{" "}
                      preguntas activas
                    </Typography>
                  </Box>

                  {seleccionado.activeVersion.sections.map(
                    (section, sectionIndex) => (
                      <Paper
                        key={section.id}
                        variant="outlined"
                        sx={{
                          p: 2,
                          borderRadius: 2,
                        }}
                      >
                        <Typography
                          sx={{
                            color: NAVY,
                            fontWeight: 700,
                            mb: 1.5,
                          }}
                        >
                          {sectionIndex + 1}.{" "}
                          {section.name}
                        </Typography>

                        <Stack spacing={1.5}>
                          {!section.questions?.length && (
                            <Typography
                              sx={{
                                fontSize: 13,
                                color: "#81909D",
                              }}
                            >
                              Sin preguntas activas.
                            </Typography>
                          )}

                          {section.questions?.map(
                            (question, index) => (
                              <Box
                                key={question.id}
                                sx={{
                                  p: 1.5,
                                  border:
                                    "1px solid #DCE6EE",
                                  borderRadius: 2,
                                }}
                              >
                                <Typography
                                  sx={{
                                    fontSize: 14,
                                    fontWeight: 600,
                                    color: NAVY,
                                  }}
                                >
                                  {index + 1}.{" "}
                                  {question.question_text}
                                </Typography>

                                {question.description && (
                                  <Typography
                                    sx={{
                                      fontSize: 13,
                                      color: "#526477",
                                      mt: 0.5,
                                    }}
                                  >
                                    {question.description}
                                  </Typography>
                                )}

                                <Box
                                  sx={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: 0.75,
                                    mt: 1.5,
                                  }}
                                >
                                  <Chip
                                    size="small"
                                    variant="outlined"
                                    label={
                                      answerLabels[
                                      question.answer_type
                                      ] ??
                                      question.answer_type
                                    }
                                  />

                                  {question.required && (
                                    <Chip
                                      size="small"
                                      label="Obligatoria"
                                      color="info"
                                      variant="outlined"
                                    />
                                  )}

                                  {question.allows_evidence && (
                                    <Chip
                                      size="small"
                                      label="Permite evidencia"
                                      color="success"
                                      variant="outlined"
                                    />
                                  )}
                                </Box>

                                {!!question.norm_requirements?.length && (
                                  <Box sx={{ mt: 1.5 }}>
                                    <Typography
                                      sx={{
                                        fontSize: 12,
                                        fontWeight: 700,
                                        color: NAVY,
                                      }}
                                    >
                                      Requisitos normativos
                                    </Typography>

                                    {question.norm_requirements.map(
                                      (requirement) => (
                                        <Typography
                                          key={
                                            requirement.link_id
                                          }
                                          sx={{
                                            fontSize: 12,
                                            color: "#526477",
                                            mt: 0.5,
                                          }}
                                        >
                                          {requirement.code}
                                          {requirement.description
                                            ? ` — ${requirement.description}`
                                            : ""}
                                        </Typography>
                                      )
                                    )}
                                  </Box>
                                )}
                              </Box>
                            )
                          )}
                        </Stack>
                      </Paper>
                    )
                  )}
                </>
              )}
            </Stack>
          ) : null}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          {seleccionado && (
            <Button
              variant="outlined"
              startIcon={<EditOutlinedIcon />}
              onClick={() => {
                const item = seleccionado;
                setSelectedId(null);
                abrirEdicion(item);
              }}
              sx={{
                color: GREEN,
                borderColor: GREEN,
                textTransform: "none",
              }}
            >
              Editar checklist
            </Button>
          )}

          <Button
            variant="contained"
            onClick={() => setSelectedId(null)}
            sx={{
              bgcolor: NAVY,
              textTransform: "none",
            }}
          >
            Cerrar detalle
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmación de cambio de estado */}
      <Dialog
        open={Boolean(confirmarEstado)}
        onClose={() => {
          if (!actualizandoEstado) {
            setConfirmarEstado(null);
            setErrorEstado("");
          }
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle
          sx={{
            color: NAVY,
            fontWeight: 700,
          }}
        >
          {confirmarEstado?.status
            ? "Desactivar checklist"
            : "Activar checklist"}
        </DialogTitle>

        <DialogContent>
          <Typography>
            ¿Deseas{" "}
            {confirmarEstado?.status
              ? "desactivar"
              : "activar"}{" "}
            el checklist «{confirmarEstado?.name}»?
          </Typography>

          {confirmarEstado?.status && (
            <Alert
              severity="warning"
              sx={{ mt: 2 }}
            >
              El checklist dejará de estar disponible
              como checklist activo. Sus versiones y
              registros existentes se conservarán.
            </Alert>
          )}

          {errorEstado && (
            <Alert
              severity="error"
              sx={{ mt: 2 }}
            >
              {errorEstado}
            </Alert>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            disabled={actualizandoEstado}
            onClick={() => {
              setConfirmarEstado(null);
              setErrorEstado("");
            }}
          >
            Cancelar
          </Button>

          <Button
            variant="contained"
            disabled={actualizandoEstado}
            onClick={() => void cambiarEstado()}
            sx={{
              bgcolor: confirmarEstado?.status
                ? "#B42318"
                : GREEN,
              textTransform: "none",
              "&:hover": {
                bgcolor: confirmarEstado?.status
                  ? "#912018"
                  : "#0C8878",
              },
            }}
          >
            {actualizandoEstado
              ? "Guardando..."
              : confirmarEstado?.status
                ? "Desactivar"
                : "Activar"}
          </Button>
        </DialogActions>
      </Dialog>

      {checklistVersiones && (
        <ChecklistVersions
          key={checklistVersiones.id}
          checklist={checklistVersiones}
          onClose={() => setChecklistVersiones(null)}
          onChanged={() =>
            setReload((previous) => previous + 1)
          }
        />
      )}

    </section>
  );
}
