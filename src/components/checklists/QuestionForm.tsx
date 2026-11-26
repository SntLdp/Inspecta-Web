import { useState } from "react";

import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    IconButton,
    MenuItem,
    Paper,
    Stack,
    Switch,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";

import { QUESTION_TYPE_LABELS } from "../../types/checklists";

import type {
    ChecklistQuestion,
    ChecklistQuestionPayload,
    QuestionAnswerType,
    QuestionOption,
} from "../../types/checklists";

const NAVY = "#16324F";
const GREEN = "#0F9D8A";

interface Props {
    question: ChecklistQuestion | null;
    questions: ChecklistQuestion[];
    saving: boolean;
    error: string;
    onClose: () => void;
    onSave: (payload: ChecklistQuestionPayload) => Promise<void>;
}

function emptyOptions(): QuestionOption[] {
    return [
        { value: "", label: "" },
        { value: "", label: "" },
    ];
}

export default function QuestionForm({
    question,
    questions,
    saving,
    error,
    onClose,
    onSave,
}: Props) {
    const [questionText, setQuestionText] = useState(
        question?.question_text ?? ""
    );

    const [description, setDescription] = useState(
        question?.description ?? ""
    );

    const [answerType, setAnswerType] =
        useState<QuestionAnswerType>(
            question?.answer_type ?? "boolean"
        );

    const [options, setOptions] = useState<QuestionOption[]>(
        question?.options?.map((option) => ({ ...option })) ??
        emptyOptions()
    );

    const [displayOrder, setDisplayOrder] = useState(
        question ? String(question.display_order) : ""
    );

    const [required, setRequired] = useState(
        question?.required ?? true
    );

    const [allowsEvidence, setAllowsEvidence] = useState(
        question?.allows_evidence ?? false
    );

    const [localError, setLocalError] = useState("");

    function updateOption(
        index: number,
        field: keyof QuestionOption,
        value: string
    ) {
        setOptions((previous) =>
            previous.map((option, position) =>
                position === index
                    ? { ...option, [field]: value }
                    : option
            )
        );
    }

    function addOption() {
        setOptions((previous) => [
            ...previous,
            { value: "", label: "" },
        ]);
    }

    function removeOption(index: number) {
        setOptions((previous) =>
            previous.length > 2
                ? previous.filter((_, position) => position !== index)
                : previous
        );
    }

    async function submit() {
        if (saving) return;

        setLocalError("");

        const text = questionText.trim();
        const details = description.trim() || null;
        const encoder = new TextEncoder();

        if (!text) {
            setLocalError("El texto de la pregunta es obligatorio.");
            return;
        }

        if (encoder.encode(text).length > 65535) {
            setLocalError("El texto de la pregunta es demasiado largo.");
            return;
        }

        if (details && encoder.encode(details).length > 65535) {
            setLocalError("La descripción es demasiado larga.");
            return;
        }

        const payload: ChecklistQuestionPayload = {
            question_text: text,
            description: details,
            answer_type: answerType,
            options: null,
            required,
            allows_evidence: allowsEvidence,
        };

        if (answerType === "multiple_choice") {
            const normalizedOptions = options.map((option) => ({
                value: option.value.trim(),
                label: option.label.trim(),
            }));

            if (normalizedOptions.length < 2) {
                setLocalError("Debes agregar al menos dos opciones.");
                return;
            }

            if (
                normalizedOptions.some(
                    (option) => !option.value || !option.label
                )
            ) {
                setLocalError(
                    "Todas las opciones deben tener un valor y una etiqueta."
                );
                return;
            }

            if (
                normalizedOptions.some(
                    (option) =>
                        option.value.length > 100 ||
                        option.label.length > 150
                )
            ) {
                setLocalError(
                    "Los valores admiten 100 caracteres y las etiquetas 150."
                );
                return;
            }

            const values = normalizedOptions.map(
                (option) => option.value
            );

            if (new Set(values).size !== values.length) {
                setLocalError(
                    "Los valores internos de las opciones no pueden repetirse."
                );
                return;
            }

            payload.options = normalizedOptions;
        }

        if (displayOrder.trim() !== "") {
            const order = Number(displayOrder);

            if (
                !Number.isInteger(order) ||
                order < 1 ||
                order > 2147483647
            ) {
                setLocalError(
                    "El orden debe ser un número entero positivo válido."
                );
                return;
            }

            if (
                questions.some(
                    (item) =>
                        item.display_order === order &&
                        item.id !== question?.id
                )
            ) {
                setLocalError(
                    "Ya existe una pregunta con esa posición."
                );
                return;
            }

            payload.display_order = order;
        } else if (question) {
            setLocalError("Indica la posición de la pregunta.");
            return;
        }

        await onSave(payload);
    }

    return (
        <Dialog
            open
            onClose={() => {
                if (!saving) onClose();
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
                sx={{ color: NAVY, fontWeight: 700 }}
            >
                {question
                    ? "Editar pregunta"
                    : "Crear nueva pregunta"}
            </DialogTitle>

            <DialogContent dividers>
                <Stack spacing={2.5} sx={{ pt: 1 }}>
                    {(localError || error) && (
                        <Alert severity="error">
                            {localError || error}
                        </Alert>
                    )}

                    <TextField
                        label="Texto de la pregunta"
                        placeholder="Ej. ¿El trabajador utiliza casco de seguridad?"
                        required
                        fullWidth
                        multiline
                        minRows={2}
                        disabled={saving}
                        value={questionText}
                        onChange={(event) =>
                            setQuestionText(event.target.value)
                        }
                    />

                    <TextField
                        label="Descripción"
                        placeholder="Instrucciones adicionales para el inspector"
                        fullWidth
                        multiline
                        minRows={2}
                        disabled={saving}
                        value={description}
                        onChange={(event) =>
                            setDescription(event.target.value)
                        }
                    />

                    <TextField
                        select
                        required
                        fullWidth
                        label="Tipo de respuesta"
                        disabled={saving}
                        value={answerType}
                        onChange={(event) =>
                            setAnswerType(
                                event.target.value as QuestionAnswerType
                            )
                        }
                    >
                        {Object.entries(QUESTION_TYPE_LABELS).map(
                            ([value, label]) => (
                                <MenuItem key={value} value={value}>
                                    {label}
                                </MenuItem>
                            )
                        )}
                    </TextField>

                    {answerType === "multiple_choice" && (
                        <Paper
                            variant="outlined"
                            sx={{
                                p: 2,
                                borderRadius: 2,
                                borderColor: "#DCE6EE",
                            }}
                        >
                            <Stack spacing={2}>
                                <Box>
                                    <Typography
                                        sx={{
                                            color: NAVY,
                                            fontWeight: 700,
                                            fontSize: 14,
                                        }}
                                    >
                                        Opciones de respuesta
                                    </Typography>

                                    <Typography
                                        sx={{
                                            color: "#81909D",
                                            fontSize: 12,
                                        }}
                                    >
                                        Agrega al menos dos opciones con
                                        valores internos únicos.
                                    </Typography>
                                </Box>

                                {options.map((option, index) => (
                                    <Stack
                                        key={index}
                                        direction="row"
                                        spacing={1}
                                        sx={{ alignItems: "center" }}
                                    >
                                        <TextField
                                            label={`Etiqueta ${index + 1}`}
                                            size="small"
                                            fullWidth
                                            required
                                            disabled={saving}
                                            value={option.label}
                                            onChange={(event) =>
                                                updateOption(
                                                    index,
                                                    "label",
                                                    event.target.value
                                                )
                                            }
                                            slotProps={{
                                                htmlInput: {
                                                    maxLength: 150,
                                                },
                                            }}
                                        />

                                        <TextField
                                            label="Valor interno"
                                            size="small"
                                            fullWidth
                                            required
                                            disabled={saving}
                                            value={option.value}
                                            onChange={(event) =>
                                                updateOption(
                                                    index,
                                                    "value",
                                                    event.target.value
                                                )
                                            }
                                            slotProps={{
                                                htmlInput: {
                                                    maxLength: 100,
                                                },
                                            }}
                                        />

                                        <Tooltip title="Eliminar opción">
                                            <span>
                                                <IconButton
                                                    color="error"
                                                    disabled={
                                                        saving ||
                                                        options.length <= 2
                                                    }
                                                    onClick={() =>
                                                        removeOption(index)
                                                    }
                                                >
                                                    <DeleteOutlineIcon />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                    </Stack>
                                ))}

                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<AddIcon />}
                                    disabled={saving}
                                    onClick={addOption}
                                    sx={{
                                        color: GREEN,
                                        borderColor: GREEN,
                                        textTransform: "none",
                                    }}
                                >
                                    Agregar opción
                                </Button>
                            </Stack>
                        </Paper>
                    )}

                    <TextField
                        label="Orden de visualización"
                        type="number"
                        fullWidth
                        required={Boolean(question)}
                        disabled={saving}
                        value={displayOrder}
                        onChange={(event) =>
                            setDisplayOrder(event.target.value)
                        }
                        helperText={
                            question
                                ? "Indica una posición disponible."
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

                    <Paper
                        variant="outlined"
                        sx={{
                            p: 2,
                            borderRadius: 2,
                            borderColor: "#DCE6EE",
                        }}
                    >
                        <Stack spacing={1}>
                            <Typography
                                sx={{
                                    color: NAVY,
                                    fontWeight: 700,
                                    fontSize: 14,
                                }}
                            >
                                Configuración de la pregunta
                            </Typography>

                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={required}
                                        disabled={saving}
                                        onChange={(event) =>
                                            setRequired(event.target.checked)
                                        }
                                        color="success"
                                    />
                                }
                                label="Pregunta obligatoria"
                            />

                            <Typography
                                sx={{
                                    fontSize: 12,
                                    color: "#81909D",
                                }}
                            >
                                El inspector deberá responderla para
                                completar la inspección.
                            </Typography>

                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={allowsEvidence}
                                        disabled={saving}
                                        onChange={(event) =>
                                            setAllowsEvidence(
                                                event.target.checked
                                            )
                                        }
                                        color="success"
                                    />
                                }
                                label="Permitir evidencias"
                            />

                            <Typography
                                sx={{
                                    fontSize: 12,
                                    color: "#81909D",
                                }}
                            >
                                Permite asociar evidencias a la respuesta
                                durante una inspección.
                            </Typography>
                        </Stack>
                    </Paper>
                </Stack>
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <Button
                    disabled={saving}
                    onClick={onClose}
                    sx={{ textTransform: "none" }}
                >
                    Cancelar
                </Button>

                <Button
                    variant="contained"
                    disabled={saving}
                    onClick={() => void submit()}
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
                        : question
                            ? "Guardar cambios"
                            : "Crear pregunta"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
