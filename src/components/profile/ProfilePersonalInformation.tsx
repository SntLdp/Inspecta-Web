import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import {
  RestartAlt,
  Save,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";

import {
  updateProfile,
  getProfileErrorMessage,
  getProfileValidationErrors,
  isProfileRequestAborted,
} from "../../services/profile.service";

import type {
  ProfileIdentity,
  ProfileUpdateInput,
  ProfileValidationErrors,
} from "../../types/profile.types";

interface ProfilePersonalInformationProps {
  identity: ProfileIdentity;
  onSaved: (
    identity: ProfileIdentity,
    message: string
  ) => void;
  onSavingChange: (saving: boolean) => void;
}

interface ProfileFormState {
  name: string;
  email: string;
  current_password: string;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function createInitialForm(
  identity: ProfileIdentity
): ProfileFormState {
  return {
    name: identity.name,
    email: identity.email,
    current_password: "",
  };
}

export default function ProfilePersonalInformation({
  identity,
  onSaved,
  onSavingChange,
}: ProfilePersonalInformationProps) {
  const [form, setForm] = useState<ProfileFormState>(
    () => createInitialForm(identity)
  );

  const [errors, setErrors] =
    useState<ProfileValidationErrors>({});

  const [generalError, setGeneralError] =
    useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  const [showPassword, setShowPassword] =
    useState(false);

  const requestRef =
    useRef<AbortController | null>(null);

  /*
  |--------------------------------------------------------------------------
  | Detección de cambios
  |--------------------------------------------------------------------------
  */

  const normalizedName = form.name.trim();

  const normalizedEmail = normalizeEmail(
    form.email
  );

  const nameChanged =
    normalizedName !== identity.name;

  // Si el correo no fue editado, no se modifica
  // silenciosamente una identidad existente.
  const emailChanged =
    form.email !== identity.email &&
    normalizedEmail !== identity.email;

  const hasChanges =
    nameChanged || emailChanged;

  /*
  |--------------------------------------------------------------------------
  | Sincronización del formulario
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    setForm(createInitialForm(identity));
    setErrors({});
    setGeneralError(null);
    setShowPassword(false);
  }, [identity.id, identity.name, identity.email]);

  useEffect(() => {
    return () => {
      requestRef.current?.abort();
      requestRef.current = null;
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Manejo de campos
  |--------------------------------------------------------------------------
  */

  function handleChange(
    field: keyof ProfileFormState,
    value: string
  ): void {
    setForm((current) => {
      const updated = {
        ...current,
        [field]: value,
      };

      if (
        field === "email" &&
        (
          value === identity.email ||
          normalizeEmail(value) === identity.email
        )
      ) {
        updated.current_password = "";
      }

      return updated;
    });

    setErrors((current) => {
      const updated = { ...current };

      delete updated[field];

      if (field === "email") {
        delete updated.current_password;
      }

      return updated;
    });

    if (
      field === "email" &&
      (
        value === identity.email ||
        normalizeEmail(value) === identity.email
      )
    ) {
      setShowPassword(false);
    }

    setGeneralError(null);
  }

  function handleReset(): void {
    if (saving || requestRef.current) {
      return;
    }

    setForm(createInitialForm(identity));
    setErrors({});
    setGeneralError(null);
    setShowPassword(false);
  }

  /*
  |--------------------------------------------------------------------------
  | Validación del formulario
  |--------------------------------------------------------------------------
  */

  function validateForm(): ProfileValidationErrors {
    const validationErrors: ProfileValidationErrors = {};

    if (nameChanged) {
      if (!normalizedName) {
        validationErrors.name = [
          "El nombre no puede estar vacío.",
        ];
      } else if (
        Array.from(normalizedName).length > 150
      ) {
        validationErrors.name = [
          "El nombre no puede superar los 150 caracteres.",
        ];
      }
    }

    if (emailChanged) {
      if (!normalizedEmail) {
        validationErrors.email = [
          "El correo electrónico no puede estar vacío.",
        ];
      } else if (
        Array.from(normalizedEmail).length > 255
      ) {
        validationErrors.email = [
          "El correo electrónico no puede superar los 255 caracteres.",
        ];
      } else if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          normalizedEmail
        )
      ) {
        validationErrors.email = [
          "El formato del correo electrónico no es válido.",
        ];
      }

      if (!form.current_password) {
        validationErrors.current_password = [
          "Debes proporcionar tu contraseña actual.",
        ];
      } else if (
        Array.from(form.current_password).length > 1024
      ) {
        validationErrors.current_password = [
          "La contraseña actual supera la longitud permitida.",
        ];
      }
    }

    return validationErrors;
  }

  /*
  |--------------------------------------------------------------------------
  | Actualización de identidad
  |--------------------------------------------------------------------------
  */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();

    if (
      saving ||
      requestRef.current ||
      !hasChanges
    ) {
      return;
    }

    setGeneralError(null);

    const validationErrors = validateForm();

    setErrors(validationErrors);

    if (
      Object.keys(validationErrors).length > 0
    ) {
      return;
    }

    let payload: ProfileUpdateInput;

    if (emailChanged) {
      payload = {
        email: normalizedEmail,
        current_password: form.current_password,
        ...(nameChanged
          ? { name: normalizedName }
          : {}),
      };
    } else {
      payload = {
        name: normalizedName,
      };
    }

    const controller = new AbortController();

    requestRef.current = controller;

    setSaving(true);
    onSavingChange(true);

    try {
      const response = await updateProfile(
        payload,
        controller.signal
      );

      if (controller.signal.aborted) {
        return;
      }

      setForm(
        createInitialForm(response.data)
      );

      setErrors({});
      setGeneralError(null);
      setShowPassword(false);

      onSaved(
        response.data,
        response.message
      );
    } catch (error) {
      if (
        controller.signal.aborted ||
        isProfileRequestAborted(error)
      ) {
        return;
      }

      setErrors(
        getProfileValidationErrors(error)
      );

      setGeneralError(
        getProfileErrorMessage(error)
      );

      // No conservar la contraseña después
      // de una solicitud rechazada.
      setForm((current) => ({
        ...current,
        current_password: "",
      }));

      setShowPassword(false);
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;

        setSaving(false);
        onSavingChange(false);
      }
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Interfaz
  |--------------------------------------------------------------------------
  */

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      noValidate
      aria-busy={saving}
    >
      <Stack spacing={3}>
        <Box>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: "#16324F",
            }}
          >
            Información personal
          </Typography>

          <Typography
            variant="body2"
            sx={{
              color: "#81909D",
              mt: 0.5,
            }}
          >
            Administra el nombre y correo electrónico
            asociados a tu cuenta de INSPECTA.
          </Typography>
        </Box>

        <Divider />

        {generalError && (
          <Alert severity="error">
            {generalError}
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              required
              label="Nombre completo"
              name="name"
              autoComplete="name"
              value={form.name}
              disabled={saving}
              error={Boolean(errors.name?.length)}
              helperText={
                errors.name?.[0] ??
                "Nombre visible dentro de la plataforma."
              }
              onChange={(event) =>
                handleChange(
                  "name",
                  event.target.value
                )
              }
              slotProps={{
                htmlInput: {
                  maxLength: 150,
                },
              }}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              required
              type="email"
              label="Correo electrónico"
              name="email"
              autoComplete="email"
              value={form.email}
              disabled={saving}
              error={Boolean(errors.email?.length)}
              helperText={
                errors.email?.[0] ??
                "Correo utilizado para iniciar sesión."
              }
              onChange={(event) =>
                handleChange(
                  "email",
                  event.target.value
                )
              }
              slotProps={{
                htmlInput: {
                  maxLength: 255,
                },
              }}
            />
          </Grid>
        </Grid>

        {emailChanged && (
          <Stack spacing={2}>
            <Alert severity="info">
              Para modificar tu correo electrónico,
              debes confirmar tu identidad mediante
              tu contraseña actual.
            </Alert>

            {form.email !== normalizedEmail && (
              <Typography
                variant="body2"
                sx={{
                  color: "#50799C",
                  overflowWrap: "anywhere",
                }}
              >
                El correo se guardará como:{" "}
                <strong>{normalizedEmail}</strong>
              </Typography>
            )}

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  required
                  label="Contraseña actual"
                  name="current_password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  autoComplete="current-password"
                  value={form.current_password}
                  disabled={saving}
                  error={Boolean(
                    errors.current_password?.length
                  )}
                  helperText={
                    errors.current_password?.[0] ??
                    "Confirma que eres el propietario de la cuenta."
                  }
                  onChange={(event) =>
                    handleChange(
                      "current_password",
                      event.target.value
                    )
                  }
                  slotProps={{
                    htmlInput: {
                      maxLength: 1024,
                    },
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
                            onMouseDown={(event) =>
                              event.preventDefault()
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
              </Grid>
            </Grid>

            <Typography
              variant="caption"
              sx={{ color: "#81909D" }}
            >
              Al cambiar tu correo electrónico,
              se restablecerá su estado de verificación.
            </Typography>
          </Stack>
        )}

        {!emailChanged &&
          form.email !== identity.email && (
            <Alert severity="info">
              El correo introducido corresponde a tu
              correo actual después de normalizarlo.
              No es necesario actualizarlo.
            </Alert>
          )}

        <Divider />

        <Stack
          direction={{
            xs: "column",
            sm: "row",
          }}
          spacing={2}
          sx={{
            justifyContent: "flex-end",
          }}
        >
          <Button
            type="button"
            variant="outlined"
            startIcon={<RestartAlt />}
            disabled={
              saving ||
              (
                !hasChanges &&
                form.name === identity.name &&
                form.email === identity.email
              )
            }
            onClick={handleReset}
          >
            Cancelar cambios
          </Button>

          <Button
            type="submit"
            variant="contained"
            startIcon={
              saving ? (
                <CircularProgress
                  size={18}
                  color="inherit"
                />
              ) : (
                <Save />
              )
            }
            disabled={saving || !hasChanges}
            sx={{
              backgroundColor: "#16324F",
              "&:hover": {
                backgroundColor: "#10263D",
              },
            }}
          >
            {saving
              ? "Guardando cambios..."
              : "Guardar cambios"}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}