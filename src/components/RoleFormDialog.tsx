
import { useRef, useState } from "react";
import type { FormEvent } from "react";

import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    TextField,
    Typography,
} from "@mui/material";

import { ApiError } from "../api/client";

import {
    createAdministrationRole,
    updateAdministrationRole,
} from "../services/roles.service";

import type {
    AdministrationRole,
} from "../types/administration";

// =====================================================
// TIPOS
// =====================================================

interface RoleFormDialogProps {
    role?: AdministrationRole;
    onClose: () => void;
    onSaved: (
        role: AdministrationRole,
        message: string
    ) => void;
}

interface RoleForm {
    name: string;
    description: string;
}

type FieldErrors = Partial<
    Record<keyof RoleForm, string>
>;

// =====================================================
// VALIDACIÓN
// =====================================================

function validateForm(
    form: RoleForm
): FieldErrors {
    const errors: FieldErrors = {};

    if (!form.name.trim()) {
        errors.name =
            "El nombre del rol es obligatorio.";
    } else if (form.name.trim().length > 50) {
        errors.name =
            "El nombre no puede superar 50 caracteres.";
    }

    if (form.description.trim().length > 2000) {
        errors.description =
            "La descripción no puede superar 2000 caracteres.";
    }

    return errors;
}

// =====================================================
// ERRORES DE LARAVEL
// =====================================================

function extractValidationErrors(
    details: unknown
): FieldErrors {
    if (
        !details ||
        typeof details !== "object" ||
        !("errors" in details)
    ) {
        return {};
    }

    const errors = details.errors;

    if (!errors || typeof errors !== "object") {
        return {};
    }

    const result: FieldErrors = {};

    const fields: Array<keyof RoleForm> = [
        "name",
        "description",
    ];

    for (const field of fields) {
        const value = (
            errors as Record<string, unknown>
        )[field];

        if (
            Array.isArray(value) &&
            typeof value[0] === "string"
        ) {
            result[field] = value[0];
        } else if (typeof value === "string") {
            result[field] = value;
        }
    }

    return result;
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export default function RoleFormDialog({
    role,
    onClose,
    onSaved,
}: RoleFormDialogProps) {
    const isEditing = Boolean(role);

    const isProtected =
        Boolean(role?.system_key);

    const [form, setForm] =
        useState<RoleForm>({
            name: role?.name ?? "",
            description: role?.description ?? "",
        });

    const [fieldErrors, setFieldErrors] =
        useState<FieldErrors>({});

    const [error, setError] =
        useState<string | null>(null);

    const [saving, setSaving] =
        useState(false);

    const savingRef = useRef(false);

    // ===================================================
    // DETECTAR CAMBIOS
    // ===================================================

    const hasChanges =
        !isEditing ||
        form.name.trim() !== role?.name ||
        (form.description.trim() || null) !==
        (role?.description ?? null);

    // ===================================================
    // ACTUALIZAR CAMPOS
    // ===================================================

    function updateField(
        field: keyof RoleForm,
        value: string
    ) {
        setForm((current) => ({
            ...current,
            [field]: value,
        }));

        setFieldErrors((current) => ({
            ...current,
            [field]: undefined,
        }));

        setError(null);
    }

    // ===================================================
    // CERRAR
    // ===================================================

    function handleClose() {
        if (!savingRef.current) {
            onClose();
        }
    }

    // ===================================================
    // GUARDAR
    // ===================================================

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (
            savingRef.current ||
            isProtected ||
            !hasChanges
        ) {
            return;
        }

        setError(null);

        const validationErrors =
            validateForm(form);

        setFieldErrors(validationErrors);

        if (
            Object.keys(validationErrors).length > 0
        ) {
            return;
        }

        const payload = {
            name: form.name.trim(),
            description:
                form.description.trim() || null,
        };

        savingRef.current = true;
        setSaving(true);

        try {
            const response = role
                ? await updateAdministrationRole(
                    role.id,
                    payload
                )
                : await createAdministrationRole(
                    payload
                );

            onSaved(
                response.data,
                role
                    ? "El rol se actualizó correctamente."
                    : "El rol se creó correctamente."
            );
        } catch (err) {
            if (err instanceof ApiError) {
                if (err.status === 422) {
                    setFieldErrors(
                        extractValidationErrors(
                            err.details
                        )
                    );
                }

                setError(
                    err.message ||
                    "No fue posible guardar el rol."
                );
            } else {
                setError(
                    err instanceof Error
                        ? err.message
                        : "No fue posible guardar el rol."
                );
            }
        } finally {
            savingRef.current = false;
            setSaving(false);
        }
    }

    // ===================================================
    // INTERFAZ
    // ===================================================

    return (
        <Dialog
            open
            onClose={handleClose}
            fullWidth
            maxWidth="sm"
        >
            <Box
                component="form"
                noValidate
                onSubmit={handleSubmit}
            >
                <DialogTitle
                    sx={{
                        fontWeight: 700,
                        color: "#16324F",
                    }}
                >
                    {isEditing
                        ? "Editar rol"
                        : "Nuevo rol"}
                </DialogTitle>

                <DialogContent dividers>
                    <Stack spacing={3}>
                        <Typography
                            variant="body2"
                            sx={{ color: "#81909D" }}
                        >
                            {isEditing
                                ? "Modifica la información general del rol."
                                : "Crea un rol personalizado para esta organización."}
                        </Typography>

                        {isProtected && (
                            <Alert severity="warning">
                                Los roles base del sistema
                                están protegidos y no pueden
                                modificarse.
                            </Alert>
                        )}

                        <TextField
                            fullWidth
                            required
                            label="Nombre del rol"
                            value={form.name}
                            onChange={(event) =>
                                updateField(
                                    "name",
                                    event.target.value
                                )
                            }
                            error={Boolean(fieldErrors.name)}
                            helperText={
                                fieldErrors.name ??
                                `${form.name.length}/50 caracteres`
                            }
                            disabled={
                                saving || isProtected
                            }
                            slotProps={{
                                htmlInput: {
                                    maxLength: 50,
                                },
                            }}
                        />

                        <TextField
                            fullWidth
                            multiline
                            minRows={4}
                            label="Descripción"
                            value={form.description}
                            onChange={(event) =>
                                updateField(
                                    "description",
                                    event.target.value
                                )
                            }
                            error={Boolean(
                                fieldErrors.description
                            )}
                            helperText={
                                fieldErrors.description ??
                                `${form.description.length}/2000 caracteres`
                            }
                            disabled={
                                saving || isProtected
                            }
                            slotProps={{
                                htmlInput: {
                                    maxLength: 2000,
                                },
                            }}
                        />

                        {!isEditing && (
                            <Alert severity="info">
                                El rol se creará activo y
                                sin permisos asignados.
                                Podrás configurar sus permisos
                                posteriormente.
                            </Alert>
                        )}

                        {error && (
                            <Alert severity="error">
                                {error}
                            </Alert>
                        )}
                    </Stack>
                </DialogContent>

                <DialogActions
                    sx={{ px: 3, py: 2 }}
                >
                    <Button
                        onClick={handleClose}
                        disabled={saving}
                    >
                        Cancelar
                    </Button>

                    <Button
                        type="submit"
                        variant="contained"
                        disabled={
                            saving ||
                            isProtected ||
                            !hasChanges
                        }
                        startIcon={
                            saving ? (
                                <CircularProgress
                                    size={18}
                                    color="inherit"
                                />
                            ) : undefined
                        }
                    >
                        {saving
                            ? "Guardando..."
                            : isEditing
                                ? "Guardar cambios"
                                : "Crear rol"}
                    </Button>
                </DialogActions>
            </Box>
        </Dialog>
    );
}
