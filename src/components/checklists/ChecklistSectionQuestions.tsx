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
    Paper,
    Stack,
    Typography,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import UndoIcon from "@mui/icons-material/Undo";
import QuizOutlinedIcon from "@mui/icons-material/QuizOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

import {
    DndContext,
    closestCenter,
    PointerSensor,
    KeyboardSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";

import type { DragEndEvent } from "@dnd-kit/core";

import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    arrayMove,
} from "@dnd-kit/sortable";

import SortableQuestion from "./SortableQuestion";
import QuestionForm from "./QuestionForm";
import QuestionNormRequirements from "./QuestionNormRequirements";

import {
    getAllChecklistQuestions,
    createChecklistQuestion,
    updateChecklistQuestion,
    updateChecklistQuestionStatus,
    reorderChecklistQuestions,
} from "../../services/checklists.service";

import { QUESTION_TYPE_LABELS } from "../../types/checklists";

import type {
    Checklist,
    ChecklistVersion,
    ChecklistSection,
    ChecklistQuestion,
    ChecklistQuestionPayload,
} from "../../types/checklists";

const NAVY = "#16324F";
const GREEN = "#0F9D8A";

const STATUS_LABELS = {
    draft: "Borrador",
    published: "Publicada",
    archived: "Archivada",
};

const STATUS_COLORS = {
    draft: "#B7791F",
    published: "#16803C",
    archived: "#64748B",
};

interface Props {
    checklist: Checklist;
    version: ChecklistVersion;
    section: ChecklistSection;
    onClose: () => void;
    onChanged?: () => void;
}

function errorText(error: unknown): string {
    return error instanceof Error
        ? error.message
        : "No fue posible completar la solicitud.";
}

export default function ChecklistSectionQuestions({
    checklist,
    version,
    section,
    onClose,
    onChanged,
}: Props) {
    const [questions, setQuestions] =
        useState<ChecklistQuestion[]>([]);

    const [savedQuestions, setSavedQuestions] =
        useState<ChecklistQuestion[]>([]);

    const [loading, setLoading] = useState(true);
    const [reload, setReload] = useState(0);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [savingOrder, setSavingOrder] = useState(false);
    const [orderError, setOrderError] = useState("");
    const [confirmClose, setConfirmClose] = useState(false);

    const [formOpen, setFormOpen] = useState(false);
    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);

    const [editing, setEditing] =
        useState<ChecklistQuestion | null>(null);

    const [viewing, setViewing] =
        useState<ChecklistQuestion | null>(null);

    const [normQuestion, setNormQuestion] =
        useState<ChecklistQuestion | null>(null);

    const [statusTarget, setStatusTarget] =
        useState<ChecklistQuestion | null>(null);

    const [statusSaving, setStatusSaving] = useState(false);
    const [statusError, setStatusError] = useState("");

    const editable =
        version.status === "draft" &&
        version.published_at === null;

    const orderChanged =
        questions.length !== savedQuestions.length ||
        questions.some(
            (question, index) =>
                question.id !== savedQuestions[index]?.id
        );

    const busy =
        loading ||
        saving ||
        savingOrder ||
        statusSaving;

    const modalOpen =
        formOpen ||
        Boolean(viewing) ||
        Boolean(statusTarget) ||
        Boolean(normQuestion) ||
        confirmClose;

    const activeCount = questions.filter(
        (question) => question.status
    ).length;

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 6,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        let active = true;

        setLoading(true);
        setError("");
        setOrderError("");

        getAllChecklistQuestions(section.id)
            .then((result) => {
                if (active) {
                    setQuestions(result);
                    setSavedQuestions([...result]);
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
    }, [section.id, reload]);

    useEffect(() => {
        if (!orderChanged || !editable) return;

        function handleBeforeUnload(event: BeforeUnloadEvent) {
            event.preventDefault();
            event.returnValue = "";
        }

        window.addEventListener(
            "beforeunload",
            handleBeforeUnload
        );

        return () => {
            window.removeEventListener(
                "beforeunload",
                handleBeforeUnload
            );
        };
    }, [orderChanged, editable]);

    function moveQuestion(from: number, to: number) {
        if (!editable || busy || modalOpen) return;

        if (
            from === to ||
            from < 0 ||
            to < 0 ||
            from >= questions.length ||
            to >= questions.length
        ) {
            return;
        }

        setQuestions((previous) =>
            arrayMove(previous, from, to)
        );

        setOrderError("");
        setSuccess("");
    }

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;

        if (!over || active.id === over.id) return;

        const from = questions.findIndex(
            (question) => question.id === active.id
        );

        const to = questions.findIndex(
            (question) => question.id === over.id
        );

        moveQuestion(from, to);
    }

    async function saveOrder() {
        if (
            !editable ||
            !orderChanged ||
            busy ||
            modalOpen
        ) {
            return;
        }

        setSavingOrder(true);
        setOrderError("");
        setSuccess("");

        try {
            const response = await reorderChecklistQuestions(
                section.id,
                questions.map((question) => question.id)
            );

            const ordered = [...response.data].sort(
                (a, b) => a.display_order - b.display_order
            );

            setQuestions(ordered);
            setSavedQuestions([...ordered]);

            setSuccess(
                "Orden de las preguntas guardado correctamente."
            );

            onChanged?.();
        } catch (e) {
            setOrderError(errorText(e));
        } finally {
            setSavingOrder(false);
        }
    }

    function discardOrder() {
        if (busy) return;

        setQuestions([...savedQuestions]);
        setOrderError("");
        setSuccess("");
    }

    function requestClose() {
        if (
            saving ||
            savingOrder ||
            statusSaving ||
            modalOpen
        ) {
            return;
        }

        if (orderChanged) {
            setConfirmClose(true);
            return;
        }

        onClose();
    }

    function openCreate() {
        if (
            !editable ||
            busy ||
            orderChanged ||
            modalOpen ||
            error
        ) {
            return;
        }

        setEditing(null);
        setFormError("");
        setSuccess("");
        setFormOpen(true);
    }

    function openEdit(question: ChecklistQuestion) {
        if (
            !editable ||
            busy ||
            orderChanged ||
            modalOpen
        ) {
            return;
        }

        setEditing(question);
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

    async function saveQuestion(
        payload: ChecklistQuestionPayload
    ) {
        if (!editable || busy || orderChanged) return;

        setSaving(true);
        setFormError("");
        setSuccess("");

        try {
            if (editing) {
                await updateChecklistQuestion(
                    editing.id,
                    payload
                );

                setSuccess(
                    "Pregunta actualizada correctamente."
                );
            } else {
                await createChecklistQuestion(
                    section.id,
                    payload
                );

                setSuccess(
                    "Pregunta creada correctamente."
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

    function openStatus(question: ChecklistQuestion) {
        if (
            !editable ||
            busy ||
            orderChanged ||
            modalOpen
        ) {
            return;
        }

        setStatusTarget(question);
        setStatusError("");
    }

    async function confirmStatus() {
        if (
            !editable ||
            !statusTarget ||
            busy ||
            orderChanged
        ) {
            return;
        }

        setStatusSaving(true);
        setStatusError("");
        setSuccess("");

        try {
            const response =
                await updateChecklistQuestionStatus(
                    statusTarget.id,
                    !statusTarget.status
                );

            const updated = response.data;

            setQuestions((previous) =>
                previous.map((question) =>
                    question.id === updated.id
                        ? updated
                        : question
                )
            );

            setSavedQuestions((previous) =>
                previous.map((question) =>
                    question.id === updated.id
                        ? updated
                        : question
                )
            );

            setSuccess(
                updated.status
                    ? "Pregunta activada correctamente."
                    : "Pregunta desactivada correctamente."
            );

            setStatusTarget(null);

            onChanged?.();
        } catch (e) {
            setStatusError(errorText(e));
        } finally {
            setStatusSaving(false);
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
                            color: GREEN,
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: 1,
                            mb: 0.5,
                        }}
                    >
                        ADMINISTRACIÓN DE CHECKLISTS
                    </Typography>

                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: 1,
                        }}
                    >
                        <Typography
                            sx={{
                                color: NAVY,
                                fontSize: 22,
                                fontWeight: 700,
                            }}
                        >
                            {editable
                                ? "Editor de preguntas"
                                : "Consultar preguntas"}
                        </Typography>

                        <Chip
                            size="small"
                            label={STATUS_LABELS[version.status]}
                            sx={{
                                bgcolor: STATUS_COLORS[version.status],
                                color: "#FFFFFF",
                                fontWeight: 600,
                            }}
                        />
                    </Box>

                    <Typography
                        sx={{
                            color: "#526477",
                            fontSize: 14,
                            mt: 0.5,
                        }}
                    >
                        {checklist.name} · Versión {version.version}
                    </Typography>
                </DialogTitle>

                <DialogContent>
                    <Stack spacing={2.5} sx={{ pt: 2 }}>
                        <Paper
                            variant="outlined"
                            sx={{
                                p: 2,
                                borderRadius: 3,
                                bgcolor: "#F8FAFC",
                                borderColor: "#DCE6EE",
                            }}
                        >
                            <Typography
                                sx={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: GREEN,
                                    letterSpacing: 0.5,
                                }}
                            >
                                SECCIÓN {section.display_order}
                            </Typography>

                            <Typography
                                sx={{
                                    color: NAVY,
                                    fontWeight: 700,
                                    fontSize: 17,
                                    mt: 0.5,
                                }}
                            >
                                {section.name}
                            </Typography>

                            <Typography
                                sx={{
                                    color: "#526477",
                                    fontSize: 13,
                                    mt: 0.5,
                                }}
                            >
                                {section.description || "Sin descripción."}
                            </Typography>
                        </Paper>

                        {!editable && (
                            <Alert
                                severity="info"
                                icon={<LockOutlinedIcon />}
                            >
                                Esta versión es de solo lectura.
                                Las preguntas no pueden modificarse.
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

                        {orderError && (
                            <Alert
                                severity="error"
                                onClose={() => setOrderError("")}
                            >
                                {orderError}
                            </Alert>
                        )}

                        <Box
                            sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                flexWrap: "wrap",
                                gap: 1.5,
                            }}
                        >
                            <Box>
                                <Typography
                                    sx={{
                                        color: NAVY,
                                        fontWeight: 700,
                                        fontSize: 17,
                                    }}
                                >
                                    Preguntas
                                    {!loading && !error
                                        ? ` (${questions.length})`
                                        : ""}
                                </Typography>

                                {!loading && !error && (
                                    <Typography
                                        sx={{
                                            color: "#81909D",
                                            fontSize: 12,
                                        }}
                                    >
                                        {activeCount} activas ·{" "}
                                        {questions.length - activeCount} inactivas
                                    </Typography>
                                )}
                            </Box>

                            <Stack direction="row" spacing={1}>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<RefreshIcon />}
                                    disabled={
                                        busy ||
                                        orderChanged ||
                                        modalOpen
                                    }
                                    onClick={() =>
                                        setReload(
                                            (previous) => previous + 1
                                        )
                                    }
                                    sx={{
                                        color: GREEN,
                                        borderColor: GREEN,
                                        textTransform: "none",
                                    }}
                                >
                                    Actualizar
                                </Button>

                                {editable && (
                                    <Button
                                        variant="contained"
                                        size="small"
                                        startIcon={<AddIcon />}
                                        disabled={
                                            busy ||
                                            orderChanged ||
                                            modalOpen ||
                                            Boolean(error)
                                        }
                                        onClick={openCreate}
                                        sx={{
                                            bgcolor: NAVY,
                                            textTransform: "none",
                                        }}
                                    >
                                        Nueva pregunta
                                    </Button>
                                )}
                            </Stack>
                        </Box>

                        {editable && orderChanged && (
                            <Alert severity="warning">
                                Hay cambios de orden pendientes.
                                Guarda o descarta los cambios antes
                                de modificar otras preguntas.
                            </Alert>
                        )}

                        {!loading &&
                            !error &&
                            questions.length > 0 &&
                            activeCount === 0 &&
                            editable && (
                                <Alert severity="warning">
                                    Esta sección no tiene preguntas activas.
                                    No será posible publicar la versión
                                    hasta activar al menos una.
                                </Alert>
                            )}

                        {loading ? (
                            <Box
                                sx={{
                                    py: 5,
                                    textAlign: "center",
                                }}
                            >
                                <CircularProgress
                                    size={28}
                                    sx={{ color: GREEN }}
                                />

                                <Typography
                                    sx={{
                                        color: "#81909D",
                                        fontSize: 13,
                                        mt: 1.5,
                                    }}
                                >
                                    Consultando preguntas...
                                </Typography>
                            </Box>
                        ) : error ? (
                            <Typography
                                sx={{
                                    py: 3,
                                    textAlign: "center",
                                    color: "#81909D",
                                }}
                            >
                                No fue posible cargar las preguntas.
                            </Typography>
                        ) : questions.length === 0 ? (
                            <Paper
                                variant="outlined"
                                sx={{
                                    py: 5,
                                    px: 2,
                                    textAlign: "center",
                                    borderRadius: 3,
                                    borderStyle: "dashed",
                                    borderColor: "#DCE6EE",
                                }}
                            >
                                <QuizOutlinedIcon
                                    sx={{
                                        fontSize: 42,
                                        color: "#81909D",
                                        mb: 1,
                                    }}
                                />

                                <Typography
                                    sx={{
                                        color: NAVY,
                                        fontWeight: 700,
                                    }}
                                >
                                    Sin preguntas registradas
                                </Typography>

                                <Typography
                                    sx={{
                                        color: "#81909D",
                                        fontSize: 13,
                                        mt: 0.5,
                                    }}
                                >
                                    {editable
                                        ? "Agrega preguntas para construir esta sección."
                                        : "Esta sección no contiene preguntas."}
                                </Typography>

                                {editable && (
                                    <Button
                                        variant="outlined"
                                        startIcon={<AddIcon />}
                                        onClick={openCreate}
                                        sx={{
                                            mt: 2,
                                            color: GREEN,
                                            borderColor: GREEN,
                                            textTransform: "none",
                                        }}
                                    >
                                        Crear primera pregunta
                                    </Button>
                                )}
                            </Paper>
                        ) : (
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={questions.map(
                                        (question) => question.id
                                    )}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <Stack spacing={1.5}>
                                        {questions.map(
                                            (question, index) => (
                                                <SortableQuestion
                                                    key={question.id}
                                                    question={question}
                                                    index={index}
                                                    total={questions.length}
                                                    editable={editable}
                                                    disabled={
                                                        busy || modalOpen
                                                    }
                                                    orderChanged={orderChanged}
                                                    onEdit={openEdit}
                                                    onView={setViewing}
                                                    onStatus={openStatus}
                                                    onNormRequirements={setNormQuestion}
                                                    onMove={moveQuestion}
                                                />
                                            )
                                        )}
                                    </Stack>
                                </SortableContext>
                            </DndContext>
                        )}

                        {editable && questions.length > 1 && (
                            <Alert severity="info">
                                Arrastra las preguntas o utiliza las flechas
                                para cambiar su posición. Las preguntas
                                inactivas también forman parte del orden.
                            </Alert>
                        )}
                    </Stack>
                </DialogContent>

                <DialogActions
                    sx={{
                        p: 2,
                        flexWrap: "wrap",
                        gap: 1,
                        borderTop: "1px solid #DCE6EE",
                    }}
                >
                    {editable && orderChanged && (
                        <>
                            <Button
                                variant="outlined"
                                startIcon={<UndoIcon />}
                                disabled={busy || modalOpen}
                                onClick={discardOrder}
                                sx={{
                                    color: NAVY,
                                    borderColor: NAVY,
                                    textTransform: "none",
                                }}
                            >
                                Descartar cambios
                            </Button>

                            <Button
                                variant="contained"
                                startIcon={
                                    savingOrder ? (
                                        <CircularProgress
                                            size={16}
                                            color="inherit"
                                        />
                                    ) : (
                                        <SaveOutlinedIcon />
                                    )
                                }
                                disabled={busy || modalOpen}
                                onClick={() => void saveOrder()}
                                sx={{
                                    bgcolor: GREEN,
                                    textTransform: "none",
                                    "&:hover": {
                                        bgcolor: "#0C8878",
                                    },
                                }}
                            >
                                {savingOrder
                                    ? "Guardando..."
                                    : "Guardar orden"}
                            </Button>
                        </>
                    )}

                    <Button
                        variant="contained"
                        disabled={
                            saving ||
                            savingOrder ||
                            statusSaving ||
                            modalOpen
                        }
                        onClick={requestClose}
                        sx={{
                            bgcolor: NAVY,
                            textTransform: "none",
                        }}
                    >
                        Volver a secciones
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Formulario de creación y edición */}
            {formOpen && (
                <QuestionForm
                    key={editing?.id ?? "new-question"}
                    question={editing}
                    questions={questions}
                    saving={saving}
                    error={formError}
                    onClose={closeForm}
                    onSave={saveQuestion}
                />
            )}

            {/* Detalle de la pregunta */}
            <Dialog
                open={Boolean(viewing)}
                onClose={() => setViewing(null)}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle
                    sx={{ color: NAVY, fontWeight: 700 }}
                >
                    Detalle de la pregunta
                </DialogTitle>

                <DialogContent dividers>
                    {viewing && (
                        <Stack spacing={2}>
                            <Box>
                                <Typography
                                    sx={{
                                        color: "#81909D",
                                        fontSize: 12,
                                    }}
                                >
                                    Pregunta
                                </Typography>

                                <Typography
                                    sx={{
                                        color: NAVY,
                                        fontWeight: 700,
                                        whiteSpace: "pre-wrap",
                                        overflowWrap: "anywhere",
                                    }}
                                >
                                    {viewing.question_text}
                                </Typography>
                            </Box>

                            <Box>
                                <Typography
                                    sx={{
                                        color: "#81909D",
                                        fontSize: 12,
                                    }}
                                >
                                    Descripción
                                </Typography>

                                <Typography
                                    sx={{
                                        fontSize: 14,
                                        whiteSpace: "pre-wrap",
                                        overflowWrap: "anywhere",
                                    }}
                                >
                                    {viewing.description || "Sin descripción."}
                                </Typography>
                            </Box>

                            <Divider />

                            {[
                                {
                                    label: "Tipo de respuesta",
                                    value: QUESTION_TYPE_LABELS[
                                        viewing.answer_type
                                    ],
                                },
                                {
                                    label: "Posición guardada",
                                    value: String(viewing.display_order),
                                },
                                {
                                    label: "Estado",
                                    value: viewing.status
                                        ? "Activa"
                                        : "Inactiva",
                                },
                                {
                                    label: "Obligatoria",
                                    value: viewing.required ? "Sí" : "No",
                                },
                                {
                                    label: "Permite evidencias",
                                    value: viewing.allows_evidence
                                        ? "Sí"
                                        : "No",
                                },
                            ].map((field) => (
                                <Box
                                    key={field.label}
                                    sx={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        gap: 2,
                                    }}
                                >
                                    <Typography
                                        sx={{
                                            color: "#526477",
                                            fontSize: 13,
                                        }}
                                    >
                                        {field.label}
                                    </Typography>

                                    <Typography
                                        sx={{
                                            color: NAVY,
                                            fontSize: 13,
                                            fontWeight: 600,
                                        }}
                                    >
                                        {field.value}
                                    </Typography>
                                </Box>
                            ))}

                            {viewing.answer_type === "multiple_choice" && (
                                <>
                                    <Divider />

                                    <Typography
                                        sx={{
                                            color: NAVY,
                                            fontWeight: 700,
                                            fontSize: 14,
                                        }}
                                    >
                                        Opciones de respuesta
                                    </Typography>

                                    {(viewing.options ?? []).map(
                                        (option, index) => (
                                            <Paper
                                                key={index}
                                                variant="outlined"
                                                sx={{
                                                    p: 1.5,
                                                    borderRadius: 2,
                                                }}
                                            >
                                                <Typography
                                                    sx={{
                                                        fontSize: 14,
                                                        fontWeight: 600,
                                                        overflowWrap: "anywhere",
                                                    }}
                                                >
                                                    {option.label}
                                                </Typography>

                                                <Typography
                                                    sx={{
                                                        fontSize: 12,
                                                        color: "#81909D",
                                                        overflowWrap: "anywhere",
                                                    }}
                                                >
                                                    Valor: {option.value}
                                                </Typography>
                                            </Paper>
                                        )
                                    )}
                                </>
                            )}
                        </Stack>
                    )}
                </DialogContent>

                <DialogActions sx={{ p: 2 }}>
                    <Button
                        onClick={() => setViewing(null)}
                        sx={{ textTransform: "none" }}
                    >
                        Cerrar
                    </Button>

                    {editable && viewing && !orderChanged && (
                        <Button
                            variant="contained"
                            onClick={() => {
                                setEditing(viewing);
                                setViewing(null);
                                setFormError("");
                                setSuccess("");
                                setFormOpen(true);
                            }}
                            sx={{
                                bgcolor: GREEN,
                                textTransform: "none",
                            }}
                        >
                            Editar pregunta
                        </Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* Confirmación de cambio de estado */}
            <Dialog
                open={Boolean(statusTarget)}
                onClose={() => {
                    if (!statusSaving) {
                        setStatusTarget(null);
                    }
                }}
                fullWidth
                maxWidth="xs"
            >
                <DialogTitle
                    sx={{ color: NAVY, fontWeight: 700 }}
                >
                    {statusTarget?.status
                        ? "Desactivar pregunta"
                        : "Activar pregunta"}
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
                            la siguiente pregunta?
                        </Typography>

                        <Typography
                            sx={{
                                color: NAVY,
                                fontWeight: 600,
                                fontSize: 14,
                                overflowWrap: "anywhere",
                            }}
                        >
                            {statusTarget?.question_text}
                        </Typography>

                        {statusTarget?.status && (
                            <Alert severity="info">
                                La pregunta conservará su contenido y
                                posición, pero dejará de estar activa.
                            </Alert>
                        )}

                        {statusTarget?.status &&
                            activeCount === 1 && (
                                <Alert severity="warning">
                                    Esta es la última pregunta activa
                                    de la sección. Si la desactivas,
                                    no podrás publicar la versión
                                    hasta activar otra pregunta.
                                </Alert>
                            )}
                    </Stack>
                </DialogContent>

                <DialogActions sx={{ p: 2 }}>
                    <Button
                        disabled={statusSaving}
                        onClick={() => setStatusTarget(null)}
                        sx={{ textTransform: "none" }}
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
                        onClick={() => void confirmStatus()}
                        sx={{ textTransform: "none" }}
                    >
                        {statusSaving
                            ? "Guardando..."
                            : statusTarget?.status
                                ? "Desactivar"
                                : "Activar"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Confirmación de salida sin guardar */}
            <Dialog
                open={confirmClose}
                onClose={() => setConfirmClose(false)}
                fullWidth
                maxWidth="xs"
            >
                <DialogTitle
                    sx={{ color: NAVY, fontWeight: 700 }}
                >
                    Cambios sin guardar
                </DialogTitle>

                <DialogContent>
                    <Typography sx={{ fontSize: 14 }}>
                        Has modificado el orden de las preguntas.
                        Si sales del editor sin guardar, se conservará
                        el último orden registrado.
                    </Typography>
                </DialogContent>

                <DialogActions sx={{ p: 2 }}>
                    <Button
                        onClick={() => setConfirmClose(false)}
                        sx={{ textTransform: "none" }}
                    >
                        Seguir editando
                    </Button>

                    <Button
                        variant="contained"
                        color="error"
                        onClick={() => {
                            setConfirmClose(false);
                            discardOrder();
                            onClose();
                        }}
                        sx={{ textTransform: "none" }}
                    >
                        Salir sin guardar
                    </Button>
                </DialogActions>
            </Dialog>
            {/* Vinculaciones normativas de la pregunta */}
            {normQuestion && (
                <QuestionNormRequirements
                    key={normQuestion.id}
                    question={normQuestion}
                    version={version}
                    onClose={() => setNormQuestion(null)}
                    onChanged={onChanged}
                />
            )}
        </>
    );
}
