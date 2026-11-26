
import { useState } from "react";

import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    TextField,
    Typography,
} from "@mui/material";

import type {
    Norm,
    NormRequirement,
    NormRequirementPayload,
} from "../../types/norms";

const NAVY = "#16324F";
const GREEN = "#0F9D8A";

interface Props {
    norm: Norm;
    requirement: NormRequirement | null;
    saving: boolean;
    error: string;
    onClose: () => void;
    onSave: (
        payload: NormRequirementPayload
    ) => Promise<void>;
}

export default function NormRequirementForm({
    norm,
    requirement,
    saving,
    error,
    onClose,
    onSave,
}: Props) {
    const [code, setCode] = useState(
        requirement?.code ?? ""
    );

    const [section, setSection] = useState(
        requirement?.section ?? ""
    );

    const [description, setDescription] = useState(
        requirement?.description ?? ""
    );

    const [localError, setLocalError] = useState("");

    async function submit() {
        if (saving) return;

        setLocalError("");

        const normalizedCode = code.trim();
        const normalizedSection = section.trim();
        const normalizedDescription = description.trim();

        if (!normalizedCode) {
            setLocalError(
                "El código del requisito es obligatorio."
            );
            return;
        }

        if (normalizedCode.length > 100) {
            setLocalError(
                "El código no puede superar los 100 caracteres."
            );
            return;
        }

        if (normalizedSection.length > 100) {
            setLocalError(
                "La sección no puede superar los 100 caracteres."
            );
            return;
        }

        if (!normalizedDescription) {
            setLocalError(
                "La descripción del requisito es obligatoria."
            );
            return;
        }

        if (
            new TextEncoder()
                .encode(normalizedDescription)
                .length > 65535
        ) {
            setLocalError(
                "La descripción supera el tamaño permitido."
            );
            return;
        }

        const payload: NormRequirementPayload = {
            code: normalizedCode,
            section: normalizedSection || null,
            description: normalizedDescription,
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
                {requirement
                    ? "Editar requisito normativo"
                    : "Nuevo requisito normativo"}
            </DialogTitle>

            <DialogContent dividers>
                <Stack spacing={2.5} sx={{ pt: 1 }}>
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
                                overflowWrap: "anywhere",
                            }}
                        >
                            {norm.code}
                        </Typography>

                        <Typography
                            sx={{
                                fontSize: 13,
                                color: "text.secondary",
                                mt: 0.5,
                            }}
                        >
                            {norm.name}
                        </Typography>
                    </Box>

                    {(localError || error) && (
                        <Alert severity="error">
                            {localError || error}
                        </Alert>
                    )}

                    <TextField
                        label="Código del requisito"
                        placeholder="Ej. 5.1"
                        required
                        fullWidth
                        disabled={saving}
                        value={code}
                        onChange={(event) => {
                            setCode(event.target.value);
                            setLocalError("");
                        }}
                        helperText={`${code.length}/100 caracteres`}
                        slotProps={{
                            htmlInput: {
                                maxLength: 100,
                            },
                        }}
                    />

                    <TextField
                        label="Sección o apartado"
                        placeholder="Ej. Obligaciones del patrón"
                        fullWidth
                        disabled={saving}
                        value={section}
                        onChange={(event) => {
                            setSection(event.target.value);
                            setLocalError("");
                        }}
                        helperText={`${section.length}/100 caracteres`}
                        slotProps={{
                            htmlInput: {
                                maxLength: 100,
                            },
                        }}
                    />

                    <TextField
                        label="Descripción del requisito"
                        placeholder="Introduce el contenido del requisito normativo..."
                        required
                        fullWidth
                        multiline
                        minRows={5}
                        maxRows={12}
                        disabled={saving}
                        value={description}
                        onChange={(event) => {
                            setDescription(event.target.value);
                            setLocalError("");
                        }}
                    />

                    <Alert severity="info">
                        El código debe ser único dentro de
                        esta norma.
                    </Alert>
                </Stack>
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <Button
                    disabled={saving}
                    onClick={onClose}
                    sx={{
                        textTransform: "none",
                    }}
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
                        : requirement
                            ? "Guardar cambios"
                            : "Crear requisito"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
