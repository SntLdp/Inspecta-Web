
import { useEffect, useState } from "react";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Stack,
  Typography,
} from "@mui/material";

import {
  Business,
  Refresh,
  InfoOutlined,
} from "@mui/icons-material";

import {
  getOrganizations,
  getSelectedOrganizationId,
} from "../services/organizations.service";

import type {
  Organization,
} from "../services/organizations.service";

// =====================================================
// CAMPO DE INFORMACIÓN
// =====================================================

interface OrganizationFieldProps {
  label: string;
  value: string;
}

function OrganizationField({
  label,
  value,
}: OrganizationFieldProps) {
  return (
    <Box
      sx={{
        p: 2,
        height: "100%",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        backgroundColor: "background.default",
      }}
    >
      <Typography
        variant="body2"
        sx={{
          color: "text.secondary",
          mb: 0.75,
        }}
      >
        {label}
      </Typography>

      <Typography
        variant="body1"
        sx={{
          fontWeight: 600,
          color: "#16324F",
          overflowWrap: "anywhere",
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export default function ConfigurationAdministration() {
  const [organization, setOrganization] =
    useState<Organization | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [refreshVersion, setRefreshVersion] =
    useState(0);

  const organizationId =
    getSelectedOrganizationId();

  // =================================================
  // CONSULTAR ORGANIZACIÓN ACTUAL
  // =================================================

  useEffect(() => {
    const controller = new AbortController();

    async function loadOrganization() {
      setLoading(true);
      setError(null);
      setOrganization(null);

      try {
        if (!organizationId) {
          throw new Error(
            "No hay una organización seleccionada."
          );
        }

        const organizations = await getOrganizations(
          controller.signal
        );

        if (controller.signal.aborted) {
          return;
        }

        const currentOrganization =
          organizations.find(
            (item) => item.id === organizationId
          );

        if (!currentOrganization) {
          throw new Error(
            "No fue posible encontrar la organización seleccionada."
          );
        }

        setOrganization(currentOrganization);
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "No fue posible consultar la organización."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadOrganization();

    return () => controller.abort();
  }, [organizationId, refreshVersion]);

  function refresh() {
    setRefreshVersion(
      (current) => current + 1
    );
  }

  function getOrganizationType(type: string): string {
    switch (type) {
      case "client":
        return "Cliente";

      case "operator":
        return "Operadora";

      default:
        return type;
    }
  }

  // =================================================
  // INTERFAZ
  // =================================================

  return (
    <Stack spacing={3}>
      {/* ENCABEZADO */}

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        sx={{
          justifyContent: "space-between",
          alignItems: {
            xs: "stretch",
            md: "center",
          },
        }}
      >
        <Box>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              color: "#16324F",
            }}
          >
            Organización
          </Typography>

          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
            }}
          >
            Consulta la información general de tu
            organización actual.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={
            loading ? (
              <CircularProgress
                size={18}
                color="inherit"
              />
            ) : (
              <Refresh />
            )
          }
          onClick={refresh}
          disabled={loading}
          sx={{
            textTransform: "none",
          }}
        >
          Actualizar
        </Button>
      </Stack>

      {/* ESTADO DE CARGA */}

      {loading ? (
        <Stack
          spacing={2}
          sx={{
            alignItems: "center",
            py: 5,
          }}
        >
          <CircularProgress size={32} />

          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
            }}
          >
            Cargando información de la organización...
          </Typography>
        </Stack>
      ) : error ? (
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={refresh}
            >
              Reintentar
            </Button>
          }
        >
          {error}
        </Alert>
      ) : organization ? (
        <>
          {/* INFORMACIÓN GENERAL */}

          <Card
            variant="outlined"
            sx={{
              boxShadow: "none",
            }}
          >
            <CardContent
              sx={{
                p: { xs: 2, md: 3 },
              }}
            >
              <Stack spacing={3}>
                <Stack
                  direction="row"
                  spacing={2}
                  sx={{
                    alignItems: "center",
                  }}
                >
                  <Box
                    sx={{
                      width: 52,
                      height: 52,
                      flexShrink: 0,
                      borderRadius: 2,
                      backgroundColor: "#E8F0F6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Business
                      sx={{
                        color: "#16324F",
                        fontSize: 28,
                      }}
                    />
                  </Box>

                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 700,
                        color: "#16324F",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {organization.name}
                    </Typography>

                    <Typography
                      variant="body2"
                      sx={{
                        color: "text.secondary",
                      }}
                    >
                      Organización actual
                    </Typography>
                  </Box>

                  <Chip
                    label={
                      organization.status
                        ? "Activa"
                        : "Inactiva"
                    }
                    color={
                      organization.status
                        ? "success"
                        : "default"
                    }
                    size="small"
                  />
                </Stack>

                <Divider />

                <Grid container spacing={2}>
                  <Grid
                    size={{ xs: 12, md: 6 }}
                  >
                    <OrganizationField
                      label="Nombre de la organización"
                      value={organization.name}
                    />
                  </Grid>

                  <Grid
                    size={{ xs: 12, md: 6 }}
                  >
                    <OrganizationField
                      label="Código de organización"
                      value={organization.code}
                    />
                  </Grid>

                  <Grid
                    size={{ xs: 12, md: 6 }}
                  >
                    <OrganizationField
                      label="Tipo de organización"
                      value={getOrganizationType(
                        organization.type
                      )}
                    />
                  </Grid>

                  <Grid
                    size={{ xs: 12, md: 6 }}
                  >
                    <OrganizationField
                      label="Estado de la organización"
                      value={
                        organization.status
                          ? "Activa"
                          : "Inactiva"
                      }
                    />
                  </Grid>
                </Grid>
              </Stack>
            </CardContent>
          </Card>

          {/* INFORMACIÓN ADMINISTRATIVA */}

          <Alert
            severity="info"
            icon={<InfoOutlined />}
            variant="outlined"
          >
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                mb: 0.5,
              }}
            >
              Información de solo lectura
            </Typography>

            <Typography variant="body2">
              Los datos generales de la organización
              no pueden modificarse desde este módulo.
              La administración de usuarios, roles,
              permisos y ubicaciones se realiza desde
              sus respectivas pestañas, de acuerdo
              con tus permisos asignados.
            </Typography>
          </Alert>
        </>
      ) : (
        <Alert severity="warning">
          No hay información disponible de la
          organización seleccionada.
        </Alert>
      )}
    </Stack>
  );
}
