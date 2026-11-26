
import { useEffect, useState } from "react";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";

import {
  Add,
  Business,
  Groups,
  Person,
  Security,
  Settings,
} from "@mui/icons-material";

import UserAdministration
  from "../components/UserAdministration";

import RoleAdministration
  from "../components/RoleAdministration";

import LocationAdministration
  from "../components/LocationAdministration";

import ConfigurationAdministration
  from "../components/ConfigurationAdministration";

import UserFormDialog
  from "../components/UserFormDialog";

import {
  getAdministrationUsers,
} from "../services/users.services";

import {
  getAdministrationRoles,
} from "../services/roles.service";

import {
  getLocationAreas,
} from "../services/locations.service";

import {
  useAdministrationCapabilities,
} from "../hooks/useAdministrationCapabilities";

import type {
  AdministrationUser,
} from "../types/administration";

// =====================================================
// TIPOS
// =====================================================

type AdministrationTab =
  | "users"
  | "roles"
  | "locations"
  | "organization";

interface AdministrationSummary {
  users: number | null;
  activeMemberships: number | null;
  roles: number | null;
  areas: number | null;
}

const EMPTY_SUMMARY: AdministrationSummary = {
  users: null,
  activeMemberships: null,
  roles: null,
  areas: null,
};

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export default function Administracion() {
  const {
    ready,
    canAccessAdministration,
    canViewUsers,
    canCreateUsers,
    canViewRoles,
    canViewLocations,
    canViewOrganization,
  } = useAdministrationCapabilities();

  const [selectedTab, setSelectedTab] =
    useState<AdministrationTab>("users");

  const [summary, setSummary] =
    useState<AdministrationSummary>(
      EMPTY_SUMMARY
    );

  const [userFormOpen, setUserFormOpen] =
    useState(false);

  const [usersRefreshVersion, setUsersRefreshVersion] =
    useState(0);

  const [summaryRefreshVersion, setSummaryRefreshVersion] =
    useState(0);

  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);

  // ===================================================
  // PESTAÑAS AUTORIZADAS
  // ===================================================

  const availableTabs = [
    {
      value: "users" as const,
      label: "Usuarios",
      icon: <Person />,
      visible: canViewUsers,
    },
    {
      value: "roles" as const,
      label: "Roles y permisos",
      icon: <Security />,
      visible: canViewRoles,
    },
    {
      value: "locations" as const,
      label: "Ubicaciones",
      icon: <Business />,
      visible: canViewLocations,
    },
    {
      value: "organization" as const,
      label: "Organización",
      icon: <Settings />,
      visible: canViewOrganization,
    },
  ].filter((item) => item.visible);

  // Si la pestaña seleccionada deja de estar autorizada,
  // utilizar automáticamente la primera disponible.

  const activeTab =
    availableTabs.some(
      (item) => item.value === selectedTab
    )
      ? selectedTab
      : availableTabs[0]?.value ?? null;

  useEffect(() => {
    if (
      activeTab !== null &&
      activeTab !== selectedTab
    ) {
      setSelectedTab(activeTab);
    }
  }, [
    ready,
    canAccessAdministration,
    canViewUsers,
    canViewRoles,
    canViewLocations,
    summaryRefreshVersion,
  ]);

  // ===================================================
  // CERRAR FORMULARIO SI SE PIERDE LA CAPACIDAD
  // ===================================================

  useEffect(() => {
    if (!canCreateUsers) {
      setUserFormOpen(false);
    }
  }, [canCreateUsers]);

  // ===================================================
  // CONSULTAR INDICADORES AUTORIZADOS
  // ===================================================

  useEffect(() => {
    const controller = new AbortController();

    setSummary({ ...EMPTY_SUMMARY });

    if (!ready || !canAccessAdministration) {
      return () => controller.abort();
    }

    async function loadSummary() {
      const [
        usersResult,
        activeMembershipsResult,
        areasResult,
        rolesResult,
      ] = await Promise.allSettled([
        canViewUsers
          ? getAdministrationUsers(
            {
              page: 1,
              perPage: 1,
            },
            controller.signal
          )
          : Promise.resolve(null),

        canViewUsers
          ? getAdministrationUsers(
            {
              page: 1,
              perPage: 1,
              status: "active",
            },
            controller.signal
          )
          : Promise.resolve(null),

        canViewLocations
          ? getLocationAreas(
            controller.signal
          )
          : Promise.resolve(null),

        canViewRoles
          ? getAdministrationRoles(
            {
              page: 1,
              perPage: 1,
            },
            controller.signal
          )
          : Promise.resolve(null),
      ]);

      if (controller.signal.aborted) {
        return;
      }

      setSummary({
        users:
          usersResult.status === "fulfilled"
            ? usersResult.value?.meta.total ?? null
            : null,

        activeMemberships:
          activeMembershipsResult.status ===
            "fulfilled"
            ? activeMembershipsResult.value
              ?.meta.total ?? null
            : null,

        roles:
          rolesResult.status === "fulfilled"
            ? rolesResult.value?.meta.total ?? null
            : null,

        areas:
          areasResult.status === "fulfilled"
            ? areasResult.value?.length ?? null
            : null,
      });
    }

    void loadSummary();

    return () => controller.abort();
  }, [
    ready,
    canAccessAdministration,
    canViewUsers,
    canViewRoles,
    canViewLocations,
    activeTab,
    summaryRefreshVersion,
  ]);

  // ===================================================
  // ACTUALIZAR INDICADORES
  // ===================================================

  function refreshSummary() {
    setSummaryRefreshVersion(
      (current) => current + 1
    );
  }

  // ===================================================
  // USUARIO CREADO
  // ===================================================

  function handleUserSaved(
    user: AdministrationUser
  ) {
    setUserFormOpen(false);

    setUsersRefreshVersion(
      (current) => current + 1
    );

    refreshSummary();

    setSuccessMessage(
      `El usuario ${user.name} se creó correctamente.`
    );
  }

  // ===================================================
  // TARJETAS DE RESUMEN AUTORIZADAS
  // ===================================================

  const summaryCards = [
    {
      label: "Usuarios",
      value: summary.users,
      icon: (
        <Person
          sx={{ color: "#16324F" }}
        />
      ),
      background: "#E8F0F6",
      visible: canViewUsers,
    },
    {
      label: "Membresías activas",
      value: summary.activeMemberships,
      icon: (
        <Groups
          sx={{ color: "#0F9D8A" }}
        />
      ),
      background: "#E8F5F2",
      visible: canViewUsers,
    },
    {
      label: "Roles",
      value: summary.roles,
      icon: (
        <Security
          sx={{ color: "#F2A900" }}
        />
      ),
      background: "#FFF5D9",
      visible: canViewRoles,
    },
    {
      label: "Áreas",
      value: summary.areas,
      icon: (
        <Business
          sx={{ color: "#2673C9" }}
        />
      ),
      background: "#F0F2F5",
      visible: canViewLocations,
    },
  ].filter((item) => item.visible);

  // ===================================================
  // VALIDAR ACCESO AL MÓDULO
  // ===================================================

  if (!ready) {
    return null;
  }

  if (!canAccessAdministration) {
    return (
      <section className="page-section">
        <Alert severity="warning">
          No tienes permisos para acceder al módulo
          de Administración.
        </Alert>
      </section>
    );
  }

  // ===================================================
  // INTERFAZ
  // ===================================================

  return (
    <section className="page-section">
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
          mb: 3,
        }}
      >
        <Box>
          <span className="eyebrow">
            Sistema
          </span>

          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: "#16324F",
            }}
          >
            Administración
          </Typography>

          <Typography
            variant="body1"
            sx={{
              color: "#81909D",
              mt: 0.5,
            }}
          >
            Gestiona usuarios, roles y ubicaciones,
            y consulta la información de tu organización.
          </Typography>
        </Box>

        {activeTab === "users" &&
          canCreateUsers && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() =>
                setUserFormOpen(true)
              }
            >
              Nuevo usuario
            </Button>
          )}
      </Stack>

      {/* INDICADORES */}

      {summaryCards.length > 0 && (
        <Grid
          container
          spacing={2}
          sx={{ mb: 3 }}
        >
          {summaryCards.map((item) => (
            <Grid
              key={item.label}
              size={{
                xs: 12,
                sm: summaryCards.length === 1
                  ? 12
                  : 6,
                md: 12 / summaryCards.length,
              }}
            >
              <Card>
                <CardContent>
                  <Stack
                    direction="row"
                    spacing={2}
                    sx={{
                      alignItems: "center",
                    }}
                  >
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        flexShrink: 0,
                        borderRadius: 2,
                        backgroundColor:
                          item.background,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {item.icon}
                    </Box>

                    <Box>
                      <Typography
                        variant="body2"
                        sx={{
                          color: "#81909D",
                        }}
                      >
                        {item.label}
                      </Typography>

                      <Typography
                        variant="h5"
                        sx={{
                          fontWeight: 700,
                          color: "#16324F",
                        }}
                      >
                        {item.value ?? "—"}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* PESTAÑAS */}

      <Card>
        {availableTabs.length > 0 ? (
          <>
            <Box
              sx={{
                borderBottom:
                  "1px solid #DCE6EE",
              }}
            >
              <Tabs
                value={activeTab ?? false}
                onChange={(
                  _,
                  newValue: AdministrationTab
                ) => {
                  if (
                    availableTabs.some(
                      (item) =>
                        item.value === newValue
                    )
                  ) {
                    setSelectedTab(newValue);
                  }
                }}
                variant="scrollable"
                scrollButtons="auto"
              >
                {availableTabs.map((item) => (
                  <Tab
                    key={item.value}
                    value={item.value}
                    icon={item.icon}
                    iconPosition="start"
                    label={item.label}
                  />
                ))}
              </Tabs>
            </Box>

            {/* USUARIOS */}

            {activeTab === "users" &&
              canViewUsers && (
                <CardContent>
                  <UserAdministration
                    key={`users-${usersRefreshVersion}`}
                    onChanged={refreshSummary}
                  />
                </CardContent>
              )}

            {/* ROLES Y PERMISOS */}

            {activeTab === "roles" &&
              canViewRoles && (
                <CardContent>
                  <RoleAdministration
                    onChanged={refreshSummary}
                  />
                </CardContent>
              )}

            {/* UBICACIONES */}

            {activeTab === "locations" &&
              canViewLocations && (
                <CardContent>
                  <LocationAdministration
                    onChanged={refreshSummary}
                  />
                </CardContent>
              )}

            {/* ORGANIZACIÓN */}

            {activeTab === "organization" &&
              canViewOrganization && (
                <CardContent>
                  <ConfigurationAdministration />
                </CardContent>
              )}
          </>
        ) : (
          <CardContent>
            <Alert severity="info">
              No tienes secciones administrativas
              disponibles.
            </Alert>
          </CardContent>
        )}
      </Card>

      {/* FORMULARIO DE USUARIO */}

      {userFormOpen && canCreateUsers && (
        <UserFormDialog
          onClose={() =>
            setUserFormOpen(false)
          }
          onSaved={handleUserSaved}
        />
      )}

      {/* NOTIFICACIÓN */}

      <Snackbar
        open={Boolean(successMessage)}
        autoHideDuration={5000}
        onClose={() =>
          setSuccessMessage(null)
        }
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
      >
        <Alert
          severity="success"
          onClose={() =>
            setSuccessMessage(null)
          }
          sx={{ width: "100%" }}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </section>
  );
}
