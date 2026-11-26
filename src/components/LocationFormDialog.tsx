
import { useEffect, useState } from "react";

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
    getLocationPlant,
    getLocationArea,
    getLocationProductionLine,
    createLocationPlant,
    createLocationArea,
    createLocationProductionLine,
    updateLocationPlant,
    updateLocationArea,
    updateLocationProductionLine,
} from "../services/locations.service";

import type {
    LocationFormConfig,
    LocationKind,
} from "../types/locations";

// =====================================================
// TIPOS
// =====================================================

interface LocationFormDialogProps {
    config: LocationFormConfig | null;
    onClose: () => void;
    onSaved: (message: string) => void;
}

interface FormValues {
    name: string;
    code: string;
    description: string;
    address: string;
    type: string;
}

type FormErrors = Partial<
    Record<keyof FormValues, string>
>;

const EMPTY_FORM: FormValues = {
    name: "",
    code: "",
    description: "",
    address: "",
    type: "",
};

const LOCATION_LABELS: Record<LocationKind, string> = {
    plant: "planta",
    area: "área",
    "production-line": "línea de producción",
};

// =====================================================
// VALIDACIÓN
// =====================================================

function validateForm(
    values: FormValues,
    kind: LocationKind
): FormErrors {
    const errors: FormErrors = {};

    const name = values.name.trim();
    const code = values.code.trim().toUpperCase();

    if (!name) {
        errors.name = "El nombre es obligatorio.";
    } else if (name.length > 150) {
        errors.name =
            "El nombre no puede superar los 150 caracteres.";
    }

    if (!code) {
        errors.code = "El código es obligatorio.";
    } else if (code.length > 50) {
        errors.code =
            "El código no puede superar los 50 caracteres.";
    } else if (!/^[A-Z0-9-]+$/.test(code)) {
        errors.code =
            "Utiliza únicamente letras, números y guiones.";
    }

    if (
        kind === "area" &&
        values.type.trim().length > 50
    ) {
        errors.type =
            "El tipo no puede superar los 50 caracteres.";
    }

    return errors;
}

function nullableValue(value: string): string | null {
    return value.trim() || null;
}

function getValidationErrors(
    error: ApiError
): FormErrors {
    const result: FormErrors = {};

    if (
        error.status !== 422 ||
        !error.details ||
        typeof error.details !== "object"
    ) {
        return result;
    }

    const details = error.details as Record<
        string,
        unknown
    >;

    if (
        !details.errors ||
        typeof details.errors !== "object"
    ) {
        return result;
    }

    const errors = details.errors as Record<
        string,
        unknown
    >;

    const fields: (keyof FormValues)[] = [
        "name",
        "code",
        "description",
        "address",
        "type",
    ];

    for (const field of fields) {
        const messages = errors[field];

        if (
            Array.isArray(messages) &&
            typeof messages[0] === "string"
        ) {
            result[field] = messages[0];
        } else if (typeof messages === "string") {
            result[field] = messages;
        }
    }

    return result;
}

// =====================================================
// COMPONENTE
// =====================================================

export default function LocationFormDialog({
    config,
    onClose,
    onSaved,
}: LocationFormDialogProps) {
    const [values, setValues] =
        useState<FormValues>(EMPTY_FORM);

    const [errors, setErrors] =
        useState<FormErrors>({});

    const [error, setError] =
        useState<string | null>(null);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [detailFailed, setDetailFailed] =
        useState(false);

    const [reloadVersion, setReloadVersion] =
        useState(0);

    // ===================================================
    // CARGAR DATOS PARA EDICIÓN
    // ===================================================

    useEffect(() => {
        if (!config) {
            return;
        }

        const currentConfig = config;
        const controller = new AbortController();

        setValues({ ...EMPTY_FORM });
        setErrors({});
        setError(null);
        setDetailFailed(false);

        if (currentConfig.mode === "create") {
            setLoading(false);

            return () => controller.abort();
        }

        setLoading(true);

        async function loadDetails() {
            try {
                let form: FormValues = {
                    ...EMPTY_FORM,
                };

                if (currentConfig.mode !== "edit") {
                    return;
                }

                switch (currentConfig.kind) {
                    case "plant": {
                        const { data } = await getLocationPlant(
                            currentConfig.id,
                            controller.signal
                        );

                        form = {
                            ...form,
                            name: data.name,
                            code: data.code,
                            description: data.description ?? "",
                            address: data.address ?? "",
                        };

                        break;
                    }

                    case "area": {
                        const { data } = await getLocationArea(
                            currentConfig.id,
                            controller.signal
                        );

                        form = {
                            ...form,
                            name: data.name,
                            code: data.code,
                            description: data.description ?? "",
                            type: data.type ?? "",
                        };

                        break;
                    }

                    case "production-line": {
                        const { data } =
                            await getLocationProductionLine(
                                currentConfig.id,
                                controller.signal
                            );

                        form = {
                            ...form,
                            name: data.name,
                            code: data.code,
                            description: data.description ?? "",
                        };

                        break;
                    }
                }

                if (!controller.signal.aborted) {
                    setValues(form);
                }
            } catch (err) {
                if (controller.signal.aborted) {
                    return;
                }

                setDetailFailed(true);

                setError(
                    err instanceof Error
                        ? err.message
                        : "No fue posible consultar la ubicación."
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        void loadDetails();

        return () => controller.abort();
    }, [config, reloadVersion]);

    // ===================================================
    // ACTUALIZAR CAMPOS
    // ===================================================

    function updateField(
        field: keyof FormValues,
        value: string
    ) {
        setValues((current) => ({
            ...current,
            [field]:
                field === "code"
                    ? value.toUpperCase()
                    : value,
        }));

        setErrors((current) => ({
            ...current,
            [field]: undefined,
        }));

        setError(null);
    }

    // ===================================================
    // GUARDAR
    // ===================================================

    async function handleSave() {
        if (
            !config ||
            saving ||
            loading ||
            detailFailed
        ) {
            return;
        }

        const validationErrors = validateForm(
            values,
            config.kind
        );

        setErrors(validationErrors);
        setError(null);

        if (Object.keys(validationErrors).length > 0) {
            return;
        }

        setSaving(true);

        const baseInput = {
            name: values.name.trim(),
            code: values.code.trim().toUpperCase(),
            description: nullableValue(values.description),
        };

        try {
            if (config.mode === "create") {
                switch (config.kind) {
                    case "plant":
                        await createLocationPlant({
                            ...baseInput,
                            address: nullableValue(values.address),
                        });

                        break;

                    case "area":
                        await createLocationArea(
                            config.parentId,
                            {
                                ...baseInput,
                                type: nullableValue(values.type),
                            }
                        );

                        break;

                    case "production-line":
                        await createLocationProductionLine(
                            config.parentId,
                            baseInput
                        );

                        break;
                }
            } else {
                switch (config.kind) {
                    case "plant":
                        await updateLocationPlant(
                            config.id,
                            {
                                ...baseInput,
                                address: nullableValue(values.address),
                            }
                        );

                        break;

                    case "area":
                        await updateLocationArea(
                            config.id,
                            {
                                ...baseInput,
                                type: nullableValue(values.type),
                            }
                        );

                        break;

                    case "production-line":
                        await updateLocationProductionLine(
                            config.id,
                            baseInput
                        );

                        break;
                }
            }
        } catch (err) {
            if (err instanceof ApiError) {
                setErrors(getValidationErrors(err));
                setError(err.message);
            } else {
                setError(
                    err instanceof Error
                        ? err.message
                        : "No fue posible guardar la ubicación."
                );
            }

            setSaving(false);
            return;
        }

        setSaving(false);

        onSaved(
            config.mode === "create"
                ? "Ubicación creada correctamente."
                : "Ubicación actualizada correctamente."
        );
    }

    // ===================================================
    // CERRAR FORMULARIO
    // ===================================================

    function handleClose() {
        if (!saving) {
            onClose();
        }
    }

    if (!config) {
        return null;
    }

    const locationLabel =
        LOCATION_LABELS[config.kind];

    const title =
        config.mode === "edit"
            ? `Editar ${locationLabel}`
            : config.kind === "area"
                ? "Nueva área"
                : `Nueva ${locationLabel}`;

    const fieldsDisabled =
        loading || saving || detailFailed;

    // ===================================================
    // INTERFAZ
    // ===================================================

    return (
        <Dialog
            open
            onClose={() => {
                if (!saving) {
                    onClose();
                }
            }}
            fullWidth
            maxWidth="sm"
        >
            <DialogTitle
                sx={{
                    fontWeight: 700,
                    color: "#16324F",
                }}
            >
                {title}
            </DialogTitle>

            <DialogContent dividers>
                <Stack spacing={2.5}>
                    {config.mode === "create" &&
                        config.kind !== "plant" && (
                            <Box
                                sx={{
                                    p: 2,
                                    borderRadius: 2,
                                    backgroundColor: "action.hover",
                                }}
                            >
                                <Typography
                                    variant="caption"
                                    sx={{ color: "text.secondary" }}
                                >
                                    {config.kind === "area"
                                        ? "Planta"
                                        : "Área"}
                                </Typography>

                                <Typography
                                    variant="body2"
                                    sx={{ fontWeight: 600 }}
                                >
                                    {config.parentName}
                                </Typography>
                            </Box>
                        )}

                    {error && (
                        <Alert
                            severity="error"
                            action={
                                detailFailed ? (
                                    <Button
                                        color="inherit"
                                        size="small"
                                        onClick={() =>
                                            setReloadVersion(
                                                (current) => current + 1
                                            )
                                        }
                                    >
                                        Reintentar
                                    </Button>
                                ) : undefined
                            }
                        >
                            {error}
                        </Alert>
                    )}

                    {loading ? (
                        <Stack
                            spacing={2}
                            sx={{
                                alignItems: "center",
                                py: 4,
                            }}
                        >
                            <CircularProgress size={30} />

                            <Typography
                                variant="body2"
                                sx={{ color: "text.secondary" }}
                            >
                                Cargando información...
                            </Typography>
                        </Stack>
                    ) : (
                        <>
                            <TextField
                                label="Nombre"
                                value={values.name}
                                onChange={(event) =>
                                    updateField(
                                        "name",
                                        event.target.value
                                    )
                                }
                                required
                                fullWidth
                                disabled={fieldsDisabled}
                                error={Boolean(errors.name)}
                                helperText={
                                    errors.name ??
                                    "Máximo 150 caracteres."
                                }
                            />

                            <TextField
                                label="Código"
                                value={values.code}
                                onChange={(event) =>
                                    updateField(
                                        "code",
                                        event.target.value
                                    )
                                }
                                required
                                fullWidth
                                disabled={fieldsDisabled}
                                error={Boolean(errors.code)}
                                helperText={
                                    errors.code ??
                                    "Letras, números y guiones. Máximo 50 caracteres."
                                }
                            />

                            {config.kind === "plant" && (
                                <TextField
                                    label="Dirección"
                                    value={values.address}
                                    onChange={(event) =>
                                        updateField(
                                            "address",
                                            event.target.value
                                        )
                                    }
                                    fullWidth
                                    disabled={fieldsDisabled}
                                    error={Boolean(errors.address)}
                                    helperText={errors.address}
                                />
                            )}

                            {config.kind === "area" && (
                                <TextField
                                    label="Tipo de área"
                                    value={values.type}
                                    onChange={(event) =>
                                        updateField(
                                            "type",
                                            event.target.value
                                        )
                                    }
                                    fullWidth
                                    disabled={fieldsDisabled}
                                    error={Boolean(errors.type)}
                                    helperText={
                                        errors.type ??
                                        "Campo opcional. Máximo 50 caracteres."
                                    }
                                />
                            )}

                            <TextField
                                label="Descripción"
                                value={values.description}
                                onChange={(event) =>
                                    updateField(
                                        "description",
                                        event.target.value
                                    )
                                }
                                fullWidth
                                multiline
                                minRows={3}
                                disabled={fieldsDisabled}
                                error={Boolean(errors.description)}
                                helperText={errors.description}
                            />

                            {config.mode === "edit" && (
                                <Alert severity="info">
                                    La edición no modifica el estado
                                    ni la ubicación superior del registro.
                                </Alert>
                            )}
                        </>
                    )}
                </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
                <Button
                    onClick={handleClose}
                    disabled={saving}
                >
                    Cancelar
                </Button>

                <Button
                    variant="contained"
                    onClick={() => void handleSave()}
                    disabled={fieldsDisabled}
                    startIcon={
                        saving ? (
                            <CircularProgress
                                size={18}
                                color="inherit"
                            />
                        ) : undefined
                    }
                    sx={{
                        backgroundColor: "#16324F",
                        "&:hover": {
                            backgroundColor: "#244766",
                        },
                    }}
                >
                    {saving
                        ? "Guardando..."
                        : config.mode === "create"
                            ? "Crear"
                            : "Guardar cambios"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
