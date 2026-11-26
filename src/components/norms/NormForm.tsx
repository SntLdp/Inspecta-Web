import { useState } from "react";

import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    TextField,
} from "@mui/material";

import type {
    Norm,
    NormPayload,
} from "../../types/norms";

const NAVY = "#16324F";
const GREEN = "#0F9D8A";

interface Props {
    norm: Norm | null;
    saving: boolean;
    error: string;
    onClose: () => void;
    onSave: (payload: NormPayload) => Promise<void>;
}

interface NormFormData {
    code: string;
    name: string;
    description: string;
    issuing_body: string;
    version: string;
    effective_date: string;
}

export default function NormForm({
    norm,
    saving,
    error,
    onClose,
    onSave,
}: Props) {
    const [form, setForm] = useState<NormFormData>({
        code: norm?.code ?? "",
        name: norm?.name ?? "",
        description: norm?.description ?? "",
        issuing_body: norm?.issuing_body ?? "",
        version: norm?.version ?? "",
        effective_date:
            norm?.effective_date?.slice(0, 10) ?? "",
    });

    const [localError, setLocalError] = useState("");

    function updateField(
        field: keyof NormFormData,
        value: string
    ) {
        setForm((previous) => ({
            ...previous,
            [field]: value,
        }));

        setLocalError("");
    }

    async function submit() {
        if (saving) return;

        setLocalError("");

        const code = form.code.trim();
        const name = form.name.trim();
        const description = form.description.trim();
        const issuingBody = form.issuing_body.trim();
        const version = form.version.trim();
        const effectiveDate = form.effective_date.trim();

        if (!code || !name) {
            setLocalError(
                "La clave y el nombre de la norma son obligatorios."
            );
            return;
        }

        if (code.length > 100) {
            setLocalError(
                "La clave no puede superar los 100 caracteres."
            );
            return;
        }

        if (name.length > 150) {
            setLocalError(
                "El nombre no puede superar los 150 caracteres."
            );
            return;
        }

        if (issuingBody.length > 150) {
            setLocalError(
                "El organismo emisor no puede superar los 150 caracteres."
            );
            return;
        }

        if (version.length > 50) {
            setLocalError(
                "La versión no puede superar los 50 caracteres."
            );
            return;
        }

        if (
            new TextEncoder().encode(description).length > 65535
        ) {
            setLocalError(
                "La descripción supera el tamaño permitido."
            );
            return;
        }

        if (
            effectiveDate &&
            !/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)
        ) {
            setLocalError(
                "La fecha de entrada en vigor no es válida."
            );
            return;
        }

        const payload: NormPayload = {
            code,
            name,
            description: description || null,
            issuing_body: issuingBody || null,
            version: version || null,
            effective_date: effectiveDate || null,
        };

        await onSave(payload);
    }

    return (
        <Dialog
            open
            fullWidth
            maxWidth="sm"
            onClose={() => {
                if (!saving) onClose();
            }}
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
                {norm ? "Editar norma" : "Nueva norma"}
            </DialogTitle>

            <DialogContent dividers>
                <Stack spacing={2.5} sx={{ pt: 1 }}>
                    {(localError || error) && (
                        <Alert severity="error">
                            {localError || error}
                        </Alert>
                    )}

                    <Stack
                        direction={{
                            xs: "column",
                            sm: "row",
                        }}
                        spacing={2}
                    >
                        <TextField
                            label="Clave de la norma"
                            placeholder="NOM-017-STPS-2024"
                            required
                            fullWidth
                            disabled={saving}
                            value={form.code}
                            onChange={(event) =>
                                updateField(
                                    "code",
                                    event.target.value
                                )
                            }
                            slotProps={{
                                htmlInput: {
                                    maxLength: 100,
                                },
                            }}
                        />

                        <TextField
                            label="Versión"
                            placeholder="2024"
                            fullWidth
                            disabled={saving}
                            value={form.version}
                            onChange={(event) =>
                                updateField(
                                    "version",
                                    event.target.value
                                )
                            }
                            slotProps={{
                                htmlInput: {
                                    maxLength: 50,
                                },
                            }}
                        />
                    </Stack>

                    <TextField
                        label="Nombre de la norma"
                        required
                        fullWidth
                        multiline
                        minRows={2}
                        disabled={saving}
                        value={form.name}
                        onChange={(event) =>
                            updateField(
                                "name",
                                event.target.value
                            )
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
                        placeholder="Describe el alcance y propósito de la norma"
                        fullWidth
                        multiline
                        minRows={3}
                        disabled={saving}
                        value={form.description}
                        onChange={(event) =>
                            updateField(
                                "description",
                                event.target.value
                            )
                        }
                    />

                    <TextField
                        label="Organismo emisor"
                        placeholder="Ej. STPS, ISO"
                        fullWidth
                        disabled={saving}
                        value={form.issuing_body}
                        onChange={(event) =>
                            updateField(
                                "issuing_body",
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
                        label="Fecha de entrada en vigor"
                        type="date"
                        fullWidth
                        disabled={saving}
                        value={form.effective_date}
                        onChange={(event) =>
                            updateField(
                                "effective_date",
                                event.target.value
                            )
                        }
                        slotProps={{
                            inputLabel: {
                                shrink: true,
                            },
                        }}
                        helperText="Fecha en la que entra en vigor la norma."
                    />

                    {!norm && (
                        <Alert severity="info">
                            Las normas nuevas se registran
                            automáticamente como activas.
                        </Alert>
                    )}
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
                        : norm
                            ? "Guardar cambios"
                            : "Crear norma"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
