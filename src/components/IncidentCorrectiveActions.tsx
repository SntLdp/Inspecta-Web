
import { useEffect, useState } from "react";
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
    Stack,
    Typography,
} from "@mui/material";

import VisibilityIcon from "@mui/icons-material/Visibility";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import RefreshIcon from "@mui/icons-material/Refresh";

import {
    getCorrectiveActionsByIncident,
    getCorrectiveAction,
    type CorrectiveAction,
    type CorrectiveActionDetail,
    type CorrectiveActionStatus,
    type CorrectiveActionPriority,
} from "../services/correctiveActions.service";

const NAVY = "#16324F";
const GREEN = "#0F9D8A";

const STATUS: Record<CorrectiveActionStatus, string> = {
    pending: "Pendiente",
    in_progress: "En proceso",
    completed: "Completada",
    verified: "Verificada",
};

const PRIORITY: Record<CorrectiveActionPriority, string> = {
    low: "Baja",
    medium: "Media",
    high: "Alta",
    critical: "Crítica",
};

function statusColor(
    status: CorrectiveActionStatus
): "warning" | "info" | "success" {
    if (status === "pending") return "warning";
    if (status === "in_progress") return "info";
    return "success";
}

function priorityColor(
    priority: CorrectiveActionPriority
): "info" | "warning" | "error" {
    if (priority === "low") return "info";
    if (priority === "medium") return "warning";
    return "error";
}

function dateText(value?: string | null): string {
    if (!value) return "Sin fecha";

    const date = new Date(
        value.length === 10 ? `${value}T12:00:00` : value
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

function InfoField({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: "#F5F8FB" }}>
            <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                {label}
            </Typography>

            <Typography
                sx={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: NAVY,
                    overflowWrap: "anywhere",
                }}
            >
                {value}
            </Typography>
        </Box>
    );
}

interface Props {
    incidentId: string;
}

export default function IncidentCorrectiveActions({
    incidentId,
}: Props) {
    const [actions, setActions] = useState<CorrectiveAction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [reload, setReload] = useState(0);

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [detail, setDetail] = useState<CorrectiveActionDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState("");

    useEffect(() => {
        let active = true;

        setActions([]);
        setLoading(true);
        setError("");

        getCorrectiveActionsByIncident(incidentId)
            .then((result) => {
                if (active) setActions(result);
            })
            .catch((e) => {
                if (active) {
                    setError(
                        `No se pudieron consultar las acciones correctivas: ${errorText(e)}`
                    );
                }
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [incidentId, reload]);

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

        getCorrectiveAction(selectedId)
            .then((response) => {
                if (active) setDetail(response.data);
            })
            .catch((e) => {
                if (active) setDetailError(errorText(e));
            })
            .finally(() => {
                if (active) setDetailLoading(false);
            });

        return () => {
            active = false;
        };
    }, [selectedId]);

    const verified = actions.filter(
        (action) => action.status === "verified"
    ).length;

    return (
        <Box>
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 1,
                    mb: 1.5,
                }}
            >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <AssignmentTurnedInIcon sx={{ color: GREEN }} />

                    <Typography sx={{ color: NAVY, fontWeight: 700 }}>
                        Acciones correctivas asociadas
                        {!loading && !error ? ` (${actions.length})` : ""}
                    </Typography>
                </Box>

                <Button
                    size="small"
                    startIcon={<RefreshIcon />}
                    disabled={loading}
                    onClick={() => setReload((previous) => previous + 1)}
                    sx={{ color: GREEN, textTransform: "none" }}
                >
                    Actualizar
                </Button>
            </Box>

            {loading ? (
                <Box sx={{ textAlign: "center", py: 3 }}>
                    <CircularProgress size={26} sx={{ color: GREEN }} />

                    <Typography
                        sx={{ mt: 1, fontSize: 13, color: "text.secondary" }}
                    >
                        Consultando acciones correctivas...
                    </Typography>
                </Box>
            ) : error ? (
                <Alert severity="warning">{error}</Alert>
            ) : actions.length === 0 ? (
                <Alert severity="info">
                    Esta incidencia todavía no tiene acciones correctivas
                    accesibles asociadas.
                </Alert>
            ) : (
                <Stack spacing={1.5}>
                    <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
                        {verified} de {actions.length} acciones verificadas.
                    </Typography>

                    {actions.map((action) => (
                        <Box
                            key={action.id}
                            sx={{
                                border: "1px solid #E1E8EF",
                                borderRadius: 2,
                                p: 2,
                            }}
                        >
                            <Box
                                sx={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "flex-start",
                                    flexWrap: "wrap",
                                    gap: 1,
                                    mb: 1,
                                }}
                            >
                                <Typography
                                    sx={{
                                        color: NAVY,
                                        fontWeight: 600,
                                        fontSize: 14,
                                        flex: 1,
                                        whiteSpace: "pre-wrap",
                                        overflowWrap: "anywhere",
                                    }}
                                >
                                    {action.description}
                                </Typography>

                                <Chip
                                    size="small"
                                    label={STATUS[action.status]}
                                    color={statusColor(action.status)}
                                />
                            </Box>

                            <Typography
                                sx={{ fontSize: 13, color: "#526477", mb: 0.5 }}
                            >
                                Responsable:{" "}
                                {action.assignee_name || "Nombre no disponible"}
                            </Typography>

                            <Typography
                                sx={{ fontSize: 13, color: "#526477" }}
                            >
                                Fecha límite: {dateText(action.due_date)}
                            </Typography>

                            <Box
                                sx={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    flexWrap: "wrap",
                                    gap: 1,
                                    mt: 1.5,
                                }}
                            >
                                <Chip
                                    size="small"
                                    variant="outlined"
                                    label={`Prioridad: ${PRIORITY[action.priority]}`}
                                    color={priorityColor(action.priority)}
                                />

                                <Button
                                    size="small"
                                    startIcon={<VisibilityIcon />}
                                    onClick={() => setSelectedId(action.id)}
                                    sx={{
                                        color: GREEN,
                                        textTransform: "none",
                                        fontWeight: 600,
                                    }}
                                >
                                    Ver detalle
                                </Button>
                            </Box>
                        </Box>
                    ))}
                </Stack>
            )}

            <Dialog
                open={Boolean(selectedId)}
                onClose={() => setSelectedId(null)}
                fullWidth
                maxWidth="sm"
                slotProps={{
                    paper: {
                        sx: { borderRadius: 3 },
                    },
                }}
            >
                <DialogTitle sx={{ borderBottom: "1px solid #E1E8EF" }}>
                    <Typography
                        sx={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: GREEN,
                            letterSpacing: 1,
                        }}
                    >
                        ACCIÓN CORRECTIVA ASOCIADA
                    </Typography>

                    <Typography
                        sx={{
                            color: NAVY,
                            fontWeight: 700,
                            fontSize: 16,
                            overflowWrap: "anywhere",
                        }}
                    >
                        {selectedId}
                    </Typography>

                    {detail && (
                        <Chip
                            size="small"
                            label={STATUS[detail.status]}
                            color={statusColor(detail.status)}
                            sx={{ mt: 1 }}
                        />
                    )}
                </DialogTitle>

                <DialogContent dividers>
                    {detailLoading ? (
                        <Box sx={{ textAlign: "center", py: 4 }}>
                            <CircularProgress sx={{ color: GREEN }} />
                        </Box>
                    ) : detailError ? (
                        <Alert severity="error">{detailError}</Alert>
                    ) : detail ? (
                        <Stack spacing={2}>
                            <Typography sx={{ fontWeight: 700, color: NAVY }}>
                                Información general
                            </Typography>

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
                                    label="Responsable"
                                    value={
                                        detail.assignee_name ||
                                        "Nombre no disponible"
                                    }
                                />

                                <InfoField
                                    label="Prioridad"
                                    value={PRIORITY[detail.priority]}
                                />

                                <InfoField
                                    label="Estado"
                                    value={STATUS[detail.status]}
                                />

                                <InfoField
                                    label="Fecha límite"
                                    value={dateText(detail.due_date)}
                                />

                                <InfoField
                                    label="Fecha de registro"
                                    value={dateText(detail.created_at)}
                                />

                                <InfoField
                                    label="Fecha de finalización"
                                    value={dateText(detail.completed_at)}
                                />
                            </Box>

                            <Divider />

                            <Typography sx={{ fontWeight: 700, color: NAVY }}>
                                Descripción
                            </Typography>

                            <Typography sx={{ whiteSpace: "pre-wrap" }}>
                                {detail.description}
                            </Typography>

                            <Typography sx={{ fontWeight: 700, color: NAVY }}>
                                Observaciones
                            </Typography>

                            <Typography sx={{ whiteSpace: "pre-wrap" }}>
                                {detail.observations ||
                                    "Sin observaciones registradas."}
                            </Typography>

                            <Divider />

                            <Typography sx={{ fontWeight: 700, color: NAVY }}>
                                Historial de seguimiento (
                                {detail.updates?.length ?? 0})
                            </Typography>

                            {!detail.updates?.length ? (
                                <Typography
                                    sx={{
                                        color: "text.secondary",
                                        fontSize: 13,
                                    }}
                                >
                                    Todavía no hay avances registrados.
                                </Typography>
                            ) : (
                                detail.updates.map((update) => (
                                    <Box
                                        key={update.id}
                                        sx={{
                                            border: "1px solid #E1E8EF",
                                            borderRadius: 2,
                                            p: 1.5,
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                flexWrap: "wrap",
                                                gap: 1,
                                            }}
                                        >
                                            <Chip
                                                size="small"
                                                label={STATUS[update.status]}
                                                color={statusColor(update.status)}
                                            />

                                            <Typography
                                                sx={{
                                                    fontSize: 12,
                                                    color: "text.secondary",
                                                }}
                                            >
                                                {dateText(update.created_at)}
                                            </Typography>
                                        </Box>

                                        <Typography
                                            sx={{
                                                mt: 1,
                                                fontSize: 13,
                                                whiteSpace: "pre-wrap",
                                            }}
                                        >
                                            {update.comment || "Sin comentario."}
                                        </Typography>

                                        <Typography
                                            sx={{
                                                mt: 1,
                                                fontSize: 12,
                                                color: "text.secondary",
                                            }}
                                        >
                                            Registrado por:{" "}
                                            {update.user_name ||
                                                "Nombre no disponible"}
                                        </Typography>
                                    </Box>
                                ))
                            )}

                            <Alert severity="info">
                                Para registrar avances o cambiar el estado,
                                utiliza el módulo de Acciones correctivas.
                            </Alert>
                        </Stack>
                    ) : null}
                </DialogContent>

                <DialogActions sx={{ p: 2 }}>
                    <Button
                        variant="contained"
                        onClick={() => setSelectedId(null)}
                        sx={{
                            bgcolor: NAVY,
                            textTransform: "none",
                        }}
                    >
                        Volver a la incidencia
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
