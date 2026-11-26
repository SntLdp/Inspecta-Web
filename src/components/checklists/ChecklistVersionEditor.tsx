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
    Paper,
    Stack,
    TextField,
    Typography,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import UndoIcon from "@mui/icons-material/Undo";
import ChecklistSectionQuestions from "./ChecklistSectionQuestions";

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

import SortableSection from "./SortableSection";

import {
    getAllChecklistSections,
    createChecklistSection,
    updateChecklistSection,
    reorderChecklistSections,
} from "../../services/checklists.service";

import type {
    Checklist,
    ChecklistVersion,
    ChecklistSection,
    ChecklistSectionPayload,
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

interface Props {
    checklist: Checklist;
    version: ChecklistVersion;
    onClose: () => void;
    onChanged?: () => void;
}

interface SectionForm {
    name: string;
    description: string;
    displayOrder: string;
}

const emptyForm: SectionForm = {
    name: "",
    description: "",
    displayOrder: "",
};

function errorText(error: unknown): string {
    return error instanceof Error
        ? error.message
        : "No fue posible completar la solicitud.";
}

export default function ChecklistVersionEditor({
    checklist,
    version,
    onClose,
    onChanged,
}: Props) {
    const [sections, setSections] =
        useState<ChecklistSection[]>([]);

    const [savedSections, setSavedSections] =
        useState<ChecklistSection[]>([]);

    const [loading, setLoading] = useState(true);
    const [reload, setReload] = useState(0);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Reordenamiento.
    const [savingOrder, setSavingOrder] = useState(false);
    const [orderError, setOrderError] = useState("");
    const [confirmClose, setConfirmClose] = useState(false);

    // Formulario de sección.
    const [formOpen, setFormOpen] = useState(false);

    const [editing, setEditing] =
        useState<ChecklistSection | null>(null);

    const [questionSection, setQuestionSection] =
        useState<ChecklistSection | null>(null);

    const [form, setForm] =
        useState<SectionForm>(emptyForm);

    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);

    const editable =
        version.status === "draft" &&
        version.published_at === null;

    const orderChanged =
        sections.length !== savedSections.length ||
        sections.some(
            (section, index) =>
                section.id !== savedSections[index]?.id
        );

    const busy = loading || saving || savingOrder;

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

        getAllChecklistSections(version.id)
            .then((result) => {
                if (active) {
                    setSections(result);
                    setSavedSections([...result]);
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
    }, [version.id, reload]);

    // Advertir al recargar o abandonar la página.
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

    function moveSection(from: number, to: number) {
        if (!editable || busy || formOpen) return;

        if (
            from === to ||
            from < 0 ||
            to < 0 ||
            from >= sections.length ||
            to >= sections.length
        ) {
            return;
        }

        setSections((previous) =>
            arrayMove(previous, from, to)
        );

        setOrderError("");
        setSuccess("");
    }

    function handleDragEnd(event: DragEndEvent) {
        if (!editable || busy || formOpen) return;

        const { active, over } = event;

        if (!over || active.id === over.id) return;

        const from = sections.findIndex(
            (section) => section.id === active.id
        );

        const to = sections.findIndex(
            (section) => section.id === over.id
        );

        moveSection(from, to);
    }

    async function saveOrder() {
        if (!editable || !orderChanged || busy) return;

        setSavingOrder(true);
        setOrderError("");
        setSuccess("");

        try {
            const response = await reorderChecklistSections(
                version.id,
                sections.map((section) => section.id)
            );

            const ordered = [...response.data].sort(
                (a, b) => a.display_order - b.display_order
            );

            setSections(ordered);
            setSavedSections([...ordered]);

            setSuccess(
                "Orden de las secciones guardado correctamente."
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

        setSections([...savedSections]);
        setOrderError("");
        setSuccess("");
    }

    function requestClose() {
        if (
            saving ||
            savingOrder ||
            formOpen ||
            questionSection
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
        if (!editable || orderChanged || busy) return;

        setEditing(null);
        setForm({ ...emptyForm });
        setFormError("");
        setSuccess("");
        setFormOpen(true);
    }

    function openEdit(section: ChecklistSection) {
        if (!editable || orderChanged || busy) return;

        setEditing(section);

        setForm({
            name: section.name,
            description: section.description ?? "",
            displayOrder: String(section.display_order),
        });

        setFormError("");
        setSuccess("");
        setFormOpen(true);
    }

    function closeForm() {
        if (saving) return;

        setFormOpen(false);
        setFormError("");
    }

    async function saveSection() {
        if (!editable || busy || orderChanged) return;

        const name = form.name.trim();

        if (!name) {
            setFormError(
                "El nombre de la sección es obligatorio."
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
            form.description.trim() || null;

        if (
            description &&
            new TextEncoder().encode(description).length > 65535
        ) {
            setFormError(
                "La descripción supera el tamaño permitido."
            );
            return;
        }

        const payload: ChecklistSectionPayload = {
            name,
            description,
        };

        const orderText = form.displayOrder.trim();

        if (orderText !== "") {
            const order = Number(orderText);

            if (
                !Number.isInteger(order) ||
                order < 1 ||
                order > 2147483647
            ) {
                setFormError(
                    "El orden debe ser un número entero positivo válido."
                );
                return;
            }

            const duplicated = sections.some(
                (section) =>
                    section.display_order === order &&
                    section.id !== editing?.id
            );

            if (duplicated) {
                setFormError(
                    "Ya existe una sección con esa posición."
                );
                return;
            }

            payload.display_order = order;
        } else if (editing) {
            setFormError(
                "Indica la posición de la sección."
            );
            return;
        }

        setSaving(true);
        setFormError("");
        setSuccess("");

        try {
            if (editing) {
                await updateChecklistSection(
                    editing.id,
                    payload
                );

                setSuccess(
                    "Sección actualizada correctamente."
                );
            } else {
                await createChecklistSection(
                    version.id,
                    payload
                );

                setSuccess(
                    "Sección creada correctamente."
                );
            }

            setFormOpen(false);
            setEditing(null);
            setForm({ ...emptyForm });

            setReload((previous) => previous + 1);

            onChanged?.();
        } catch (e) {
            setFormError(errorText(e));
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
                            mb: 0.5,
                        }}
                    >
                        ADMINISTRACIÓN DE CHECKLISTS
                    </Typography>

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
                                fontSize: 22,
                                fontWeight: 700,
                                color: NAVY,
                            }}
                        >
                            {editable
                                ? "Editor de contenido"
                                : "Contenido de la versión"}
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
                            fontSize: 14,
                            color: "#526477",
                            mt: 0.5,
                        }}
                    >
                        {checklist.name} · Versión {version.version}
                    </Typography>
                </DialogTitle>

                <DialogContent>
                    <Stack spacing={2.5} sx={{ pt: 2 }}>
                        {!editable && (
                            <Alert
                                severity="info"
                                icon={<LockOutlinedIcon />}
                            >
                                Esta versión es de solo lectura.
                                Su contenido no puede modificarse.
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
                                    Secciones
                                    {!loading && !error
                                        ? ` (${sections.length})`
                                        : ""}
                                </Typography>

                                <Typography
                                    sx={{
                                        fontSize: 13,
                                        color: "#81909D",
                                    }}
                                >
                                    Organiza la estructura del checklist.
                                </Typography>
                            </Box>

                            <Stack direction="row" spacing={1}>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<RefreshIcon />}
                                    disabled={busy || orderChanged}
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
                                            Boolean(error)
                                        }
                                        onClick={openCreate}
                                        sx={{
                                            bgcolor: NAVY,
                                            textTransform: "none",
                                        }}
                                    >
                                        Nueva sección
                                    </Button>
                                )}
                            </Stack>
                        </Box>

                        {editable && orderChanged && (
                            <Alert severity="warning">
                                Hay cambios de orden pendientes.
                                Guarda o descarta los cambios antes
                                de crear o editar otras secciones.
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
                                        mt: 1.5,
                                        fontSize: 13,
                                        color: "#81909D",
                                    }}
                                >
                                    Consultando secciones...
                                </Typography>
                            </Box>
                        ) : error ? (
                            <Box
                                sx={{
                                    py: 3,
                                    textAlign: "center",
                                    color: "#81909D",
                                }}
                            >
                                No fue posible cargar las secciones.
                            </Box>
                        ) : sections.length === 0 ? (
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
                                <LayersOutlinedIcon
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
                                    Sin secciones registradas
                                </Typography>

                                <Typography
                                    sx={{
                                        fontSize: 13,
                                        color: "#81909D",
                                        mt: 0.5,
                                    }}
                                >
                                    {editable
                                        ? "Agrega una sección para comenzar a construir esta versión."
                                        : "Esta versión no contiene secciones."}
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
                                        Crear primera sección
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
                                    items={sections.map(
                                        (section) => section.id
                                    )}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <Stack spacing={1.5}>
                                        {sections.map(
                                            (section, index) => (
                                                <SortableSection
                                                    key={section.id}
                                                    section={section}
                                                    index={index}
                                                    total={sections.length}
                                                    editable={editable}
                                                    disabled={
                                                        busy ||
                                                        formOpen ||
                                                        Boolean(questionSection)
                                                    }
                                                    orderChanged={orderChanged}
                                                    onEdit={openEdit}
                                                    onMove={moveSection}
                                                    onQuestions={(selectedSection) => {
                                                        if (!busy && !orderChanged && !formOpen) {
                                                            setQuestionSection(selectedSection);
                                                        }
                                                    }}
                                                />
                                            )
                                        )}
                                    </Stack>
                                </SortableContext>
                            </DndContext>
                        )}

                        {editable && sections.length > 1 && (
                            <Alert severity="info">
                                Arrastra las secciones desde el icono
                                de agarre o utiliza las flechas para
                                cambiar su posición. El nuevo orden
                                no se guardará hasta que lo confirmes.
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
                                disabled={busy}
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
                                disabled={busy}
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
                        onClick={requestClose}
                        disabled={
                            saving ||
                            savingOrder ||
                            formOpen ||
                            Boolean(questionSection)
                        }
                        sx={{
                            bgcolor: NAVY,
                            textTransform: "none",
                        }}
                    >
                        Volver a versiones
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Formulario de sección */}
            <Dialog
                open={formOpen}
                onClose={closeForm}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle
                    sx={{
                        color: NAVY,
                        fontWeight: 700,
                    }}
                >
                    {editing
                        ? "Editar sección"
                        : "Crear nueva sección"}
                </DialogTitle>

                <DialogContent dividers>
                    <Stack spacing={2.5} sx={{ pt: 1 }}>
                        {formError && (
                            <Alert severity="error">
                                {formError}
                            </Alert>
                        )}

                        <TextField
                            label="Nombre de la sección"
                            placeholder="Ej. Equipo de protección personal"
                            required
                            fullWidth
                            disabled={saving}
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
                            placeholder="Describe el propósito de la sección"
                            fullWidth
                            multiline
                            minRows={3}
                            disabled={saving}
                            value={form.description}
                            onChange={(event) =>
                                setForm((previous) => ({
                                    ...previous,
                                    description: event.target.value,
                                }))
                            }
                        />

                        <TextField
                            label="Orden de visualización"
                            type="number"
                            required={Boolean(editing)}
                            fullWidth
                            disabled={saving}
                            value={form.displayOrder}
                            onChange={(event) =>
                                setForm((previous) => ({
                                    ...previous,
                                    displayOrder: event.target.value,
                                }))
                            }
                            helperText={
                                editing
                                    ? "Indica una posición que no esté ocupada."
                                    : "Opcional. Si se deja vacío, se asignará al final."
                            }
                            slotProps={{
                                htmlInput: {
                                    min: 1,
                                    max: 2147483647,
                                    step: 1,
                                },
                            }}
                        />
                    </Stack>
                </DialogContent>

                <DialogActions sx={{ p: 2 }}>
                    <Button
                        disabled={saving}
                        onClick={closeForm}
                    >
                        Cancelar
                    </Button>

                    <Button
                        variant="contained"
                        disabled={saving}
                        onClick={() => void saveSection()}
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
                                : "Crear sección"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Confirmación de salida */}
            <Dialog
                open={confirmClose}
                onClose={() => setConfirmClose(false)}
                fullWidth
                maxWidth="xs"
            >
                <DialogTitle
                    sx={{
                        color: NAVY,
                        fontWeight: 700,
                    }}
                >
                    Cambios sin guardar
                </DialogTitle>

                <DialogContent>
                    <Typography sx={{ fontSize: 14 }}>
                        Has modificado el orden de las secciones,
                        pero todavía no has guardado los cambios.
                        Si sales del editor, se conservará el
                        último orden registrado.
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
            {questionSection && (
                <ChecklistSectionQuestions
                    key={questionSection.id}
                    checklist={checklist}
                    version={version}
                    section={questionSection}
                    onClose={() => setQuestionSection(null)}
                    onChanged={() => {
                        onChanged?.();
                    }}
                />
            )}
        </>
    );
}
