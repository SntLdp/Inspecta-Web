import {
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  FormEvent,
} from "react";

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import {
  CheckCircle,
  RadioButtonUnchecked,
  Lock,
  RestartAlt,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";

import {
  updateProfilePassword,
  getProfileValidationErrors,
  getProfileErrorMessage,
  isProfileRequestAborted,
} from "../../services/profile.service";

import {
  ApiError,
} from "../../api/client";

import type {
  ProfilePasswordInput,
  ProfileValidationErrors,
} from "../../types/profile.types";

/* =====================================================
   TIPOS
   ===================================================== */

interface ProfilePasswordFormProps {
  onSaved: (message: string) => void;

  onSavingChange: (
    saving: boolean
  ) => void;
}

type PasswordField = keyof ProfilePasswordInput;

interface PasswordRequirement {
  label: string;
  valid: boolean;
}

/* =====================================================
   VALORES INICIALES
   ===================================================== */

const INITIAL_FORM: ProfilePasswordInput = {
  current_password: "",
  password: "",
  password_confirmation: "",
};

const INITIAL_VISIBILITY: Record<
  PasswordField,
  boolean
> = {
  current_password: false,
  password: false,
  password_confirmation: false,
};

/* =====================================================
   REQUISITOS DE CONTRASEÑA
   ===================================================== */

function getPasswordBytes(
  password: string
): number {
  return new TextEncoder()
    .encode(password)
    .length;
}

function getPasswordRequirements(
  password: string
): PasswordRequirement[] {
  return [
    {
      label: "Al menos 12 caracteres",
      valid: Array.from(password).length >= 12,
    },
    {
      label: "Máximo 72 bytes",
      valid:
        password.length > 0 &&
        getPasswordBytes(password) <= 72,
    },
    {
      label: "Al menos una letra mayúscula",
      valid: /\p{Lu}/u.test(password),
    },
    {
      label: "Al menos una letra minúscula",
      valid: /\p{Ll}/u.test(password),
    },
    {
      label: "Al menos un número",
      valid: /\p{N}/u.test(password),
    },
  ];
}

/* =====================================================
   VALIDACIONES LOCALES
   ===================================================== */

function validateForm(
  form: ProfilePasswordInput
): ProfileValidationErrors {
  const errors: ProfileValidationErrors = {};

  /* CONTRASEÑA ACTUAL */

  if (!form.current_password) {
    errors.current_password = [
      "La contraseña actual es obligatoria.",
    ];
  } else if (
    Array.from(form.current_password).length > 1024
  ) {
    errors.current_password = [
      "La contraseña actual supera la longitud permitida.",
    ];
  }

  /* NUEVA CONTRASEÑA */

  const passwordErrors: string[] = [];

  if (!form.password) {
    passwordErrors.push(
      "La nueva contraseña es obligatoria."
    );
  } else {
    const requirements =
      getPasswordRequirements(form.password);

    for (const requirement of requirements) {
      if (!requirement.valid) {
        passwordErrors.push(
          requirement.label + "."
        );
      }
    }

    if (form.password.includes("\0")) {
      passwordErrors.push(
        "La contraseña contiene caracteres no permitidos."
      );
    }

    if (
      form.password === form.current_password
    ) {
      passwordErrors.push(
        "La nueva contraseña debe ser diferente de la actual."
      );
    }
  }

  if (passwordErrors.length > 0) {
    errors.password = passwordErrors;
  }

  /* CONFIRMACIÓN */

  if (!form.password_confirmation) {
    errors.password_confirmation = [
      "Debes confirmar la nueva contraseña.",
    ];
  } else if (
    form.password_confirmation !== form.password
  ) {
    errors.password_confirmation = [
      "Las contraseñas no coinciden.",
    ];
  }

  return errors;
}

/* =====================================================
   COMPONENTE PRINCIPAL
   ===================================================== */

export default function ProfilePasswordForm({
  onSaved,
  onSavingChange,
}: ProfilePasswordFormProps) {
  const [form, setForm] =
    useState<ProfilePasswordInput>({
      ...INITIAL_FORM,
    });

  const [visibility, setVisibility] =
    useState<Record<PasswordField, boolean>>({
      ...INITIAL_VISIBILITY,
    });

  const [errors, setErrors] =
    useState<ProfileValidationErrors>({});

  const [generalError, setGeneralError] =
    useState<string | null>(null);

  const [saving, setSaving] =
    useState(false);

  const [retryAt, setRetryAt] =
    useState<number | null>(null);

  const [remainingSeconds, setRemainingSeconds] =
    useState(0);

  const requestRef =
    useRef<AbortController | null>(null);

  /* ===================================================
     ESTADOS DERIVADOS
     =================================================== */

  const requirements =
    getPasswordRequirements(form.password);

  const fulfilledRequirements =
    requirements.filter(
      (requirement) => requirement.valid
    ).length;

  const requirementsProgress =
    (
      fulfilledRequirements /
      requirements.length
    ) * 100;

  const passwordBytes =
    getPasswordBytes(form.password);

  const hasInput =
    Boolean(
      form.current_password ||
      form.password ||
      form.password_confirmation
    );

  const hasAllFields =
    Boolean(
      form.current_password &&
      form.password &&
      form.password_confirmation
    );

  const rateLimited =
    remainingSeconds > 0;

  const confirmationMismatch =
    Boolean(form.password_confirmation) &&
    form.password_confirmation !== form.password;

  const samePassword =
    Boolean(form.password) &&
    form.password === form.current_password;

  /* ===================================================
     CANCELAR SOLICITUD AL DESMONTAR
     =================================================== */

  useEffect(() => {
    return () => {
      requestRef.current?.abort();
      requestRef.current = null;
    };
  }, []);

  /* ===================================================
     CONTADOR DE RATE LIMITING
     =================================================== */

  useEffect(() => {
    if (retryAt === null) {
      return;
    }

    function updateRemainingTime() {
      const remaining = Math.max(
        0,
        Math.ceil(
          (retryAt! - Date.now()) / 1000
        )
      );

      setRemainingSeconds(remaining);

      if (remaining === 0) {
        setRetryAt(null);
      }
    }

    updateRemainingTime();

    const interval = window.setInterval(
      updateRemainingTime,
      1000
    );

    return () => {
      window.clearInterval(interval);
    };
  }, [retryAt]);

  /* ===================================================
     MODIFICAR CAMPOS
     =================================================== */

  function handleChange(
    field: PasswordField,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setErrors((current) => {
      const next = { ...current };

      delete next[field];

      if (field === "password") {
        delete next.password_confirmation;
      }

      if (field === "current_password") {
        delete next.password;
      }

      return next;
    });

    setGeneralError(null);
  }

  /* ===================================================
     VISIBILIDAD DE CONTRASEÑAS
     =================================================== */

  function toggleVisibility(
    field: PasswordField
  ) {
    setVisibility((current) => ({
      ...current,
      [field]: !current[field],
    }));
  }

  /* ===================================================
     LIMPIAR CREDENCIALES
     =================================================== */

  function clearCredentials() {
    setForm({
      ...INITIAL_FORM,
    });

    setVisibility({
      ...INITIAL_VISIBILITY,
    });
  }

  function handleReset() {
    if (requestRef.current) {
      return;
    }

    clearCredentials();
    setErrors({});
    setGeneralError(null);
  }

  /* ===================================================
     ACTIVAR ESPERA POR RATE LIMITING
     =================================================== */

  function activateRateLimit() {
    const seconds = 60;

    setRemainingSeconds(seconds);

    setRetryAt(
      Date.now() + seconds * 1000
    );
  }

  /* ===================================================
     CAMBIAR CONTRASEÑA
     =================================================== */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      saving ||
      rateLimited ||
      requestRef.current
    ) {
      return;
    }

    setErrors({});
    setGeneralError(null);

    const validationErrors =
      validateForm(form);

    if (
      Object.keys(validationErrors).length > 0
    ) {
      setErrors(validationErrors);
      return;
    }

    const controller =
      new AbortController();

    requestRef.current = controller;

    setSaving(true);
    onSavingChange(true);

    try {
      /*
       * No aplicar trim() a las contraseñas.
       *
       * Los espacios pueden formar parte
       * de las credenciales del usuario.
       */

      const payload: ProfilePasswordInput = {
        current_password:
          form.current_password,

        password:
          form.password,

        password_confirmation:
          form.password_confirmation,
      };

      const response =
        await updateProfilePassword(
          payload,
          controller.signal
        );

      if (controller.signal.aborted) {
        return;
      }

      clearCredentials();

      setErrors({});
      setGeneralError(null);

      onSaved(response.message);
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

      if (
        error instanceof ApiError &&
        error.status === 429
      ) {
        activateRateLimit();
      }

      /*
       * Limpiar todas las credenciales
       * después de una solicitud fallida.
       */

      clearCredentials();
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;

        setSaving(false);
        onSavingChange(false);
      }
    }
  }

  /* ===================================================
     ADORNOS DE VISIBILIDAD
     =================================================== */

  function passwordAdornment(
    field: PasswordField,
    label: string
  ) {
    return (
      <InputAdornment position="end">
        <IconButton
          edge="end"
          type="button"
          disabled={saving}
          aria-label={
            visibility[field]
              ? `Ocultar ${label}`
              : `Mostrar ${label}`
          }
          aria-pressed={visibility[field]}
          onClick={() =>
            toggleVisibility(field)
          }
          onMouseDown={(event) =>
            event.preventDefault()
          }
        >
          {visibility[field]
            ? <VisibilityOff />
            : <Visibility />}
        </IconButton>
      </InputAdornment>
    );
  }

  /* ===================================================
     INTERFAZ
     =================================================== */

  return (
    <Box
      component="form"
      noValidate
      onSubmit={handleSubmit}
      aria-busy={saving}
    >
      <Stack spacing={3}>
        {/* ENCABEZADO */}

        <Box>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              color: "#16324F",
            }}
          >
            Cambiar contraseña
          </Typography>

          <Typography
            variant="body2"
            sx={{
              color: "#81909D",
              mt: 0.5,
            }}
          >
            Actualiza las credenciales de
            acceso a tu cuenta de INSPECTA.
          </Typography>
        </Box>

        <Divider />

        {/* ERROR GENERAL */}

        {generalError && (
          <Alert
            severity="error"
            onClose={() =>
              setGeneralError(null)
            }
          >
            {generalError}
          </Alert>
        )}

        {/* RATE LIMITING */}

        {rateLimited && (
          <Alert severity="warning">
            Has alcanzado el límite de
            solicitudes. Podrás volver a
            intentarlo en aproximadamente{" "}
            <strong>
              {remainingSeconds} segundos.
            </strong>
          </Alert>
        )}

        {/* CONTRASEÑA ACTUAL */}

        <Grid container spacing={3}>
          <Grid
            size={{
              xs: 12,
              md: 6,
            }}
          >
            <TextField
              fullWidth
              required
              label="Contraseña actual"
              name="current_password"
              type={
                visibility.current_password
                  ? "text"
                  : "password"
              }
              autoComplete="current-password"
              value={form.current_password}
              disabled={saving || rateLimited}
              error={Boolean(
                errors.current_password?.length
              )}
              helperText={
                errors.current_password?.join(" ") ??
                "Introduce tu contraseña actual."
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
                  endAdornment:
                    passwordAdornment(
                      "current_password",
                      "contraseña actual"
                    ),
                },
              }}
            />
          </Grid>
        </Grid>

        {/* NUEVA CONTRASEÑA Y CONFIRMACIÓN */}

        <Grid container spacing={3}>
          <Grid
            size={{
              xs: 12,
              md: 6,
            }}
          >
            <Stack spacing={2}>
              <TextField
                fullWidth
                required
                label="Nueva contraseña"
                name="password"
                type={
                  visibility.password
                    ? "text"
                    : "password"
                }
                autoComplete="new-password"
                value={form.password}
                disabled={saving || rateLimited}
                error={
                  Boolean(errors.password?.length) ||
                  passwordBytes > 72 ||
                  samePassword
                }
                helperText={
                  errors.password?.join(" ") ??
                  (
                    samePassword
                      ? "Debe ser diferente de la contraseña actual."
                      : `${passwordBytes} / 72 bytes`
                  )
                }
                onChange={(event) =>
                  handleChange(
                    "password",
                    event.target.value
                  )
                }
                slotProps={{
                  input: {
                    endAdornment:
                      passwordAdornment(
                        "password",
                        "nueva contraseña"
                      ),
                  },
                }}
              />

              {/* REQUISITOS DINÁMICOS */}

              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderColor: "#DCE6EE",
                  bgcolor: "#F8FAFC",
                }}
              >
                <Stack spacing={1.5}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: "#16324F",
                    }}
                  >
                    Requisitos de la contraseña
                  </Typography>

                  <LinearProgress
                    variant="determinate"
                    value={requirementsProgress}
                    color={
                      fulfilledRequirements ===
                      requirements.length
                        ? "success"
                        : "primary"
                    }
                    sx={{
                      height: 6,
                      borderRadius: 3,
                    }}
                  />

                  {requirements.map(
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
                            sx={{
                              fontSize: 18,
                              color: "success.main",
                            }}
                          />
                        ) : (
                          <RadioButtonUnchecked
                            sx={{
                              fontSize: 18,
                              color: "text.disabled",
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

                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                    }}
                  >
                    {fulfilledRequirements} de{" "}
                    {requirements.length} requisitos
                    cumplidos.
                  </Typography>
                </Stack>
              </Paper>
            </Stack>
          </Grid>

          {/* CONFIRMAR CONTRASEÑA */}

          <Grid
            size={{
              xs: 12,
              md: 6,
            }}
          >
            <TextField
              fullWidth
              required
              label="Confirmar nueva contraseña"
              name="password_confirmation"
              type={
                visibility.password_confirmation
                  ? "text"
                  : "password"
              }
              autoComplete="new-password"
              value={form.password_confirmation}
              disabled={saving || rateLimited}
              error={
                Boolean(
                  errors.password_confirmation?.length
                ) ||
                confirmationMismatch
              }
              helperText={
                errors.password_confirmation?.join(" ") ??
                (
                  confirmationMismatch
                    ? "Las contraseñas no coinciden."
                    : form.password_confirmation &&
                      form.password_confirmation ===
                        form.password
                      ? "Las contraseñas coinciden."
                      : "Repite la nueva contraseña."
                )
              }
              onChange={(event) =>
                handleChange(
                  "password_confirmation",
                  event.target.value
                )
              }
              slotProps={{
                input: {
                  endAdornment:
                    passwordAdornment(
                      "password_confirmation",
                      "confirmación de contraseña"
                    ),
                },
              }}
            />
          </Grid>
        </Grid>

        {/* INFORMACIÓN DE SEGURIDAD */}

        <Alert severity="info">
          <Typography
            variant="body2"
            sx={{ fontWeight: 600 }}
          >
            Seguridad de tus sesiones
          </Typography>

          <Typography
            variant="body2"
            sx={{ mt: 0.5 }}
          >
            Al cambiar tu contraseña, se cerrarán
            las demás sesiones de tu cuenta en
            otros dispositivos y navegadores.
            La sesión desde la que realizas
            este cambio permanecerá activa.
          </Typography>
        </Alert>

        <Divider />

        {/* ACCIONES */}

        <Stack
          direction={{
            xs: "column",
            md: "row",
          }}
          spacing={2}
          sx={{
            justifyContent: "space-between",
            alignItems: {
              xs: "stretch",
              md: "center",
            },
          }}
        >
          <Typography
            variant="body2"
            aria-live="polite"
            sx={{
              color: "text.secondary",
            }}
          >
            {saving
              ? "Actualizando contraseña..."
              : rateLimited
                ? `Espera ${remainingSeconds} segundos.`
                : "Protege tu cuenta con una contraseña segura."}
          </Typography>

          <Stack
            direction={{
              xs: "column",
              sm: "row",
            }}
            spacing={2}
          >
            <Button
              type="button"
              variant="outlined"
              startIcon={<RestartAlt />}
              disabled={saving || !hasInput}
              onClick={handleReset}
            >
              Limpiar campos
            </Button>

            <Button
              type="submit"
              variant="contained"
              disabled={
                saving ||
                rateLimited ||
                !hasAllFields ||
                fulfilledRequirements !==
                  requirements.length ||
                confirmationMismatch ||
                samePassword ||
                form.password.includes("\0")
              }
              startIcon={
                saving
                  ? (
                    <CircularProgress
                      size={18}
                      color="inherit"
                    />
                  )
                  : <Lock />
              }
            >
              {saving
                ? "Actualizando..."
                : "Cambiar contraseña"}
            </Button>
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );
}