import { useEffect, useState } from "react";
import {
  useNavigate,
  useSearchParams,
  useLocation,
} from "react-router-dom";

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Typography,
} from "@mui/material";

import {
  getOrganizations,
  getSelectedOrganizationId,
  selectOrganization,
  unselectOrganization,
  type Organization,
} from "../services/organizations.service";

import { logout } from "../services/auth.service";

import {
  clearSession,
  getAuthToken,
} from "../api/client";

export default function SeleccionOrganizacion() {
  const navigate = useNavigate();
  const location = useLocation();

  const [searchParams] = useSearchParams();

  const mode = searchParams.get("mode");

  const isSwitchMode = mode === "switch";
  const isRecoveryMode = mode === "recovery";

  const accessMessage =
    typeof location.state?.accessMessage === "string"
      ? location.state.accessMessage
      : null;

  const [currentOrganizationId] = useState(
    getSelectedOrganizationId
  );

  const [organizations, setOrganizations] =
    useState<Organization[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);

  const currentOrganization = organizations.find(
    (organization) =>
      organization.id === currentOrganizationId
  );

  const canCancel =
    isSwitchMode &&
    !loading &&
    !error &&
    Boolean(currentOrganization);

  /* =====================================================
     CARGAR ORGANIZACIONES DISPONIBLES
     ===================================================== */

  useEffect(() => {
    let cancelled = false;

    async function loadOrganizations() {
      setLoading(true);
      setError("");
      setOrganizations([]);

      try {
        const result = await getOrganizations();

        if (cancelled) return;

        setOrganizations(result);

        // Eliminar una selección que ya no está disponible.
        const selectedId = getSelectedOrganizationId();

        if (
          selectedId &&
          !result.some(
            (organization) =>
              organization.id === selectedId
          )
        ) {
          unselectOrganization();
        }

        // Selección automática únicamente después del login.
        if (
          !isSwitchMode &&
          !isRecoveryMode &&
          result.length === 1
        ) {
          selectOrganization(result[0]);

          navigate("/dashboard", {
            replace: true,
          });
        }
      } catch (err) {
        if (cancelled) return;

        // La sesión pudo haber expirado.
        if (!getAuthToken()) {
          navigate("/login", {
            replace: true,
          });

          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "No fue posible consultar las organizaciones."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadOrganizations();

    return () => {
      cancelled = true;
    };
  }, [
    navigate,
    isSwitchMode,
    isRecoveryMode,
    reloadKey,
  ]);

  /* =====================================================
     SELECCIONAR ORGANIZACIÓN
     ===================================================== */

  const handleSelect = (organization: Organization) => {
    if (loading || error || loggingOut) {
      return;
    }

    const availableOrganization = organizations.find(
      (item) => item.id === organization.id
    );

    if (!availableOrganization) {
      setError(
        "La organización seleccionada no está disponible."
      );

      return;
    }

    if (!getAuthToken()) {
      navigate("/login", {
        replace: true,
      });

      return;
    }

    selectOrganization(availableOrganization);

    navigate("/dashboard", {
      replace: true,
    });
  };

  /* =====================================================
     CANCELAR CAMBIO DE ORGANIZACIÓN
     ===================================================== */

  const handleCancel = () => {
    if (!canCancel || !currentOrganization || loggingOut) {
      return;
    }

    handleSelect(currentOrganization);
  };

  /* =====================================================
     REINTENTAR CONSULTA
     ===================================================== */

  const handleRetry = () => {
    setReloadKey((previous) => previous + 1);
  };

  /* =====================================================
     CERRAR SESIÓN
     ===================================================== */

  const handleLogout = async () => {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    try {
      await logout();
    } catch {
      clearSession();
    } finally {
      navigate("/login", {
        replace: true,
      });
    }
  };

  /* =====================================================
     INTERFAZ
     ===================================================== */

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#F4F7FA",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 3,
      }}
    >
      <Paper
        elevation={2}
        sx={{
          width: "100%",
          maxWidth: 520,
          p: {
            xs: 3,
            sm: 4,
          },
          borderRadius: 2,
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            color: "#16324F",
            mb: 2,
          }}
        >
          {isSwitchMode
            ? "Cambiar organización"
            : "Seleccionar organización"}
        </Typography>

        <Typography
          color="text.secondary"
          sx={{ mb: 3 }}
        >
          {isRecoveryMode
            ? "Selecciona una organización disponible para continuar utilizando Inspecta."
            : isSwitchMode
              ? "Selecciona la organización con la que deseas continuar trabajando."
              : "Selecciona la organización con la que deseas trabajar en Inspecta."}
        </Typography>

        {isRecoveryMode && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            {accessMessage ??
              "Ya no tienes acceso a la organización anterior. Selecciona otra organización para continuar."}
          </Alert>
        )}

        {/* ESTADO DE CARGA */}

        {loading && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              py: 4,
            }}
          >
            <CircularProgress />
          </Box>
        )}

        {/* ERROR DE CONSULTA */}

        {!loading && error && (
          <Alert
            severity="error"
            sx={{ mb: 2 }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={handleRetry}
                disabled={loggingOut}
              >
                Reintentar
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        {/* SIN ORGANIZACIONES DISPONIBLES */}

        {!loading &&
          !error &&
          organizations.length === 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Tu usuario no tiene organizaciones activas
              disponibles. Contacta al administrador para
              revisar tu membresía.
            </Alert>
          )}

        {/* ORGANIZACIÓN ANTERIOR NO DISPONIBLE */}

        {isSwitchMode &&
          !loading &&
          !error &&
          currentOrganizationId &&
          !currentOrganization &&
          organizations.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Ya no tienes acceso a la organización anterior.
              Selecciona otra organización para continuar.
            </Alert>
          )}

        {/* UNA SOLA ORGANIZACIÓN */}

        {isSwitchMode &&
          !loading &&
          !error &&
          organizations.length === 1 &&
          currentOrganization && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Actualmente solo tienes acceso a una
              organización.
            </Alert>
          )}

        {/* LISTA DE ORGANIZACIONES */}

        {!loading &&
          !error &&
          organizations.map((organization) => {
            const isCurrent =
              isSwitchMode &&
              organization.id === currentOrganizationId;

            return (
              <Button
                key={organization.id}
                variant="outlined"
                fullWidth
                disabled={loggingOut}
                onClick={() => handleSelect(organization)}
                sx={{
                  mb: 1.5,
                  py: 1.5,
                  px: 2,
                  justifyContent: "space-between",
                  textAlign: "left",
                  textTransform: "none",
                  gap: 2,
                  borderColor: isCurrent
                    ? "#0F9D8A"
                    : "#DCE6EE",
                  bgcolor: isCurrent
                    ? "rgba(15, 157, 138, .06)"
                    : "transparent",
                  color: "#16324F",

                  "&:hover": {
                    borderColor: "#0F9D8A",
                    bgcolor: "rgba(15, 157, 138, .09)",
                  },
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontWeight: 700,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {organization.name}
                  </Typography>

                  {organization.code && (
                    <Typography
                      variant="caption"
                      sx={{
                        display: "block",
                        color: "text.secondary",
                      }}
                    >
                      Código: {organization.code}
                    </Typography>
                  )}
                </Box>

                {isCurrent && (
                  <Chip
                    label="Actual"
                    size="small"
                    sx={{
                      flexShrink: 0,
                      bgcolor: "rgba(15, 157, 138, .12)",
                      color: "#087F70",
                      fontWeight: 600,
                    }}
                  />
                )}
              </Button>
            );
          })}

        {/* CANCELAR CAMBIO */}

        {canCancel && (
          <Button
            variant="outlined"
            fullWidth
            disabled={loggingOut}
            onClick={handleCancel}
            sx={{
              mt: 2,
              borderColor: "#DCE6EE",
              color: "#16324F",
              textTransform: "none",
            }}
          >
            Cancelar cambio
          </Button>
        )}

        {/* CERRAR SESIÓN */}

        <Button
          fullWidth
          color="inherit"
          disabled={loggingOut}
          onClick={() => void handleLogout()}
          sx={{
            mt: 2,
            textTransform: "none",
          }}
        >
          {loggingOut
            ? "Cerrando sesión..."
            : "Cerrar sesión"}
        </Button>
      </Paper>
    </Box>
  );
}