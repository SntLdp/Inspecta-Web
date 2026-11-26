import {
    useEffect,
    useMemo,
    useState,
} from "react";

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
    IconButton,
    MenuItem,
    Paper,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ListAltOutlinedIcon from "@mui/icons-material/ListAltOutlined";

import NormRequirementForm from "./NormRequirementForm";

import {
    getAllNormRequirements,
    getNormRequirement,
    createNormRequirement,
    updateNormRequirement,
} from "../../services/norms.service";

import type {
    Norm,
    NormRequirement,
    NormRequirementPayload,
} from "../../types/norms";

const NAVY = "#16324F";
const GREEN = "#0F9D8A";

interface Props {
    norm: Norm;
    onClose: () => void;
    onChanged?: () => void;
}

function errorText(error: unknown): string {
    return error instanceof Error
        ? error.message
        : "No fue posible completar la solicitud.";
}

function normalizeText(value: string): string {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function dateTimeText(value: string | null): string {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleString("es-MX", {
        dateStyle: "medium",
        timeStyle: "short",
    });
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
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                }}
            >
                {value}
            </Typography>
        </Box>
    );
}

export default function NormRequirements({
    norm,
    onClose,
    onChanged,
}: Props) {
    const [requirements, setRequirements] =
        useState<NormRequirement[]>([]);

    const [loading, setLoading] = useState(true);
    const [reload, setReload] = useState(0);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Búsqueda y filtros.
    const [search, setSearch] = useState("");
    const [sectionFilter, setSectionFilter] =
        useState("");

    // Creación y edición.
    const [formOpen, setFormOpen] = useState(false);

    const [editing, setEditing] =
        useState<NormRequirement | null>(null);

    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);

    // Consulta individual.
    const [selectedId, setSelectedId] =
        useState<string | null>(null);

    const [detail, setDetail] =
        useState<NormRequirement | null>(null);

    const [detailLoading, setDetailLoading] =
        useState(false);

    const [detailError, setDetailError] =
        useState("");

    const editable = norm.status;

    const busy = loading || saving;

    const modalOpen =
        formOpen || Boolean(selectedId);

    // Consultar todos los requisitos de la norma.
    useEffect(() => {
        let active = true;

        setLoading(true);
        setError("");

        getAllNormRequirements(norm.id)
            .then((result) => {
                if (active) {
                    setRequirements(result);
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
    }, [norm.id, reload]);

    // Consultar un requisito individual.
    useEffect(() => {
        if (!selectedId) return;

        let active = true;

        setDetail(null);
        setDetailLoading(true);
        setDetailError("");

        getNormRequirement(selectedId)
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

    // Obtener las secciones existentes.
    const sections = useMemo(() => {
        const values = requirements
            .map((requirement) =>
                requirement.section?.trim()
            )
            .filter(
                (value): value is string =>
                    Boolean(value)
            );

        return [...new Set(values)].sort(
            (a, b) => a.localeCompare(b, "es")
        );
    }, [requirements]);

    // Restablecer filtros que ya no existan.
    useEffect(() => {
        if (
            sectionFilter &&
            sectionFilter !== "__without_section__" &&
            !sections.includes(sectionFilter)
        ) {
            setSectionFilter("");
        }
    }, [sections, sectionFilter]);

    // Aplicar búsqueda y filtros.
    const filteredRequirements = useMemo(() => {
        const text = normalizeText(search);

        return requirements.filter((requirement) => {
            const searchable = normalizeText(
                [
                    requirement.code,
                    requirement.section ?? "",
                    requirement.description,
                ].join(" ")
            );

            const matchesSearch =
                !text || searchable.includes(text);

            const section =
                requirement.section?.trim() ?? "";

            const matchesSection =
                !sectionFilter ||
                (
                    sectionFilter === "__without_section__" &&
                    !section
                ) ||
                section === sectionFilter;

            return matchesSearch && matchesSection;
        });
    }, [requirements, search, sectionFilter]);

    function requestClose() {
        if (saving || modalOpen) return;

        onClose();
    }

    function openCreate() {
        if (!editable || busy || modalOpen) return;

        setEditing(null);
        setFormError("");
        setSuccess("");
        setFormOpen(true);
    }

    function openEdit(requirement: NormRequirement) {
        if (!editable || busy || formOpen) return;

        setSelectedId(null);
        setDetail(null);

        setEditing(requirement);
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

    async function saveRequirement(
        payload: NormRequirementPayload
    ) {
        if (saving) return;

        if (!editable) {
            setFormError(
                "No se pueden modificar requisitos de una norma inactiva."
            );
            return;
        }

        setSaving(true);
        setFormError("");
        setSuccess("");

        try {
            if (editing) {
                await updateNormRequirement(
                    editing.id,
                    payload
                );

                setSuccess(
                    "Requisito actualizado correctamente."
                );
            } else {
                await createNormRequirement(
                    norm.id,
                    payload
                );

                setSuccess(
                    "Requisito registrado correctamente."
                );
            }

            setFormOpen(false);
            setEditing(null);

            setReload((previous) => previous + 1);

            onChanged?.();
        } catch (e) {
            setFormError(errorText(e));
        } finally {
            setSaving(false);
        }
    }

    function openDetail(requirementId: string) {
        if (busy || modalOpen) return;

        setDetail(null);
        setDetailError("");
        setDetailLoading(true);
        setSelectedId(requirementId);
    }

    function closeDetail() {
        setSelectedId(null);
        setDetail(null);
        setDetailError("");
    }

    return (
        <>
            {/* Administrador principal */}
            <Dialog
                open
                fullWidth
                maxWidth="md"
                onClose={requestClose}
                slotProps={{
                    paper: {
                        sx: { borderRadius: 3 },
                    },
                }}
            >
                <DialogTitle>
                    <Typography
                        sx={{
                            fontSize: 11,
                            color: "text.secondary",
                            fontWeight: 700,
                            letterSpacing: 1,
                        }}
                    >
                        CATÁLOGO NORMATIVO
                    </Typography>

                    <Typography
                        sx={{
                            fontSize: 23,
                            fontWeight: 700,
                            color: NAVY,
                            mt: 0.5,
                        }}
                    >
                        Requisitos normativos
                    </Typography>
                </DialogTitle>

                <DialogContent dividers>
                    <Stack spacing={2.5}>
                        {/* Información de la norma */}
                        <Box
                            sx={{
                                p: 2.5,
                                bgcolor: "#F4F7FA",
                                borderRadius: 2,
                            }}
                        >
                            <Stack
                                direction="row"
                                spacing={2}
                                sx={{
                                    justifyContent: "space-between",
                                    alignItems: "flex-start",
                                }}
                            >
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography
                                        sx={{
                                            color: NAVY,
                                            fontSize: 18,
                                            fontWeight: 700,
                                            overflowWrap: "anywhere",
                                        }}
                                    >
                                        {norm.code}
                                    </Typography>

                                    <Typography
                                        sx={{
                                            fontSize: 14,
                                            color: NAVY,
                                            mt: 0.5,
                                        }}
                                    >
                                        {norm.name}
                                    </Typography>

                                    <Typography
                                        sx={{
                                            fontSize: 12,
                                            color: "text.secondary",
                                            mt: 1,
                                        }}
                                    >
                                        Versión: {norm.version || "—"}
                                    </Typography>
                                </Box>

                                <Chip
                                    size="small"
                                    label={
                                        norm.status
                                            ? "Activa"
                                            : "Inactiva"
                                    }
                                    color={
                                        norm.status
                                            ? "success"
                                            : "default"
                                    }
                                />
                            </Stack>
                        </Box>

                        {!editable && (
                            <Alert severity="warning">
                                <Typography
                                    sx={{
                                        fontSize: 14,
                                        fontWeight: 700,
                                        mb: 0.5,
                                    }}
                                >
                                    Modo de solo lectura
                                </Typography>

                                Esta norma se encuentra inactiva.
                                Sus requisitos permanecen disponibles
                                para consulta, pero no pueden crearse
                                ni modificarse hasta que la norma sea
                                reactivada.
                            </Alert>
                        )}

                        {success && (
                            <Alert
                                severity="success"
                                onClose={() => setSuccess("")}
                            >
                                {success}
                            </Alert>
                        )}

                        {error && (
                            <Alert
                                severity="error"
                                action={
                                    <Button
                                        color="inherit"
                                        size="small"
                                        disabled={busy}
                                        onClick={() =>
                                            setReload(
                                                (previous) =>
                                                    previous + 1
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

                        {/* Indicadores */}
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
                            <Paper
                                variant="outlined"
                                sx={{
                                    p: 2,
                                    borderRadius: 2,
                                }}
                            >
                                <Typography
                                    sx={{
                                        fontSize: 12,
                                        color: "text.secondary",
                                    }}
                                >
                                    Total de requisitos
                                </Typography>

                                <Typography
                                    sx={{
                                        fontSize: 28,
                                        fontWeight: 700,
                                        color: NAVY,
                                    }}
                                >
                                    {loading || error
                                        ? "—"
                                        : requirements.length}
                                </Typography>
                            </Paper>

                            <Paper
                                variant="outlined"
                                sx={{
                                    p: 2,
                                    borderRadius: 2,
                                }}
                            >
                                <Typography
                                    sx={{
                                        fontSize: 12,
                                        color: "text.secondary",
                                    }}
                                >
                                    Secciones registradas
                                </Typography>

                                <Typography
                                    sx={{
                                        fontSize: 28,
                                        fontWeight: 700,
                                        color: NAVY,
                                    }}
                                >
                                    {loading || error
                                        ? "—"
                                        : sections.length}
                                </Typography>
                            </Paper>
                        </Box>

                        {/* Buscador y filtro */}
                        <Stack
                            direction={{
                                xs: "column",
                                sm: "row",
                            }}
                            spacing={1.5}
                        >
                            <TextField
                                size="small"
                                fullWidth
                                placeholder="Buscar requisito..."
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                sx={{
                                    minWidth: 0,
                                }}
                                slotProps={{
                                    input: {
                                        startAdornment: (
                                            <SearchIcon
                                                fontSize="small"
                                                sx={{
                                                    color: "text.secondary",
                                                    mr: 1,
                                                }}
                                            />
                                        ),
                                    },
                                }}
                            />

                            <TextField
                                select
                                size="small"
                                label="Sección"
                                value={sectionFilter}
                                onChange={(event) =>
                                    setSectionFilter(
                                        event.target.value
                                    )
                                }
                                sx={{
                                    width: {
                                        xs: "100%",
                                        sm: 200,
                                    },
                                    flexShrink: 0,
                                }}
                                slotProps={{
                                    inputLabel: {
                                        shrink: true,
                                    },
                                    select: {
                                        displayEmpty: true,
                                    },
                                }}
                            >
                                <MenuItem value="">
                                    Todas
                                </MenuItem>

                                {sections.map((section) => (
                                    <MenuItem
                                        key={section}
                                        value={section}
                                    >
                                        {section}
                                    </MenuItem>
                                ))}

                                <MenuItem value="__without_section__">
                                    Sin sección
                                </MenuItem>
                            </TextField>
                        </Stack>

                        {/* Encabezado del listado */}
                        <Stack
                            direction={{
                                xs: "column",
                                sm: "row",
                            }}
                            spacing={1.5}
                            sx={{
                                justifyContent: "space-between",
                                alignItems: {
                                    xs: "stretch",
                                    sm: "center",
                                },
                            }}
                        >
                            <Typography
                                sx={{
                                    color: NAVY,
                                    fontSize: 16,
                                    fontWeight: 700,
                                }}
                            >
                                Requisitos de la norma
                            </Typography>

                            <Stack
                                direction="row"
                                spacing={1}
                                useFlexGap
                                sx={{ flexWrap: "wrap" }}
                            >
                                <Button
                                    variant="outlined"
                                    startIcon={<RefreshIcon />}
                                    disabled={busy || modalOpen}
                                    onClick={() =>
                                        setReload(
                                            (previous) =>
                                                previous + 1
                                        )
                                    }
                                    sx={{
                                        color: GREEN,
                                        borderColor: GREEN,
                                        textTransform: "none",
                                        whiteSpace: "nowrap",
                                        flexShrink: 0,
                                        minWidth: 120,
                                    }}
                                >
                                    Actualizar
                                </Button>

                                <Button
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    disabled={
                                        !editable ||
                                        busy ||
                                        modalOpen ||
                                        Boolean(error)
                                    }
                                    onClick={openCreate}
                                    sx={{
                                        bgcolor: GREEN,
                                        textTransform: "none",
                                        whiteSpace: "nowrap",
                                        flexShrink: 0,
                                        "&:hover": {
                                            bgcolor: "#0C8878",
                                        },
                                    }}
                                >
                                    Nuevo requisito
                                </Button>
                            </Stack>
                        </Stack>

                        {/* Listado de requisitos */}
                        {loading ? (
                            <Stack
                                spacing={1.5}
                                sx={{
                                    alignItems: "center",
                                    py: 5,
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
                                    Consultando requisitos...
                                </Typography>
                            </Stack>
                        ) : error ? (
                            <Typography
                                sx={{
                                    py: 4,
                                    textAlign: "center",
                                    fontSize: 14,
                                    color: "text.secondary",
                                }}
                            >
                                No fue posible cargar los
                                requisitos normativos.
                            </Typography>
                        ) : filteredRequirements.length === 0 ? (
                            <Paper
                                variant="outlined"
                                sx={{
                                    p: 4,
                                    borderRadius: 2,
                                    textAlign: "center",
                                }}
                            >
                                <Stack
                                    spacing={1.5}
                                    sx={{ alignItems: "center" }}
                                >
                                    <ListAltOutlinedIcon
                                        sx={{
                                            fontSize: 42,
                                            color: "#81909D",
                                        }}
                                    />

                                    <Typography
                                        sx={{
                                            color: NAVY,
                                            fontWeight: 600,
                                        }}
                                    >
                                        {requirements.length === 0
                                            ? "Sin requisitos registrados"
                                            : "No se encontraron requisitos"}
                                    </Typography>

                                    <Typography
                                        sx={{
                                            fontSize: 13,
                                            color: "text.secondary",
                                        }}
                                    >
                                        {requirements.length === 0
                                            ? editable
                                                ? "Registra el primer requisito de esta norma."
                                                : "Reactiva la norma para registrar requisitos."
                                            : "Intenta modificar los filtros de búsqueda."}
                                    </Typography>

                                    {requirements.length === 0 && editable && (
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
                                            Registrar requisito
                                        </Button>
                                    )}
                                </Stack>
                            </Paper>
                        ) : (
                            <Stack spacing={1.5}>
                                {filteredRequirements.map(
                                    (requirement) => (
                                        <Paper
                                            key={requirement.id}
                                            variant="outlined"
                                            sx={{
                                                p: 2,
                                                borderRadius: 2,
                                                "&:hover": {
                                                    bgcolor: "#F8FAFC",
                                                },
                                            }}
                                        >
                                            <Stack spacing={1.5}>
                                                <Stack
                                                    direction="row"
                                                    spacing={1.5}
                                                    sx={{ alignItems: "flex-start" }}
                                                >
                                                    <Box
                                                        sx={{
                                                            flex: 1,
                                                            minWidth: 0,
                                                        }}
                                                    >
                                                        <Typography
                                                            sx={{
                                                                color: NAVY,
                                                                fontSize: 15,
                                                                fontWeight: 700,
                                                                overflowWrap: "anywhere",
                                                            }}
                                                        >
                                                            Requisito {requirement.code}
                                                        </Typography>

                                                        <Typography
                                                            sx={{
                                                                fontSize: 12,
                                                                color: "text.secondary",
                                                                mt: 0.5,
                                                                overflowWrap: "anywhere",
                                                            }}
                                                        >
                                                            {requirement.section ||
                                                                "Sin sección asignada"}
                                                        </Typography>
                                                    </Box>

                                                    <Stack
                                                        direction="row"
                                                        spacing={0.5}
                                                        sx={{
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        <Tooltip title="Consultar requisito">
                                                            <span>
                                                                <IconButton
                                                                    size="small"
                                                                    disabled={
                                                                        busy ||
                                                                        modalOpen
                                                                    }
                                                                    onClick={() =>
                                                                        openDetail(
                                                                            requirement.id
                                                                        )
                                                                    }
                                                                    sx={{
                                                                        color: NAVY,
                                                                    }}
                                                                >
                                                                    <VisibilityIcon
                                                                        fontSize="small"
                                                                    />
                                                                </IconButton>
                                                            </span>
                                                        </Tooltip>

                                                        <Tooltip
                                                            title={
                                                                editable
                                                                    ? "Editar requisito"
                                                                    : "Norma inactiva: solo lectura"
                                                            }
                                                        >
                                                            <span>
                                                                <IconButton
                                                                    size="small"
                                                                    disabled={
                                                                        !editable ||
                                                                        busy ||
                                                                        modalOpen
                                                                    }
                                                                    onClick={() =>
                                                                        openEdit(requirement)
                                                                    }
                                                                    sx={{
                                                                        color: GREEN,
                                                                    }}
                                                                >
                                                                    <EditOutlinedIcon fontSize="small" />
                                                                </IconButton>
                                                            </span>
                                                        </Tooltip>
                                                    </Stack>
                                                </Stack>

                                                <Divider />

                                                <Typography
                                                    sx={{
                                                        fontSize: 13,
                                                        color: "#273746",
                                                        lineHeight: 1.7,
                                                        whiteSpace: "pre-wrap",
                                                        overflowWrap: "anywhere",
                                                        display: "-webkit-box",
                                                        WebkitLineClamp: 4,
                                                        WebkitBoxOrient: "vertical",
                                                        overflow: "hidden",
                                                    }}
                                                >
                                                    {requirement.description}
                                                </Typography>
                                            </Stack>
                                        </Paper>
                                    )
                                )}
                            </Stack>
                        )}
                    </Stack>
                </DialogContent>

                <DialogActions
                    sx={{
                        p: 2,
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 1,
                    }}
                >
                    <Typography
                        sx={{
                            fontSize: 12,
                            color: "text.secondary",
                        }}
                    >
                        {loading
                            ? "Cargando requisitos..."
                            : error
                                ? "Listado no disponible"
                                : `Mostrando ${filteredRequirements.length} de ${requirements.length} requisitos`}
                    </Typography>

                    <Button
                        variant="contained"
                        disabled={saving || modalOpen}
                        onClick={requestClose}
                        sx={{
                            bgcolor: NAVY,
                            textTransform: "none",
                        }}
                    >
                        Volver al catálogo
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Formulario de creación y edición */}
            {formOpen && (
                <NormRequirementForm
                    key={editing?.id ?? "new-requirement"}
                    norm={norm}
                    requirement={editing}
                    saving={saving}
                    error={formError}
                    onClose={closeForm}
                    onSave={saveRequirement}
                />
            )}

            {/* Detalle individual */}
            <Dialog
                open={Boolean(selectedId)}
                onClose={closeDetail}
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
                    Detalle del requisito
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
                                <Typography
                                    sx={{
                                        color: NAVY,
                                        fontWeight: 700,
                                        fontSize: 18,
                                        overflowWrap: "anywhere",
                                    }}
                                >
                                    Requisito {detail.code}
                                </Typography>

                                <Typography
                                    sx={{
                                        fontSize: 13,
                                        color: "text.secondary",
                                        mt: 0.5,
                                    }}
                                >
                                    {norm.code} — {norm.name}
                                </Typography>
                            </Box>

                            <InfoField
                                label="Sección o apartado"
                                value={
                                    detail.section ||
                                    "Sin sección asignada"
                                }
                            />

                            <Divider />

                            <InfoField
                                label="Descripción del requisito"
                                value={detail.description}
                            />

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

                <DialogActions sx={{ p: 2 }}>
                    {detail && (
                        <Tooltip
                            title={
                                editable
                                    ? "Editar requisito"
                                    : "Norma inactiva: solo lectura"
                            }
                        >
                            <span>
                                <Button
                                    variant="outlined"
                                    startIcon={<EditOutlinedIcon />}
                                    disabled={!editable || busy}
                                    onClick={() => openEdit(detail)}
                                    sx={{
                                        color: GREEN,
                                        borderColor: GREEN,
                                        textTransform: "none",
                                    }}
                                >
                                    Editar requisito
                                </Button>
                            </span>
                        </Tooltip>
                    )}

                    <Button
                        variant="contained"
                        onClick={closeDetail}
                        sx={{
                            bgcolor: NAVY,
                            textTransform: "none",
                        }}
                    >
                        Volver a requisitos
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
