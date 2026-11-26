
import { useEffect, useState } from "react";

import {
    Alert,
    AlertTitle,
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
    Paper,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import ListAltOutlinedIcon from "@mui/icons-material/ListAltOutlined";
import PublishIcon from "@mui/icons-material/Publish";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";

import ChecklistVersionEditor from "./ChecklistVersionEditor";

import { ApiError } from "../../api/client";

import {
    getAllChecklistVersions,
    getChecklistVersion,
    createChecklistVersion,
    updateChecklistVersion,
    updateChecklistVersionStatus,
} from "../../services/checklists.service";

import type {
    Checklist,
    ChecklistVersion,
    ChecklistVersionStatus,
} from "../../types/checklists";

const NAVY = "#16324F";
const GREEN = "#0F9D8A";

const STATUS_LABELS: Record<ChecklistVersionStatus, string> = {
    draft: "Borrador",
    published: "Publicada",
    archived: "Archivada",
};

const STATUS_COLORS: Record<ChecklistVersionStatus, string> = {
    draft: "#B7791F",
    published: "#16803C",
    archived: "#64748B",
};

type TargetStatus = "published" | "archived";

interface Props {
    checklist: Checklist;
    onClose: () => void;
    onChanged?: () => void;
}

interface StatusTarget {
    version: ChecklistVersion;
    status: TargetStatus;
}

interface StatusIssue {
    field: string;
    message: string;
    suggestion?: string;
}

const STATUS_SUGGESTIONS: Record<string, string> = {
    status:
        "Comprueba que el checklist esté activo y que la versión tenga un estado compatible con la operación.",

    sections:
        "Comprueba que exista al menos una sección y que cada sección contenga al menos una pregunta activa. Si el error persiste, revisa la integridad de la estructura.",

    questions:
        "Revisa el texto, tipo de respuesta y opciones de las preguntas. Las preguntas de opción múltiple deben tener al menos dos opciones válidas y diferentes.",

    norms:
        "Revisa las vinculaciones normativas de todas las preguntas, incluyendo las inactivas. Reactiva las normas correspondientes o elimina las vinculaciones que ya no sean necesarias.",

    fields:
        "La solicitud contiene campos no permitidos. Revisa la integración con la API.",
};

function dateText(value?: string | null): string {
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

function errorText(error: unknown): string {
    return error instanceof Error
        ? error.message
        : "No fue posible completar la solicitud.";
}

function getStatusIssues(error: unknown): StatusIssue[] {
    if (error instanceof ApiError) {
        if (
            error.status === 422 &&
            error.details &&
            typeof error.details === "object"
        ) {
            const details = error.details as Record<
                string,
                unknown
            >;

            if (
                details.errors &&
                typeof details.errors === "object"
            ) {
                const issues: StatusIssue[] = [];

                for (const [field, messages] of Object.entries(
                    details.errors
                )) {
                    const values = Array.isArray(messages)
                        ? messages
                        : [messages];

                    for (const message of values) {
                        if (typeof message !== "string") {
                            continue;
                        }

                        const rootField = field.split(".")[0];

                        issues.push({
                            field,
                            message,
                            suggestion:
                                STATUS_SUGGESTIONS[rootField],
                        });
                    }
                }

                if (issues.length > 0) {
                    return issues;
                }
            }
        }

        if (error.status === 403) {
            return [
                {
                    field: "authorization",
                    message: errorText(error),
                    suggestion:
                        "Comprueba que tu usuario tenga los permisos necesarios para administrar checklists.",
                },
            ];
        }

        if (error.status === 404) {
            return [
                {
                    field: "resource",
                    message: errorText(error),
                    suggestion:
                        "La versión o el checklist ya no está disponible. Actualiza el listado antes de volver a intentarlo.",
                },
            ];
        }

        if (error.status === 401) {
            return [
                {
                    field: "authentication",
                    message: errorText(error),
                    suggestion:
                        "Tu sesión no es válida. Inicia sesión nuevamente.",
                },
            ];
        }
    }

    return [
        {
            field: "general",
            message: errorText(error),
        },
    ];
}

function isEditableVersion(
    version: ChecklistVersion
): boolean {
    return (
        version.status === "draft" &&
        version.published_at === null
    );
}

function canArchiveVersion(
    version: ChecklistVersion
): boolean {
    return (
        version.status === "draft" ||
        version.status === "published"
    );
}

function VersionChip({
    status,
}: {
    status: ChecklistVersionStatus;
}) {
    return (
        <Chip
            size="small"
            label={STATUS_LABELS[status]}
            sx={{
                minWidth: 90,
                bgcolor: STATUS_COLORS[status],
                color: "#FFFFFF",
                fontWeight: 600,
            }}
        />
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
        <Box
            sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: "#F4F7FA",
            }}
        >
            <Typography
                sx={{
                    fontSize: 12,
                    color: "#81909D",
                    mb: 0.5,
                }}
            >
                {label}
            </Typography>

            <Typography
                sx={{
                    fontSize: 14,
                    color: NAVY,
                    fontWeight: 600,
                    overflowWrap: "anywhere",
                }}
            >
                {value}
            </Typography>
        </Box>
    );
}

export default function ChecklistVersions({
    checklist,
    onClose,
    onChanged,
}: Props) {
    // Listado de versiones.
    const [versions, setVersions] =
        useState<ChecklistVersion[]>([]);

    const [loading, setLoading] = useState(true);
    const [reload, setReload] = useState(0);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Formulario de creación y edición.
    const [formOpen, setFormOpen] = useState(false);

    const [editing, setEditing] =
        useState<ChecklistVersion | null>(null);

    const [versionName, setVersionName] = useState("");
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");

    // Detalle de versión.
    const [selectedId, setSelectedId] =
        useState<string | null>(null);

    const [detail, setDetail] =
        useState<ChecklistVersion | null>(null);

    const [detailLoading, setDetailLoading] =
        useState(false);

    const [detailError, setDetailError] =
        useState("");

    // Editor de contenido.
    const [contentVersion, setContentVersion] =
        useState<ChecklistVersion | null>(null);

    // Publicación y archivado.
    const [statusTarget, setStatusTarget] =
        useState<StatusTarget | null>(null);

    const [statusSaving, setStatusSaving] =
        useState(false);

    const [statusIssues, setStatusIssues] =
        useState<StatusIssue[]>([]);

    const busy = loading || saving || statusSaving;

    const modalOpen = Boolean(
        formOpen ||
        selectedId ||
        contentVersion ||
        statusTarget
    );

    // Cargar listado de versiones.
    useEffect(() => {
        let active = true;

        setLoading(true);
        setError("");

        getAllChecklistVersions(checklist.id)
            .then((result) => {
                if (active) {
                    setVersions(result);
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
    }, [checklist.id, reload]);

    // Cargar detalle de versión.
    useEffect(() => {
        let active = true;

        setDetail(null);
        setDetailError("");

        if (!selectedId) {
            setDetailLoading(false);

            return () => {
                active = false;
            };
        }

        setDetailLoading(true);

        getChecklistVersion(
            checklist.id,
            selectedId
        )
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
    }, [checklist.id, selectedId]);

    // Resumen de estados.
    const published = versions.find(
        (version) => version.status === "published"
    );

    const drafts = versions.filter(
        (version) => version.status === "draft"
    ).length;

    const archived = versions.filter(
        (version) => version.status === "archived"
    ).length;

    const previousPublished =
        statusTarget?.status === "published" &&
        published &&
        published.id !== statusTarget.version.id
            ? published
            : null;

    function refreshVersions() {
        if (busy || modalOpen) return;

        setReload((previous) => previous + 1);
    }

    function requestClose() {
        if (saving || statusSaving || modalOpen) {
            return;
        }

        onClose();
    }

    // Creación y edición.
    function openCreate() {
        if (busy || modalOpen || error) return;

        setEditing(null);
        setVersionName("");
        setFormError("");
        setSuccess("");
        setFormOpen(true);
    }

    function openEdit(version: ChecklistVersion) {
        if (
            busy ||
            error ||
            !isEditableVersion(version)
        ) {
            return;
        }

        setSelectedId(null);
        setEditing(version);
        setVersionName(version.version);
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

    async function saveVersion() {
        if (saving || statusSaving) return;

        if (
            editing &&
            !isEditableVersion(editing)
        ) {
            setFormError(
                "Solo se pueden editar borradores nunca publicados."
            );

            return;
        }

        const value = versionName.trim();

        if (!value) {
            setFormError(
                "El número de versión es obligatorio."
            );

            return;
        }

        if (value.length > 20) {
            setFormError(
                "La versión no puede superar los 20 caracteres."
            );

            return;
        }

        const duplicated = versions.some(
            (version) =>
                version.version === value &&
                version.id !== editing?.id
        );

        if (duplicated) {
            setFormError(
                "Ya existe una versión con ese identificador."
            );

            return;
        }

        setSaving(true);
        setFormError("");
        setSuccess("");

        try {
            if (editing) {
                const response =
                    await updateChecklistVersion(
                        checklist.id,
                        editing.id,
                        value
                    );

                setVersions((previous) =>
                    previous.map((version) =>
                        version.id === response.data.id
                            ? response.data
                            : version
                    )
                );

                setSuccess(
                    "Versión actualizada correctamente."
                );
            } else {
                const response =
                    await createChecklistVersion(
                        checklist.id,
                        value
                    );

                setVersions((previous) => [
                    response.data,
                    ...previous,
                ]);

                setSuccess(
                    "Versión creada correctamente como borrador."
                );
            }

            setFormOpen(false);
            setEditing(null);
            setVersionName("");
            setReload((previous) => previous + 1);

            onChanged?.();
        } catch (e) {
            setFormError(errorText(e));
        } finally {
            setSaving(false);
        }
    }

    // Consulta de versiones.
    function openDetail(version: ChecklistVersion) {
        if (busy || modalOpen) return;

        setSelectedId(version.id);
    }

    function closeDetail() {
        if (statusSaving || saving) return;

        setSelectedId(null);
    }

    function openContent(version: ChecklistVersion) {
        if (busy || formOpen || statusTarget) return;

        setSelectedId(null);
        setContentVersion(version);
    }

    function closeContent() {
        setContentVersion(null);
        setReload((previous) => previous + 1);
    }

    // Abrir confirmación de publicación o archivado.
    function openStatus(
        version: ChecklistVersion,
        status: TargetStatus
    ) {
        if (
            busy ||
            error ||
            formOpen ||
            contentVersion ||
            statusTarget
        ) {
            return;
        }

        if (
            status === "published" &&
            (
                !checklist.status ||
                !isEditableVersion(version)
            )
        ) {
            return;
        }

        if (
            status === "archived" &&
            !canArchiveVersion(version)
        ) {
            return;
        }

        setSelectedId(null);
        setStatusIssues([]);
        setSuccess("");

        setStatusTarget({
            version,
            status,
        });
    }

    function closeStatus() {
        if (statusSaving) return;

        setStatusTarget(null);
        setStatusIssues([]);
    }

    // Ejecutar cambio de estado.
    async function confirmStatus() {
        if (
            !statusTarget ||
            statusSaving ||
            saving
        ) {
            return;
        }

        const { version, status } = statusTarget;

        if (
            status === "published" &&
            (
                !checklist.status ||
                !isEditableVersion(version)
            )
        ) {
            setStatusIssues([
                {
                    field: "status",
                    message:
                        "Solo se pueden publicar borradores nunca publicados de un checklist activo.",
                    suggestion:
                        STATUS_SUGGESTIONS.status,
                },
            ]);

            return;
        }

        if (
            status === "archived" &&
            !canArchiveVersion(version)
        ) {
            setStatusIssues([
                {
                    field: "status",
                    message:
                        "Esta versión no puede archivarse.",
                },
            ]);

            return;
        }

        setStatusSaving(true);
        setStatusIssues([]);
        setSuccess("");

        try {
            const response =
                await updateChecklistVersionStatus(
                    checklist.id,
                    version.id,
                    status
                );

            const updated = response.data;

            // Actualizar inmediatamente el estado local.
            // El GET posterior confirmará el resultado
            // oficial de toda la operación.
            setVersions((previous) =>
                previous.map((item) => {
                    if (item.id === updated.id) {
                        return updated;
                    }

                    if (
                        updated.status === "published" &&
                        item.status === "published"
                    ) {
                        return {
                            ...item,
                            status: "archived" as const,
                        };
                    }

                    return item;
                })
            );

            if (updated.status === "published") {
                setSuccess(
                    `La versión ${updated.version} se publicó correctamente. Cualquier versión publicada anterior fue archivada.`
                );
            } else {
                setSuccess(
                    `La versión ${updated.version} se archivó correctamente.`
                );
            }

            setStatusTarget(null);
            setStatusIssues([]);
            setReload((previous) => previous + 1);

            // Notificar al catálogo principal.
            onChanged?.();
        } catch (e) {
            setStatusIssues(getStatusIssues(e));
        } finally {
            setStatusSaving(false);
        }
    }

    const columns =
        "minmax(110px, 1fr) 120px 135px 135px 220px";

    return (
        <>
            {/* Modal principal de versiones */}
            <Dialog
                open
                onClose={requestClose}
                fullWidth
                maxWidth="lg"
                slotProps={{
                    paper: {
                        sx: { borderRadius: 3 },
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        borderBottom: "1px solid #DCE6EE",
                    }}
                >
                    <Typography
                        sx={{
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: 1,
                            color: GREEN,
                        }}
                    >
                        ADMINISTRACIÓN DE CHECKLISTS
                    </Typography>

                    <Typography
                        sx={{
                            fontSize: 22,
                            fontWeight: 700,
                            color: NAVY,
                        }}
                    >
                        Gestión de versiones
                    </Typography>

                    <Typography
                        sx={{
                            fontSize: 14,
                            color: "#526477",
                            mt: 0.5,
                        }}
                    >
                        {checklist.name}
                    </Typography>
                </DialogTitle>

                <DialogContent>
                    <Stack spacing={2.5} sx={{ pt: 2 }}>
                        {!checklist.status && (
                            <Alert severity="warning">
                                Este checklist está inactivo.
                                No será posible publicar nuevas
                                versiones hasta activarlo.
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
                            <Alert severity="error">
                                {error}
                            </Alert>
                        )}

                        {/* Resumen de versiones */}
                        <Box
                            sx={{
                                display: "grid",
                                gridTemplateColumns: {
                                    xs: "1fr",
                                    sm: "repeat(3, 1fr)",
                                },
                                gap: 1.5,
                            }}
                        >
                            <InfoField
                                label="Versión publicada"
                                value={
                                    loading || error
                                        ? "—"
                                        : published?.version ||
                                          "Sin publicar"
                                }
                            />

                            <InfoField
                                label="Borradores"
                                value={
                                    loading || error
                                        ? "—"
                                        : String(drafts)
                                }
                            />

                            <InfoField
                                label="Versiones archivadas"
                                value={
                                    loading || error
                                        ? "—"
                                        : String(archived)
                                }
                            />
                        </Box>

                        {/* Encabezado del historial */}
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                flexWrap: "wrap",
                                gap: 1,
                            }}
                        >
                            <Typography
                                sx={{
                                    color: NAVY,
                                    fontWeight: 700,
                                }}
                            >
                                Historial de versiones
                                {!loading && !error
                                    ? ` (${versions.length})`
                                    : ""}
                            </Typography>

                            <Stack
                                direction="row"
                                spacing={1}
                                sx={{
                                    flexWrap: "wrap",
                                }}
                            >
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<RefreshIcon />}
                                    disabled={busy || modalOpen}
                                    onClick={refreshVersions}
                                    sx={{
                                        color: GREEN,
                                        borderColor: GREEN,
                                        textTransform: "none",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    Actualizar
                                </Button>

                                <Button
                                    size="small"
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    disabled={
                                        busy ||
                                        modalOpen ||
                                        Boolean(error)
                                    }
                                    onClick={openCreate}
                                    sx={{
                                        bgcolor: NAVY,
                                        textTransform: "none",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    Nueva versión
                                </Button>
                            </Stack>
                        </Box>

                        {/* Listado de versiones */}
                        <Paper
                            variant="outlined"
                            sx={{
                                overflowX: "auto",
                                borderRadius: 2,
                                borderColor: "#DCE6EE",
                            }}
                        >
                            <Box
                                sx={{
                                    minWidth: 720,
                                    display: "grid",
                                    gridTemplateColumns: columns,
                                }}
                            >
                                {[
                                    "VERSIÓN",
                                    "ESTADO",
                                    "CREACIÓN",
                                    "PUBLICACIÓN",
                                    "ACCIONES",
                                ].map((header) => (
                                    <Box
                                        key={header}
                                        sx={{
                                            p: 1.5,
                                            bgcolor: "#F4F7FA",
                                            color: "#71808C",
                                            fontSize: 12,
                                            fontWeight: 700,
                                            whiteSpace: "nowrap",
                                            textAlign:
                                                header === "ACCIONES"
                                                    ? "center"
                                                    : "left",
                                        }}
                                    >
                                        {header}
                                    </Box>
                                ))}

                                {loading ? (
                                    <Box
                                        sx={{
                                            gridColumn: "1 / -1",
                                            p: 4,
                                            textAlign: "center",
                                        }}
                                    >
                                        <CircularProgress
                                            size={26}
                                            sx={{ color: GREEN }}
                                        />

                                        <Typography
                                            sx={{
                                                mt: 1,
                                                fontSize: 13,
                                                color: "#81909D",
                                            }}
                                        >
                                            Consultando versiones...
                                        </Typography>
                                    </Box>
                                ) : error ? (
                                    <Box
                                        sx={{
                                            gridColumn: "1 / -1",
                                            p: 3,
                                            textAlign: "center",
                                            color: "#81909D",
                                        }}
                                    >
                                        No fue posible consultar
                                        las versiones.
                                    </Box>
                                ) : versions.length === 0 ? (
                                    <Box
                                        sx={{
                                            gridColumn: "1 / -1",
                                            p: 4,
                                            textAlign: "center",
                                        }}
                                    >
                                        <LayersOutlinedIcon
                                            sx={{
                                                fontSize: 40,
                                                color: "#81909D",
                                                mb: 1,
                                            }}
                                        />

                                        <Typography
                                            sx={{
                                                fontWeight: 600,
                                                color: NAVY,
                                            }}
                                        >
                                            Sin versiones registradas
                                        </Typography>

                                        <Typography
                                            sx={{
                                                fontSize: 13,
                                                color: "#81909D",
                                                mt: 0.5,
                                            }}
                                        >
                                            Crea una versión para
                                            comenzar a construir
                                            el checklist.
                                        </Typography>
                                    </Box>
                                ) : (
                                    versions.map((version) => (
                                        <Box
                                            key={version.id}
                                            sx={{
                                                gridColumn: "1 / -1",
                                                display: "grid",
                                                gridTemplateColumns:
                                                    columns,
                                                alignItems: "center",
                                                borderTop:
                                                    "1px solid #DCE6EE",
                                            }}
                                        >
                                            {/* Número de versión */}
                                            <Box
                                                sx={{
                                                    p: 1.5,
                                                    color: NAVY,
                                                    fontWeight: 700,
                                                    fontSize: 14,
                                                    overflowWrap:
                                                        "anywhere",
                                                }}
                                            >
                                                {version.version}
                                            </Box>

                                            {/* Estado */}
                                            <Box sx={{ p: 1.5 }}>
                                                <VersionChip
                                                    status={
                                                        version.status
                                                    }
                                                />
                                            </Box>

                                            {/* Fecha de creación */}
                                            <Box
                                                sx={{
                                                    p: 1.5,
                                                    color: "#526477",
                                                    fontSize: 13,
                                                }}
                                            >
                                                {dateText(
                                                    version.created_at
                                                )}
                                            </Box>

                                            {/* Fecha de publicación */}
                                            <Box
                                                sx={{
                                                    p: 1.5,
                                                    color: "#526477",
                                                    fontSize: 13,
                                                }}
                                            >
                                                {dateText(
                                                    version.published_at
                                                )}
                                            </Box>

                                            {/* Acciones */}
                                            <Stack
                                                direction="row"
                                                spacing={0.5}
                                                sx={{
                                                    p: 1,
                                                    alignItems: "center",
                                                    justifyContent:
                                                        "center",
                                                }}
                                            >
                                                {/* Consultar */}
                                                <Tooltip title="Ver versión">
                                                    <span>
                                                        <IconButton
                                                            size="small"
                                                            disabled={
                                                                busy ||
                                                                modalOpen
                                                            }
                                                            onClick={() =>
                                                                openDetail(
                                                                    version
                                                                )
                                                            }
                                                            sx={{
                                                                color: NAVY,
                                                            }}
                                                        >
                                                            <VisibilityOutlinedIcon
                                                                fontSize="small"
                                                            />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>

                                                {/* Editar */}
                                                {isEditableVersion(
                                                    version
                                                ) && (
                                                    <Tooltip title="Editar versión">
                                                        <span>
                                                            <IconButton
                                                                size="small"
                                                                disabled={
                                                                    busy ||
                                                                    modalOpen
                                                                }
                                                                onClick={() =>
                                                                    openEdit(
                                                                        version
                                                                    )
                                                                }
                                                                sx={{
                                                                    color: GREEN,
                                                                }}
                                                            >
                                                                <EditOutlinedIcon
                                                                    fontSize="small"
                                                                />
                                                            </IconButton>
                                                        </span>
                                                    </Tooltip>
                                                )}

                                                {/* Contenido */}
                                                <Tooltip
                                                    title={
                                                        isEditableVersion(
                                                            version
                                                        )
                                                            ? "Editar contenido"
                                                            : "Consultar contenido"
                                                    }
                                                >
                                                    <span>
                                                        <IconButton
                                                            size="small"
                                                            disabled={
                                                                busy ||
                                                                modalOpen
                                                            }
                                                            onClick={() =>
                                                                openContent(
                                                                    version
                                                                )
                                                            }
                                                            sx={{
                                                                color: GREEN,
                                                            }}
                                                        >
                                                            <ListAltOutlinedIcon
                                                                fontSize="small"
                                                            />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>

                                                {/* Publicar */}
                                                {isEditableVersion(
                                                    version
                                                ) && (
                                                    <Tooltip
                                                        title={
                                                            checklist.status
                                                                ? "Publicar versión"
                                                                : "Activa el checklist para publicar"
                                                        }
                                                    >
                                                        <span>
                                                            <IconButton
                                                                size="small"
                                                                disabled={
                                                                    busy ||
                                                                    modalOpen ||
                                                                    !checklist.status
                                                                }
                                                                onClick={() =>
                                                                    openStatus(
                                                                        version,
                                                                        "published"
                                                                    )
                                                                }
                                                                sx={{
                                                                    color:
                                                                        "#16803C",
                                                                }}
                                                            >
                                                                <PublishIcon
                                                                    fontSize="small"
                                                                />
                                                            </IconButton>
                                                        </span>
                                                    </Tooltip>
                                                )}

                                                {/* Archivar */}
                                                {canArchiveVersion(
                                                    version
                                                ) && (
                                                    <Tooltip title="Archivar versión">
                                                        <span>
                                                            <IconButton
                                                                size="small"
                                                                disabled={
                                                                    busy ||
                                                                    modalOpen
                                                                }
                                                                onClick={() =>
                                                                    openStatus(
                                                                        version,
                                                                        "archived"
                                                                    )
                                                                }
                                                                sx={{
                                                                    color:
                                                                        "#B7791F",
                                                                }}
                                                            >
                                                                <ArchiveOutlinedIcon
                                                                    fontSize="small"
                                                                />
                                                            </IconButton>
                                                        </span>
                                                    </Tooltip>
                                                )}
                                            </Stack>
                                        </Box>
                                    ))
                                )}
                            </Box>
                        </Paper>

                        <Alert severity="info">
                            Las versiones nuevas se crean como
                            borradores. Al publicar una versión,
                            cualquier versión publicada anterior
                            se archivará automáticamente.
                            Las versiones publicadas y archivadas
                            no pueden editarse.
                        </Alert>
                    </Stack>
                </DialogContent>

                <DialogActions sx={{ p: 2 }}>
                    <Button
                        variant="contained"
                        onClick={requestClose}
                        disabled={
                            saving ||
                            statusSaving ||
                            modalOpen
                        }
                        sx={{
                            bgcolor: NAVY,
                            textTransform: "none",
                        }}
                    >
                        Cerrar versiones
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Formulario de creación y edición */}
            <Dialog
                open={formOpen}
                onClose={closeForm}
                fullWidth
                maxWidth="xs"
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
                    {editing
                        ? "Editar versión"
                        : "Crear nueva versión"}
                </DialogTitle>

                <DialogContent dividers>
                    <Stack spacing={2} sx={{ pt: 1 }}>
                        {formError && (
                            <Alert severity="error">
                                {formError}
                            </Alert>
                        )}

                        <TextField
                            label="Número de versión"
                            placeholder="Ej. 1.1"
                            value={versionName}
                            required
                            fullWidth
                            disabled={saving}
                            onChange={(event) =>
                                setVersionName(
                                    event.target.value
                                )
                            }
                            helperText={`${versionName.length}/20 caracteres`}
                            slotProps={{
                                htmlInput: {
                                    maxLength: 20,
                                },
                            }}
                        />

                        {!editing && (
                            <Alert severity="info">
                                La versión se creará como
                                un borrador vacío.
                                Sus secciones y preguntas
                                se agregarán posteriormente.
                            </Alert>
                        )}
                    </Stack>
                </DialogContent>

                <DialogActions sx={{ p: 2 }}>
                    <Button
                        onClick={closeForm}
                        disabled={saving}
                        sx={{
                            textTransform: "none",
                        }}
                    >
                        Cancelar
                    </Button>

                    <Button
                        variant="contained"
                        disabled={saving}
                        onClick={() => void saveVersion()}
                        sx={{
                            bgcolor: GREEN,
                            textTransform: "none",
                            "&:hover": {
                                bgcolor: "#0C8878",
                            },
                        }}
                    >
                        {saving
                            ? "Guardando..."
                            : editing
                                ? "Guardar cambios"
                                : "Crear versión"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Detalle de una versión */}
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
                    Detalle de versión
                </DialogTitle>

                <DialogContent dividers>
                    {detailLoading ? (
                        <Box
                            sx={{
                                py: 4,
                                textAlign: "center",
                            }}
                        >
                            <CircularProgress
                                sx={{ color: GREEN }}
                            />
                        </Box>
                    ) : detailError ? (
                        <Alert severity="error">
                            {detailError}
                        </Alert>
                    ) : detail ? (
                        <Stack spacing={2}>
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent:
                                        "space-between",
                                    gap: 1,
                                }}
                            >
                                <Typography
                                    sx={{
                                        color: NAVY,
                                        fontWeight: 700,
                                        fontSize: 22,
                                        overflowWrap:
                                            "anywhere",
                                    }}
                                >
                                    Versión {detail.version}
                                </Typography>

                                <VersionChip
                                    status={detail.status}
                                />
                            </Box>

                            <Typography
                                sx={{
                                    fontSize: 14,
                                    color: "#526477",
                                }}
                            >
                                {checklist.name}
                            </Typography>

                            <Divider />

                            <Box
                                sx={{
                                    display: "grid",
                                    gridTemplateColumns: {
                                        xs: "1fr",
                                        sm: "repeat(2, 1fr)",
                                    },
                                    gap: 1.5,
                                }}
                            >
                                <InfoField
                                    label="Fecha de creación"
                                    value={dateText(
                                        detail.created_at
                                    )}
                                />

                                <InfoField
                                    label="Última actualización"
                                    value={dateText(
                                        detail.updated_at
                                    )}
                                />

                                <InfoField
                                    label="Fecha de publicación"
                                    value={dateText(
                                        detail.published_at
                                    )}
                                />

                                <InfoField
                                    label="Estado"
                                    value={
                                        STATUS_LABELS[
                                            detail.status
                                        ]
                                    }
                                />
                            </Box>

                            <InfoField
                                label="Identificador de versión"
                                value={detail.id}
                            />

                            {isEditableVersion(detail) ? (
                                <Alert severity="info">
                                    Esta versión puede editarse
                                    mientras permanezca como
                                    borrador. Al publicarla o
                                    archivarla, su contenido
                                    dejará de ser editable.
                                </Alert>
                            ) : detail.status === "published" ? (
                                <Alert severity="success">
                                    Esta es la versión publicada
                                    del checklist. Su contenido
                                    es de solo lectura.
                                </Alert>
                            ) : (
                                <Alert severity="info">
                                    Esta versión es de solo
                                    lectura. Su estructura se
                                    conserva para mantener la
                                    trazabilidad histórica.
                                    Una versión archivada no
                                    puede reactivarse.
                                </Alert>
                            )}
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
                            {isEditableVersion(detail) && (
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={
                                        <EditOutlinedIcon />
                                    }
                                    disabled={busy}
                                    onClick={() =>
                                        openEdit(detail)
                                    }
                                    sx={{
                                        color: GREEN,
                                        borderColor: GREEN,
                                        textTransform: "none",
                                    }}
                                >
                                    Editar
                                </Button>
                            )}

                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={
                                    <ListAltOutlinedIcon />
                                }
                                disabled={busy}
                                onClick={() =>
                                    openContent(detail)
                                }
                                sx={{
                                    color: GREEN,
                                    borderColor: GREEN,
                                    textTransform: "none",
                                }}
                            >
                                Contenido
                            </Button>

                            {isEditableVersion(detail) && (
                                <Tooltip
                                    title={
                                        checklist.status
                                            ? "Publicar versión"
                                            : "El checklist está inactivo"
                                    }
                                >
                                    <span>
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            color="success"
                                            startIcon={
                                                <PublishIcon />
                                            }
                                            disabled={
                                                busy ||
                                                !checklist.status
                                            }
                                            onClick={() =>
                                                openStatus(
                                                    detail,
                                                    "published"
                                                )
                                            }
                                            sx={{
                                                textTransform:
                                                    "none",
                                            }}
                                        >
                                            Publicar
                                        </Button>
                                    </span>
                                </Tooltip>
                            )}

                            {canArchiveVersion(detail) && (
                                <Button
                                    size="small"
                                    variant="outlined"
                                    color="warning"
                                    startIcon={
                                        <ArchiveOutlinedIcon />
                                    }
                                    disabled={busy}
                                    onClick={() =>
                                        openStatus(
                                            detail,
                                            "archived"
                                        )
                                    }
                                    sx={{
                                        textTransform: "none",
                                    }}
                                >
                                    Archivar
                                </Button>
                            )}
                        </>
                    )}

                    <Button
                        variant="contained"
                        onClick={closeDetail}
                        sx={{
                            bgcolor: NAVY,
                            textTransform: "none",
                        }}
                    >
                        Volver
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Confirmación de publicación y archivado */}
            <Dialog
                open={Boolean(statusTarget)}
                onClose={closeStatus}
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
                    <Stack
                        direction="row"
                        spacing={1}
                        sx={{
                            alignItems: "center",
                        }}
                    >
                        {statusTarget?.status === "published" ? (
                            <PublishIcon
                                sx={{
                                    color: "#16803C",
                                }}
                            />
                        ) : (
                            <ArchiveOutlinedIcon
                                sx={{
                                    color: "#B7791F",
                                }}
                            />
                        )}

                        <Typography
                            sx={{
                                color: NAVY,
                                fontWeight: 700,
                                fontSize: 20,
                            }}
                        >
                            {statusTarget?.status === "published"
                                ? "Publicar versión"
                                : "Archivar versión"}
                        </Typography>
                    </Stack>
                </DialogTitle>

                <DialogContent dividers>
                    {statusTarget && (
                        <Stack spacing={2}>
                            <Typography
                                sx={{
                                    color: NAVY,
                                    fontSize: 14,
                                }}
                            >
                                {statusTarget.status === "published"
                                    ? "¿Deseas publicar la siguiente versión del checklist?"
                                    : "¿Deseas archivar la siguiente versión del checklist?"}
                            </Typography>

                            {/* Resumen de la versión */}
                            <Paper
                                variant="outlined"
                                sx={{
                                    p: 2,
                                    borderRadius: 2,
                                    borderColor: "#DCE6EE",
                                    bgcolor: "#F4F7FA",
                                }}
                            >
                                <Stack spacing={1.5}>
                                    <Typography
                                        sx={{
                                            fontSize: 12,
                                            color: "#81909D",
                                        }}
                                    >
                                        {checklist.name}
                                    </Typography>

                                    <Typography
                                        sx={{
                                            color: NAVY,
                                            fontSize: 18,
                                            fontWeight: 700,
                                            overflowWrap:
                                                "anywhere",
                                        }}
                                    >
                                        Versión{" "}
                                        {statusTarget.version.version}
                                    </Typography>

                                    <Divider />

                                    <Stack
                                        direction="row"
                                        spacing={1}
                                        sx={{
                                            alignItems: "center",
                                            justifyContent:
                                                "space-between",
                                            flexWrap: "wrap",
                                        }}
                                    >
                                        <Box>
                                            <Typography
                                                sx={{
                                                    fontSize: 12,
                                                    color: "#81909D",
                                                    mb: 0.5,
                                                }}
                                            >
                                                Estado actual
                                            </Typography>

                                            <VersionChip
                                                status={
                                                    statusTarget
                                                        .version
                                                        .status
                                                }
                                            />
                                        </Box>

                                        <Typography
                                            sx={{
                                                color: "#81909D",
                                                fontSize: 20,
                                            }}
                                        >
                                            →
                                        </Typography>

                                        <Box>
                                            <Typography
                                                sx={{
                                                    fontSize: 12,
                                                    color: "#81909D",
                                                    mb: 0.5,
                                                }}
                                            >
                                                Nuevo estado
                                            </Typography>

                                            <VersionChip
                                                status={
                                                    statusTarget.status
                                                }
                                            />
                                        </Box>
                                    </Stack>
                                </Stack>
                            </Paper>

                            {/* Advertencias de publicación */}
                            {statusTarget.status === "published" && (
                                <>
                                    {previousPublished ? (
                                        <Alert severity="warning">
                                            <AlertTitle>
                                                Sustitución de versión
                                            </AlertTitle>

                                            La versión{" "}
                                            <strong>
                                                {previousPublished.version}
                                            </strong>{" "}
                                            se encuentra publicada
                                            actualmente y será
                                            archivada automáticamente
                                            al publicar la nueva
                                            versión, si continúa
                                            publicada.
                                        </Alert>
                                    ) : (
                                        <Alert severity="info">
                                            Actualmente no existe
                                            una versión publicada
                                            en el listado.
                                            La nueva versión pasará
                                            a ser la publicada
                                            del checklist.
                                        </Alert>
                                    )}

                                    <Alert severity="warning">
                                        <AlertTitle>
                                            Operación irreversible
                                        </AlertTitle>

                                        Una vez publicada,
                                        no podrás modificar sus
                                        secciones, preguntas ni
                                        vinculaciones normativas.
                                        Tampoco podrá regresar
                                        al estado de borrador.
                                    </Alert>

                                    <Alert severity="info">
                                        <AlertTitle>
                                            Validaciones de publicación
                                        </AlertTitle>

                                        <Box
                                            component="ul"
                                            sx={{
                                                pl: 2.5,
                                                my: 0.5,
                                                fontSize: 13,
                                            }}
                                        >
                                            <li>
                                                El checklist debe
                                                estar activo.
                                            </li>

                                            <li>
                                                Debe existir al
                                                menos una sección.
                                            </li>

                                            <li>
                                                Cada sección debe
                                                tener preguntas
                                                activas.
                                            </li>

                                            <li>
                                                Las preguntas deben
                                                tener una configuración
                                                válida.
                                            </li>

                                            <li>
                                                Las vinculaciones
                                                deben pertenecer
                                                a normas activas
                                                de la organización.
                                            </li>
                                        </Box>
                                    </Alert>
                                </>
                            )}

                            {/* Advertencias de archivado */}
                            {statusTarget.status === "archived" && (
                                <>
                                    {statusTarget.version.status ===
                                    "published" ? (
                                        <Alert severity="warning">
                                            <AlertTitle>
                                                Versión publicada
                                            </AlertTitle>

                                            Al archivar esta versión,
                                            dejará de estar disponible
                                            como versión publicada
                                            para nuevas inspecciones.
                                            Si no se ha publicado otra,
                                            el checklist quedará sin
                                            versión publicada.
                                        </Alert>
                                    ) : (
                                        <Alert severity="warning">
                                            <AlertTitle>
                                                Archivado de borrador
                                            </AlertTitle>

                                            Este borrador dejará
                                            de ser editable y no
                                            podrá publicarse
                                            posteriormente.
                                        </Alert>
                                    )}

                                    <Alert severity="info">
                                        El contenido de la versión
                                        permanecerá disponible
                                        para consulta. No se
                                        eliminarán sus secciones,
                                        preguntas ni vinculaciones.
                                    </Alert>

                                    <Alert severity="warning">
                                        <AlertTitle>
                                            Operación irreversible
                                        </AlertTitle>

                                        Las versiones archivadas
                                        no pueden reactivarse
                                        ni cambiar de estado.
                                    </Alert>
                                </>
                            )}

                            {/* Errores devueltos por la API */}
                            {statusIssues.length > 0 && (
                                <Alert severity="error">
                                    <AlertTitle>
                                        {statusTarget.status ===
                                        "published"
                                            ? "No fue posible publicar la versión"
                                            : "No fue posible archivar la versión"}
                                    </AlertTitle>

                                    <Stack spacing={1.5}>
                                        {statusIssues.map(
                                            (issue, index) => (
                                                <Box
                                                    key={`${issue.field}-${index}`}
                                                >
                                                    <Typography
                                                        sx={{
                                                            fontSize: 13,
                                                            fontWeight: 600,
                                                            overflowWrap:
                                                                "anywhere",
                                                        }}
                                                    >
                                                        {issue.message}
                                                    </Typography>

                                                    {issue.suggestion && (
                                                        <Typography
                                                            sx={{
                                                                fontSize: 13,
                                                                mt: 0.5,
                                                            }}
                                                        >
                                                            {
                                                                issue.suggestion
                                                            }
                                                        </Typography>
                                                    )}
                                                </Box>
                                            )
                                        )}
                                    </Stack>
                                </Alert>
                            )}
                        </Stack>
                    )}
                </DialogContent>

                <DialogActions sx={{ p: 2 }}>
                    <Button
                        onClick={closeStatus}
                        disabled={statusSaving}
                        sx={{
                            textTransform: "none",
                        }}
                    >
                        Cancelar
                    </Button>

                    <Button
                        variant="contained"
                        color={
                            statusTarget?.status === "published"
                                ? "success"
                                : "warning"
                        }
                        disabled={
                            statusSaving ||
                            !statusTarget ||
                            (
                                statusTarget.status ===
                                    "published" &&
                                !checklist.status
                            )
                        }
                        startIcon={
                            statusSaving ? (
                                <CircularProgress
                                    size={16}
                                    color="inherit"
                                />
                            ) : statusTarget?.status ===
                              "published" ? (
                                <PublishIcon />
                            ) : (
                                <ArchiveOutlinedIcon />
                            )
                        }
                        onClick={() => void confirmStatus()}
                        sx={{
                            textTransform: "none",
                        }}
                    >
                        {statusSaving
                            ? statusTarget?.status === "published"
                                ? "Publicando..."
                                : "Archivando..."
                            : statusTarget?.status === "published"
                                ? "Publicar versión"
                                : "Archivar versión"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Editor de secciones y preguntas */}
            {contentVersion && (
                <ChecklistVersionEditor
                    key={contentVersion.id}
                    checklist={checklist}
                    version={contentVersion}
                    onClose={closeContent}
                    onChanged={() => {
                        onChanged?.();
                    }}
                />
            )}
        </>
    );
}
