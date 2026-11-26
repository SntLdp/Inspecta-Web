
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
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    TextField,
    Typography,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import LinkIcon from "@mui/icons-material/Link";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

import LinkedNormRequirementCard from "./LinkedNormRequirementCard";

import {
    getAllNorms,
    getAllNormRequirements,
} from "../../services/norms.service";

import {
    getAllQuestionNormRequirements,
    linkQuestionNormRequirement,
    unlinkQuestionNormRequirement,
    type QuestionNormRequirement,
} from "../../services/questionNormRequirements.service";

import type {
    ChecklistQuestion,
    ChecklistVersion,
} from "../../types/checklists";

import type {
    Norm,
    NormRequirement,
} from "../../types/norms";

const NAVY = "#16324F";
const GREEN = "#0F9D8A";

interface Props {
    question: ChecklistQuestion;
    version: ChecklistVersion;
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

export default function QuestionNormRequirements({
    question,
    version,
    onClose,
    onChanged,
}: Props) {
    // Vinculaciones existentes.
    const [links, setLinks] =
        useState<QuestionNormRequirement[]>([]);

    const [linksLoading, setLinksLoading] =
        useState(true);

    const [linksError, setLinksError] =
        useState("");

    const [linksReload, setLinksReload] =
        useState(0);

    // Catálogo de normas.
    const [norms, setNorms] =
        useState<Norm[]>([]);

    const [normsLoading, setNormsLoading] =
        useState(false);

    const [normsError, setNormsError] =
        useState("");

    const [normsReload, setNormsReload] =
        useState(0);

    const [selectedNormId, setSelectedNormId] =
        useState("");

    // Requisitos disponibles.
    const [requirements, setRequirements] =
        useState<NormRequirement[]>([]);

    const [requirementsLoading, setRequirementsLoading] =
        useState(false);

    const [requirementsError, setRequirementsError] =
        useState("");

    const [requirementsReload, setRequirementsReload] =
        useState(0);

    const [search, setSearch] =
        useState("");

    // Operaciones de escritura.
    const [saving, setSaving] =
        useState(false);

    const [savingId, setSavingId] =
        useState<string | null>(null);

    const [operationError, setOperationError] =
        useState("");

    const [success, setSuccess] =
        useState("");

    const [unlinkTarget, setUnlinkTarget] =
        useState<QuestionNormRequirement | null>(null);

    const [unlinkError, setUnlinkError] =
        useState("");

    const editable =
        version.status === "draft" &&
        version.published_at === null;

    const busy = saving || linksLoading;

    // Cargar vinculaciones existentes.
    useEffect(() => {
        let active = true;

        setLinksLoading(true);
        setLinksError("");

        getAllQuestionNormRequirements(question.id)
            .then((result) => {
                if (active) {
                    setLinks(result);
                }
            })
            .catch((error) => {
                if (active) {
                    setLinksError(errorText(error));
                }
            })
            .finally(() => {
                if (active) {
                    setLinksLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, [question.id, linksReload]);

    // Cargar catálogo únicamente para borradores.
    useEffect(() => {
        if (!editable) return;

        let active = true;

        setNormsLoading(true);
        setNormsError("");

        getAllNorms()
            .then((result) => {
                if (active) {
                    setNorms(result);
                }
            })
            .catch((error) => {
                if (active) {
                    setNormsError(errorText(error));
                }
            })
            .finally(() => {
                if (active) {
                    setNormsLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, [editable, normsReload]);

    // Únicamente las normas activas pueden utilizarse
    // para crear nuevas vinculaciones.
    const activeNorms = useMemo(() => {
        return norms
            .filter((norm) => norm.status)
            .sort((a, b) =>
                a.code.localeCompare(b.code, "es", {
                    numeric: true,
                })
            );
    }, [norms]);

    const selectedNorm = activeNorms.find(
        (norm) => norm.id === selectedNormId
    );

    // Invalidar la selección si la norma deja
    // de estar disponible.
    useEffect(() => {
        if (
            selectedNormId &&
            !normsLoading &&
            !normsError &&
            !selectedNorm
        ) {
            setSelectedNormId("");
            setRequirements([]);
            setSearch("");
        }
    }, [
        selectedNormId,
        selectedNorm,
        normsLoading,
        normsError,
    ]);

    // Cargar requisitos de la norma seleccionada.
    useEffect(() => {
        setRequirements([]);
        setRequirementsError("");

        if (!editable || !selectedNormId) {
            setRequirementsLoading(false);
            return;
        }

        let active = true;

        setRequirementsLoading(true);

        getAllNormRequirements(selectedNormId)
            .then((result) => {
                if (active) {
                    setRequirements(result);
                }
            })
            .catch((error) => {
                if (active) {
                    setRequirementsError(errorText(error));
                }
            })
            .finally(() => {
                if (active) {
                    setRequirementsLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, [
        editable,
        selectedNormId,
        requirementsReload,
    ]);

    // Identificadores de requisitos vinculados.
    const linkedIds = useMemo(() => {
        return new Set(
            links.map((link) => link.id)
        );
    }, [links]);

    // Ordenar vinculaciones por norma, versión
    // y código del requisito.
    const sortedLinks = useMemo(() => {
        return [...links].sort((a, b) => {
            const options = {
                numeric: true,
                sensitivity: "base" as const,
            };

            return (
                a.norm_code.localeCompare(
                    b.norm_code,
                    "es",
                    options
                ) ||
                (a.norm_version ?? "").localeCompare(
                    b.norm_version ?? "",
                    "es",
                    options
                ) ||
                a.norm_id.localeCompare(b.norm_id) ||
                a.code.localeCompare(
                    b.code,
                    "es",
                    options
                ) ||
                a.id.localeCompare(b.id)
            );
        });
    }, [links]);

    // Filtrar requisitos disponibles.
    const filteredRequirements = useMemo(() => {
        const text = normalizeText(search);

        return requirements
            .filter((requirement) => {
                const searchable = normalizeText(
                    [
                        requirement.code,
                        requirement.section ?? "",
                        requirement.description,
                    ].join(" ")
                );

                return !text || searchable.includes(text);
            })
            .sort((a, b) =>
                a.code.localeCompare(b.code, "es", {
                    numeric: true,
                })
            );
    }, [requirements, search]);

    function requestClose() {
        if (saving || unlinkTarget) return;

        onClose();
    }

    function refreshLinks() {
        if (saving) return;

        setLinksReload((previous) => previous + 1);
    }

    function changeNorm(normId: string) {
        if (saving || !editable) return;

        setRequirements([]);
        setRequirementsLoading(Boolean(normId));
        setRequirementsError("");
        setSelectedNormId(normId);
        setSearch("");
        setOperationError("");
    }

    // Crear vinculación normativa.
    async function linkRequirement(
        requirement: NormRequirement
    ) {
        if (
            !editable ||
            busy ||
            unlinkTarget ||
            linksError ||
            normsLoading ||
            normsError ||
            requirementsLoading ||
            requirementsError ||
            !selectedNorm ||
            !requirements.some(
                (item) => item.id === requirement.id
            ) ||
            linkedIds.has(requirement.id)
        ) {
            return;
        }

        setSaving(true);
        setSavingId(requirement.id);
        setOperationError("");
        setSuccess("");

        try {
            const response =
                await linkQuestionNormRequirement(
                    question.id,
                    requirement.id
                );

            // Incorporar también la información de
            // la norma padre en la vinculación local.
            const newLink: QuestionNormRequirement = {
                link_id: response.data.link_id,
                id: requirement.id,
                code: requirement.code,
                section: requirement.section,
                description: requirement.description,

                norm_id: selectedNorm.id,
                norm_code: selectedNorm.code,
                norm_name: selectedNorm.name,
                norm_version: selectedNorm.version ?? null,
                norm_status: selectedNorm.status,
            };

            setLinks((previous) => [
                ...previous.filter(
                    (link) => link.id !== requirement.id
                ),
                newLink,
            ]);

            setSuccess(
                `Requisito ${requirement.code} vinculado correctamente.`
            );

            // Consultar nuevamente la información
            // oficial almacenada en el backend.
            setLinksReload(
                (previous) => previous + 1
            );

            onChanged?.();
        } catch (error) {
            setOperationError(errorText(error));
        } finally {
            setSaving(false);
            setSavingId(null);
        }
    }

    function openUnlink(
        link: QuestionNormRequirement
    ) {
        if (!editable || busy || linksError) return;

        setUnlinkTarget(link);
        setUnlinkError("");
        setOperationError("");
    }

    function closeUnlink() {
        if (saving) return;

        setUnlinkTarget(null);
        setUnlinkError("");
    }

    // Eliminar únicamente la vinculación.
    async function confirmUnlink() {
        if (
            !editable ||
            saving ||
            !unlinkTarget
        ) {
            return;
        }

        setSaving(true);
        setUnlinkError("");
        setSuccess("");

        try {
            await unlinkQuestionNormRequirement(
                question.id,
                unlinkTarget.link_id
            );

            setLinks((previous) =>
                previous.filter(
                    (link) =>
                        link.link_id !== unlinkTarget.link_id
                )
            );

            setSuccess(
                `Requisito ${unlinkTarget.code} desvinculado correctamente.`
            );

            setUnlinkTarget(null);

            setLinksReload(
                (previous) => previous + 1
            );

            onChanged?.();
        } catch (error) {
            setUnlinkError(errorText(error));
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <Dialog
                open
                onClose={requestClose}
                fullWidth
                maxWidth="md"
                slotProps={{
                    paper: {
                        sx: {
                            borderRadius: 3,
                        },
                    },
                }}
            >
                <DialogTitle>
                    <Stack spacing={0.5}>
                        <Typography
                            sx={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: GREEN,
                            }}
                        >
                            ADMINISTRACIÓN DE CHECKLISTS
                        </Typography>

                        <Typography
                            sx={{
                                color: NAVY,
                                fontSize: 22,
                                fontWeight: 700,
                            }}
                        >
                            Vinculaciones normativas
                        </Typography>

                        <Typography
                            sx={{
                                color: "text.secondary",
                                fontSize: 13,
                            }}
                        >
                            Consulta y vinculación de requisitos
                            normativos con preguntas.
                        </Typography>
                    </Stack>
                </DialogTitle>

                <DialogContent dividers>
                    <Stack spacing={3}>
                        {/* Información de la pregunta */}
                        <Paper
                            variant="outlined"
                            sx={{
                                p: 2,
                                borderRadius: 2,
                                bgcolor: "#F4F7FA",
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
                                        fontSize: 12,
                                        color: "text.secondary",
                                        fontWeight: 600,
                                    }}
                                >
                                    PREGUNTA
                                </Typography>

                                <Chip
                                    size="small"
                                    label={`Versión ${version.version}`}
                                    variant="outlined"
                                />
                            </Stack>

                            <Typography
                                sx={{
                                    mt: 1,
                                    fontSize: 16,
                                    fontWeight: 600,
                                    color: NAVY,
                                    overflowWrap: "anywhere",
                                }}
                            >
                                {question.question_text}
                            </Typography>

                            {question.description && (
                                <Typography
                                    sx={{
                                        mt: 1,
                                        fontSize: 13,
                                        color: "text.secondary",
                                        whiteSpace: "pre-wrap",
                                        overflowWrap: "anywhere",
                                    }}
                                >
                                    {question.description}
                                </Typography>
                            )}

                            <Stack
                                direction="row"
                                spacing={1}
                                sx={{
                                    mt: 1.5,
                                    flexWrap: "wrap",
                                }}
                            >
                                <Chip
                                    size="small"
                                    label={
                                        question.status
                                            ? "Pregunta activa"
                                            : "Pregunta inactiva"
                                    }
                                    color={
                                        question.status
                                            ? "success"
                                            : "default"
                                    }
                                />

                                <Chip
                                    size="small"
                                    label={
                                        editable
                                            ? "Borrador"
                                            : version.status === "published"
                                                ? "Publicada"
                                                : version.status === "archived"
                                                    ? "Archivada"
                                                    : "Solo lectura"
                                    }
                                    variant="outlined"
                                />
                            </Stack>
                        </Paper>

                        {/* Restricciones de versiones */}
                        {!editable && (
                            <Alert
                                severity="info"
                                icon={<LockOutlinedIcon />}
                            >
                                Esta versión se encuentra en modo de
                                solo lectura. Puedes consultar las
                                vinculaciones existentes, pero no
                                agregar ni eliminar requisitos.
                            </Alert>
                        )}

                        {/* Mensajes de operaciones */}
                        {success && (
                            <Alert
                                severity="success"
                                onClose={() => setSuccess("")}
                            >
                                {success}
                            </Alert>
                        )}

                        {operationError && (
                            <Alert
                                severity="error"
                                onClose={() => setOperationError("")}
                            >
                                {operationError}
                            </Alert>
                        )}

                        {/* Vinculaciones existentes */}
                        <Stack spacing={2}>
                            <Stack
                                direction="row"
                                spacing={1}
                                sx={{
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                }}
                            >
                                <Stack
                                    direction="row"
                                    spacing={1}
                                    sx={{ alignItems: "center" }}
                                >
                                    <LinkIcon
                                        sx={{ color: GREEN }}
                                    />

                                    <Typography
                                        sx={{
                                            color: NAVY,
                                            fontSize: 16,
                                            fontWeight: 700,
                                        }}
                                    >
                                        Requisitos vinculados
                                    </Typography>

                                    <Chip
                                        size="small"
                                        label={
                                            linksLoading || linksError
                                                ? "—"
                                                : links.length
                                        }
                                    />
                                </Stack>

                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<RefreshIcon />}
                                    disabled={busy}
                                    onClick={refreshLinks}
                                    sx={{
                                        color: GREEN,
                                        borderColor: GREEN,
                                        textTransform: "none",
                                        whiteSpace: "nowrap",
                                        flexShrink: 0,
                                    }}
                                >
                                    Actualizar
                                </Button>
                            </Stack>

                            {linksLoading ? (
                                <Stack
                                    spacing={1}
                                    sx={{
                                        alignItems: "center",
                                        py: 3,
                                    }}
                                >
                                    <CircularProgress
                                        size={26}
                                        sx={{ color: GREEN }}
                                    />

                                    <Typography
                                        sx={{
                                            fontSize: 13,
                                            color: "text.secondary",
                                        }}
                                    >
                                        Consultando vinculaciones...
                                    </Typography>
                                </Stack>
                            ) : linksError ? (
                                <Alert severity="error">
                                    {linksError}
                                </Alert>
                            ) : links.length === 0 ? (
                                <Paper
                                    variant="outlined"
                                    sx={{
                                        p: 3,
                                        borderRadius: 2,
                                        textAlign: "center",
                                    }}
                                >
                                    <LinkOffIcon
                                        sx={{
                                            fontSize: 34,
                                            color: "text.secondary",
                                        }}
                                    />

                                    <Typography
                                        sx={{
                                            color: NAVY,
                                            fontWeight: 600,
                                            fontSize: 14,
                                            mt: 1,
                                        }}
                                    >
                                        Sin requisitos vinculados
                                    </Typography>

                                    <Typography
                                        sx={{
                                            color: "text.secondary",
                                            fontSize: 13,
                                            mt: 0.5,
                                        }}
                                    >
                                        {editable
                                            ? "Selecciona una norma activa para vincular sus requisitos."
                                            : "Esta pregunta no tiene vinculaciones normativas."}
                                    </Typography>
                                </Paper>
                            ) : (
                                sortedLinks.map((link) => (
                                    <LinkedNormRequirementCard
                                        key={link.link_id}
                                        link={link}
                                        editable={editable}
                                        disabled={busy}
                                        onUnlink={openUnlink}
                                    />
                                ))
                            )}
                        </Stack>

                        {/* Catálogo para nuevas vinculaciones */}
                        {editable && (
                            <>
                                <Divider />

                                <Stack spacing={2}>
                                    <Stack
                                        direction="row"
                                        spacing={1}
                                        sx={{
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                        }}
                                    >
                                        <Typography
                                            sx={{
                                                fontSize: 16,
                                                color: NAVY,
                                                fontWeight: 700,
                                            }}
                                        >
                                            Vincular nuevo requisito
                                        </Typography>

                                        <Button
                                            size="small"
                                            variant="outlined"
                                            startIcon={<RefreshIcon />}
                                            disabled={
                                                saving || normsLoading
                                            }
                                            onClick={() => {
                                                setNormsReload(
                                                    (previous) =>
                                                        previous + 1
                                                );

                                                setRequirementsReload(
                                                    (previous) =>
                                                        previous + 1
                                                );
                                            }}
                                            sx={{
                                                color: GREEN,
                                                borderColor: GREEN,
                                                textTransform: "none",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            Actualizar catálogo
                                        </Button>
                                    </Stack>

                                    <Typography
                                        sx={{
                                            color: "text.secondary",
                                            fontSize: 13,
                                        }}
                                    >
                                        Selecciona una norma activa y los
                                        requisitos relacionados con esta
                                        pregunta.
                                    </Typography>

                                    {normsError && (
                                        <Alert severity="error">
                                            {normsError}
                                        </Alert>
                                    )}

                                    {normsLoading ? (
                                        <Stack
                                            direction="row"
                                            spacing={1.5}
                                            sx={{ alignItems: "center" }}
                                        >
                                            <CircularProgress
                                                size={20}
                                                sx={{ color: GREEN }}
                                            />

                                            <Typography
                                                sx={{
                                                    fontSize: 13,
                                                    color: "text.secondary",
                                                }}
                                            >
                                                Consultando catálogo normativo...
                                            </Typography>
                                        </Stack>
                                    ) : !normsError &&
                                        activeNorms.length === 0 ? (
                                        <Alert severity="info">
                                            No existen normas activas
                                            disponibles para vincular.
                                            Administra el catálogo desde
                                            el módulo de Normativa.
                                        </Alert>
                                    ) : null}

                                    {/* Selector de norma activa */}
                                    <FormControl
                                        fullWidth
                                        size="small"
                                        disabled={
                                            saving ||
                                            normsLoading ||
                                            Boolean(normsError) ||
                                            activeNorms.length === 0
                                        }
                                    >
                                        <InputLabel>
                                            Norma activa
                                        </InputLabel>

                                        <Select
                                            value={
                                                selectedNorm
                                                    ? selectedNormId
                                                    : ""
                                            }
                                            label="Norma activa"
                                            onChange={(event) =>
                                                changeNorm(
                                                    event.target.value
                                                )
                                            }
                                        >
                                            <MenuItem value="">
                                                Selecciona una norma
                                            </MenuItem>

                                            {activeNorms.map((norm) => (
                                                <MenuItem
                                                    key={norm.id}
                                                    value={norm.id}
                                                    sx={{
                                                        whiteSpace: "normal",
                                                    }}
                                                >
                                                    {norm.code}

                                                    {norm.version
                                                        ? ` (${norm.version})`
                                                        : ""}

                                                    {" — "}

                                                    {norm.name}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>

                                    {selectedNorm && (
                                        <>
                                            {/* Información de la norma */}
                                            <Paper
                                                variant="outlined"
                                                sx={{
                                                    p: 1.5,
                                                    borderRadius: 2,
                                                    bgcolor: "#F4F7FA",
                                                }}
                                            >
                                                <Typography
                                                    sx={{
                                                        fontWeight: 600,
                                                        fontSize: 14,
                                                        color: NAVY,
                                                    }}
                                                >
                                                    {selectedNorm.code}
                                                    {" — "}
                                                    {selectedNorm.name}
                                                </Typography>

                                                <Typography
                                                    sx={{
                                                        fontSize: 12,
                                                        color: "text.secondary",
                                                        mt: 0.5,
                                                    }}
                                                >
                                                    Organismo emisor:{" "}
                                                    {selectedNorm.issuing_body ||
                                                        "No especificado"}

                                                    {" · Versión: "}

                                                    {selectedNorm.version ||
                                                        "No especificada"}
                                                </Typography>
                                            </Paper>

                                            {/* Buscador de requisitos */}
                                            <TextField
                                                fullWidth
                                                size="small"
                                                placeholder="Buscar por código, sección o descripción..."
                                                value={search}
                                                onChange={(event) =>
                                                    setSearch(
                                                        event.target.value
                                                    )
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

                                            {requirementsLoading ? (
                                                <Stack
                                                    spacing={1}
                                                    sx={{
                                                        alignItems: "center",
                                                        py: 3,
                                                    }}
                                                >
                                                    <CircularProgress
                                                        size={26}
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
                                            ) : requirementsError ? (
                                                <Alert severity="error">
                                                    {requirementsError}
                                                </Alert>
                                            ) : filteredRequirements.length === 0 ? (
                                                <Alert severity="info">
                                                    {requirements.length === 0
                                                        ? "La norma seleccionada no tiene requisitos registrados."
                                                        : "No se encontraron requisitos que coincidan con la búsqueda."}
                                                </Alert>
                                            ) : (
                                                <Stack spacing={1.5}>
                                                    <Typography
                                                        sx={{
                                                            fontSize: 12,
                                                            color: "text.secondary",
                                                        }}
                                                    >
                                                        Mostrando{" "}
                                                        {filteredRequirements.length}
                                                        {" de "}
                                                        {requirements.length}
                                                        {" requisitos"}
                                                    </Typography>

                                                    {/* Requisitos disponibles */}
                                                    <Stack
                                                        spacing={1.5}
                                                        sx={{
                                                            maxHeight: 360,
                                                            overflowY: "auto",
                                                            pr: 0.5,
                                                        }}
                                                    >
                                                        {filteredRequirements.map(
                                                            (requirement) => {
                                                                const alreadyLinked =
                                                                    linkedIds.has(
                                                                        requirement.id
                                                                    );

                                                                return (
                                                                    <Paper
                                                                        key={requirement.id}
                                                                        variant="outlined"
                                                                        sx={{
                                                                            p: 2,
                                                                            borderRadius: 2,
                                                                            bgcolor: alreadyLinked
                                                                                ? "#F4FAF7"
                                                                                : "background.paper",
                                                                        }}
                                                                    >
                                                                        <Stack spacing={1}>
                                                                            <Stack
                                                                                direction="row"
                                                                                spacing={1}
                                                                                sx={{
                                                                                    justifyContent: "space-between",
                                                                                    alignItems: "center",
                                                                                }}
                                                                            >
                                                                                <Box
                                                                                    sx={{
                                                                                        minWidth: 0,
                                                                                    }}
                                                                                >
                                                                                    <Typography
                                                                                        sx={{
                                                                                            color: NAVY,
                                                                                            fontWeight: 700,
                                                                                            fontSize: 14,
                                                                                            overflowWrap: "anywhere",
                                                                                        }}
                                                                                    >
                                                                                        Requisito{" "}
                                                                                        {requirement.code}
                                                                                    </Typography>

                                                                                    {requirement.section && (
                                                                                        <Typography
                                                                                            sx={{
                                                                                                fontSize: 12,
                                                                                                color: "text.secondary",
                                                                                            }}
                                                                                        >
                                                                                            {requirement.section}
                                                                                        </Typography>
                                                                                    )}
                                                                                </Box>

                                                                                {alreadyLinked ? (
                                                                                    <Chip
                                                                                        size="small"
                                                                                        label="Ya vinculado"
                                                                                        color="success"
                                                                                        variant="outlined"
                                                                                    />
                                                                                ) : (
                                                                                    <Button
                                                                                        size="small"
                                                                                        variant="contained"
                                                                                        startIcon={
                                                                                            savingId === requirement.id
                                                                                                ? (
                                                                                                    <CircularProgress
                                                                                                        size={14}
                                                                                                        color="inherit"
                                                                                                    />
                                                                                                )
                                                                                                : <AddIcon />
                                                                                        }
                                                                                        disabled={
                                                                                            busy ||
                                                                                            normsLoading ||
                                                                                            Boolean(normsError) ||
                                                                                            Boolean(linksError) ||
                                                                                            Boolean(unlinkTarget)
                                                                                        }
                                                                                        onClick={() =>
                                                                                            void linkRequirement(
                                                                                                requirement
                                                                                            )
                                                                                        }
                                                                                        sx={{
                                                                                            bgcolor: GREEN,
                                                                                            textTransform: "none",
                                                                                            whiteSpace: "nowrap",
                                                                                            flexShrink: 0,
                                                                                            "&:hover": {
                                                                                                bgcolor: "#0B8070",
                                                                                            },
                                                                                        }}
                                                                                    >
                                                                                        {savingId === requirement.id
                                                                                            ? "Vinculando..."
                                                                                            : "Vincular"}
                                                                                    </Button>
                                                                                )}
                                                                            </Stack>

                                                                            <Typography
                                                                                sx={{
                                                                                    color: NAVY,
                                                                                    fontSize: 13,
                                                                                    whiteSpace: "pre-wrap",
                                                                                    overflowWrap: "anywhere",
                                                                                }}
                                                                            >
                                                                                {requirement.description}
                                                                            </Typography>
                                                                        </Stack>
                                                                    </Paper>
                                                                );
                                                            }
                                                        )}
                                                    </Stack>
                                                </Stack>
                                            )}
                                        </>
                                    )}
                                </Stack>
                            </>
                        )}
                    </Stack>
                </DialogContent>

                <DialogActions sx={{ p: 2 }}>
                    <Button
                        variant="contained"
                        disabled={
                            saving ||
                            Boolean(unlinkTarget)
                        }
                        onClick={requestClose}
                        sx={{
                            bgcolor: NAVY,
                            textTransform: "none",
                        }}
                    >
                        Volver a preguntas
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Confirmación de desvinculación */}
            <Dialog
                open={Boolean(unlinkTarget)}
                onClose={closeUnlink}
                fullWidth
                maxWidth="xs"
                slotProps={{
                    paper: {
                        sx: {
                            borderRadius: 3,
                        },
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        color: NAVY,
                        fontWeight: 700,
                    }}
                >
                    Desvincular requisito
                </DialogTitle>

                <DialogContent>
                    <Stack spacing={2}>
                        {unlinkError && (
                            <Alert severity="error">
                                {unlinkError}
                            </Alert>
                        )}

                        <Typography sx={{ fontSize: 14 }}>
                            ¿Deseas eliminar la vinculación entre
                            esta pregunta y el siguiente requisito?
                        </Typography>

                        {/* Mostrar el requisito junto con
                            la identificación de su norma. */}
                        {unlinkTarget && (
                            <LinkedNormRequirementCard
                                link={unlinkTarget}
                                editable={false}
                                disabled={true}
                                onUnlink={openUnlink}
                            />
                        )}

                        <Alert severity="info">
                            Esta acción únicamente elimina la
                            vinculación con la pregunta.
                            El requisito y su norma permanecerán
                            registrados en el catálogo normativo.
                        </Alert>
                    </Stack>
                </DialogContent>

                <DialogActions sx={{ p: 2 }}>
                    <Button
                        disabled={saving}
                        onClick={closeUnlink}
                        sx={{
                            textTransform: "none",
                        }}
                    >
                        Cancelar
                    </Button>

                    <Button
                        variant="contained"
                        color="error"
                        disabled={saving}
                        onClick={() => void confirmUnlink()}
                        sx={{
                            textTransform: "none",
                        }}
                    >
                        {saving
                            ? "Desvinculando..."
                            : "Desvincular"}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
