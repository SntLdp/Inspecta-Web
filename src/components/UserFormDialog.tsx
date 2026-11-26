
import { useState } from "react";
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
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import {
  Visibility,
  VisibilityOff,
  CheckCircle,
} from "@mui/icons-material";

import { ApiError } from "../api/client";

import {
  createAdministrationUser,
} from "../services/users.services";

import type {
  AdministrationUser,
  AdministrationUserCreateInput,
} from "../types/administration";

// =====================================================
// TIPOS
// =====================================================

interface UserFormDialogProps {
  onClose: () => void;
  onSaved: (user: AdministrationUser) => void;
}

type FieldErrors = Partial<
  Record<keyof AdministrationUserCreateInput, string>
>;

const EMPTY_FORM: AdministrationUserCreateInput = {
  name: "",
  email: "",
  password: "",
  password_confirmation: "",
};

// =====================================================
// VALIDACIÓN
// =====================================================

function validateForm(
  form: AdministrationUserCreateInput
): FieldErrors {
  const errors: FieldErrors = {};

  if (!form.name.trim()) {
    errors.name = "El nombre es obligatorio.";
  } else if (form.name.trim().length > 150) {
    errors.name =
      "El nombre no puede superar 150 caracteres.";
  }

  if (!form.email.trim()) {
    errors.email = "El correo es obligatorio.";
  } else if (form.email.trim().length > 255) {
    errors.email =
      "El correo no puede superar 255 caracteres.";
  } else if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      form.email.trim()
    )
  ) {
    errors.email = "Introduce un correo válido.";
  }

  if (form.password.length < 12) {
    errors.password =
      "La contraseña debe tener al menos 12 caracteres.";
  } else if (
    new TextEncoder().encode(form.password).length > 72
  ) {
    errors.password =
      "La contraseña no puede superar 72 bytes.";
  } else if (
    !/[A-Z]/.test(form.password) ||
    !/[a-z]/.test(form.password) ||
    !/[0-9]/.test(form.password)
  ) {
    errors.password =
      "Incluye una mayúscula, una minúscula y un número.";
  } else if (form.password.includes("\0")) {
    errors.password =
      "La contraseña contiene caracteres no permitidos.";
  }

  if (!form.password_confirmation) {
    errors.password_confirmation =
      "Confirma la contraseña.";
  } else if (
    form.password !== form.password_confirmation
  ) {
    errors.password_confirmation =
      "Las contraseñas no coinciden.";
  }

  return errors;
}

// =====================================================
// ERRORES DE VALIDACIÓN DEL BACKEND
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

  const fields: Array<
    keyof AdministrationUserCreateInput
  > = [
    "name",
    "email",
    "password",
    "password_confirmation",
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

export default function UserFormDialog({
  onClose,
  onSaved,
}: UserFormDialogProps) {
  const [form, setForm] =
    useState<AdministrationUserCreateInput>({
      ...EMPTY_FORM,
    });

  const [fieldErrors, setFieldErrors] =
    useState<FieldErrors>({});

  const [error, setError] =
    useState<string | null>(null);

  const [saving, setSaving] =
    useState(false);

  const [showPassword, setShowPassword] =
    useState(false);

  const [
    showConfirmation,
    setShowConfirmation,
  ] = useState(false);

  // ===================================================
  // ACTUALIZAR CAMPOS
  // ===================================================

  function updateField(
    field: keyof AdministrationUserCreateInput,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setFieldErrors((current) => ({
      ...current,
      [field]: undefined,
      ...(field === "password"
        ? { password_confirmation: undefined }
        : {}),
    }));

    setError(null);
  }

  // ===================================================
  // REQUISITOS DE CONTRASEÑA
  // ===================================================

  const passwordRequirements = [
    {
      label: "Mínimo 12 caracteres",
      valid: form.password.length >= 12,
    },
    {
      label: "Una letra mayúscula",
      valid: /[A-Z]/.test(form.password),
    },
    {
      label: "Una letra minúscula",
      valid: /[a-z]/.test(form.password),
    },
    {
      label: "Un número",
      valid: /[0-9]/.test(form.password),
    },
    {
      label: "Máximo 72 bytes",
      valid:
        form.password.length > 0 &&
        new TextEncoder().encode(
          form.password
        ).length <= 72,
    },
  ];

  // ===================================================
  // CERRAR FORMULARIO
  // ===================================================

  function handleClose() {
    if (!saving) {
      onClose();
    }
  }

  // ===================================================
  // GUARDAR USUARIO
  // ===================================================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setError(null);

    const validationErrors = validateForm(form);

    setFieldErrors(validationErrors);

    if (
      Object.keys(validationErrors).length > 0
    ) {
      return;
    }

    setSaving(true);

    try {
      const response =
        await createAdministrationUser({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          password_confirmation:
            form.password_confirmation,
        });

      setForm({ ...EMPTY_FORM });

      onSaved(response.data);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 422) {
          setFieldErrors(
            extractValidationErrors(err.details)
          );

          setError(
            "Revisa los datos proporcionados."
          );
        } else if (err.status === 403) {
          setError(
            "No tienes permisos para crear usuarios."
          );
        } else if (err.status === 409) {
          setError(
            err.message ||
              "Existe un conflicto con el registro."
          );
        } else {
          setError(err.message);
        }
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "No fue posible crear el usuario."
        );
      }
    } finally {
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
          Nuevo usuario
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={3}>
            <Typography
              variant="body2"
              sx={{ color: "#81909D" }}
            >
              Registra un nuevo usuario en la
              organización actual.
            </Typography>

            {error && (
              <Alert severity="error">
                {error}
              </Alert>
            )}

            {/* NOMBRE */}

            <TextField
              fullWidth
              required
              label="Nombre completo"
              value={form.name}
              onChange={(event) =>
                updateField(
                  "name",
                  event.target.value
                )
              }
              error={Boolean(fieldErrors.name)}
              helperText={fieldErrors.name}
              disabled={saving}
              autoComplete="off"
              slotProps={{
                htmlInput: {
                  maxLength: 150,
                },
              }}
            />

            {/* CORREO */}

            <TextField
              fullWidth
              required
              type="email"
              label="Correo electrónico"
              value={form.email}
              onChange={(event) =>
                updateField(
                  "email",
                  event.target.value
                )
              }
              error={Boolean(fieldErrors.email)}
              helperText={fieldErrors.email}
              disabled={saving}
              autoComplete="off"
              slotProps={{
                htmlInput: {
                  maxLength: 255,
                },
              }}
            />

            {/* CONTRASEÑA */}

            <TextField
              fullWidth
              required
              label="Contraseña"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              value={form.password}
              onChange={(event) =>
                updateField(
                  "password",
                  event.target.value
                )
              }
              error={Boolean(
                fieldErrors.password
              )}
              helperText={fieldErrors.password}
              disabled={saving}
              autoComplete="new-password"
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        edge="end"
                        disabled={saving}
                        aria-label={
                          showPassword
                            ? "Ocultar contraseña"
                            : "Mostrar contraseña"
                        }
                        onClick={() =>
                          setShowPassword(
                            (current) => !current
                          )
                        }
                      >
                        {showPassword ? (
                          <VisibilityOff />
                        ) : (
                          <Visibility />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            {/* REQUISITOS */}

            <Box
              sx={{
                backgroundColor: "#F4F7FA",
                borderRadius: 2,
                p: 2,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  color: "#16324F",
                }}
              >
                Requisitos de contraseña
              </Typography>

              <Stack
                spacing={0.75}
                sx={{ mt: 1 }}
              >
                {passwordRequirements.map(
                  (requirement) => (
                    <Stack
                      key={requirement.label}
                      direction="row"
                      spacing={1}
                      sx={{
                        alignItems: "center",
                      }}
                    >
                      {requirement.valid ? (
                        <CheckCircle
                          color="success"
                          fontSize="small"
                        />
                      ) : (
                        <Box
                          sx={{
                            width: 14,
                            height: 14,
                            mx: "3px",
                            flexShrink: 0,
                            border: "1px solid",
                            borderColor:
                              "text.secondary",
                            borderRadius: "50%",
                          }}
                        />
                      )}

                      <Typography
                        variant="body2"
                        sx={{
                          color: requirement.valid
                            ? "success.main"
                            : "text.secondary",
                        }}
                      >
                        {requirement.label}
                      </Typography>
                    </Stack>
                  )
                )}
              </Stack>
            </Box>

            {/* CONFIRMACIÓN */}

            <TextField
              fullWidth
              required
              label="Confirmar contraseña"
              type={
                showConfirmation
                  ? "text"
                  : "password"
              }
              value={
                form.password_confirmation
              }
              onChange={(event) =>
                updateField(
                  "password_confirmation",
                  event.target.value
                )
              }
              error={Boolean(
                fieldErrors.password_confirmation
              )}
              helperText={
                fieldErrors.password_confirmation
              }
              disabled={saving}
              autoComplete="new-password"
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        edge="end"
                        disabled={saving}
                        aria-label={
                          showConfirmation
                            ? "Ocultar confirmación"
                            : "Mostrar confirmación"
                        }
                        onClick={() =>
                          setShowConfirmation(
                            (current) => !current
                          )
                        }
                      >
                        {showConfirmation ? (
                          <VisibilityOff />
                        ) : (
                          <Visibility />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Alert severity="info">
              Los roles del usuario se podrán
              asignar después de completar
              su registro.
            </Alert>
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
            disabled={saving}
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
              ? "Creando usuario..."
              : "Crear usuario"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
