
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

import type {
  AdministrationUser,
} from "../types/administration";

// =====================================================
// TIPOS
// =====================================================

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
  const [tab, setTab] = useState(0);

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
  // CONSULTAR INDICADORES
  // ===================================================

  useEffect(() => {
    const controller = new AbortController();

    async function loadSummary() {
      setSummary({ ...EMPTY_SUMMARY });

      const [
        usersResult,
        activeMembershipsResult,
        areasResult,
        rolesResult,
      ] = await Promise.allSettled([
        getAdministrationUsers(
          {
            page: 1,
            perPage: 1,
          },
          controller.signal
        ),

        getAdministrationUsers(
          {
            page: 1,
            perPage: 1,
            status: "active",
          },
          controller.signal
        ),

        getLocationAreas(
          controller.signal
        ),

        getAdministrationRoles(
          {
            page: 1,
            perPage: 1,
          },
          controller.signal
        ),
      ]);

      if (controller.signal.aborted) {
        return;
      }

      setSummary({
        users:
          usersResult.status === "fulfilled"
            ? usersResult.value.meta.total
            : null,

        activeMemberships:
          activeMembershipsResult.status ===
            "fulfilled"
            ? activeMembershipsResult.value.meta.total
            : null,

        roles:
          rolesResult.status === "fulfilled"
            ? rolesResult.value.meta.total
            : null,

        areas:
          areasResult.status === "fulfilled"
            ? areasResult.value.length
            : null,
      });
    }

    void loadSummary();

    return () => controller.abort();
  }, [tab, summaryRefreshVersion]);

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

    setSummaryRefreshVersion(
      (current) => current + 1
    );

    setSuccessMessage(
      `El usuario ${user.name} se creó correctamente.`
    );
  }

  // ===================================================
  // TARJETAS DE RESUMEN
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
    },
  ];

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
            Gestiona usuarios, roles, ubicaciones
            y configuración de INSPECTA.
          </Typography>
        </Box>

        {tab === 0 && (
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
              sm: 6,
              md: 3,
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

      {/* PESTAÑAS */}

      <Card>
        <Box
          sx={{
            borderBottom:
              "1px solid #DCE6EE",
          }}
        >
          <Tabs
            value={tab}
            onChange={(_, newValue) =>
              setTab(newValue)
            }
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab
              icon={<Person />}
              iconPosition="start"
              label="Usuarios"
            />

            <Tab
              icon={<Security />}
              iconPosition="start"
              label="Roles y permisos"
            />

            <Tab
              icon={<Business />}
              iconPosition="start"
              label="Ubicaciones"
            />

            <Tab
              icon={<Settings />}
              iconPosition="start"
              label="Organización"
            />
          </Tabs>
        </Box>

        {/* USUARIOS */}

        {tab === 0 && (
          <CardContent>
            <UserAdministration
              key={`users-${usersRefreshVersion}`}
              onChanged={() =>
                setSummaryRefreshVersion(
                  (current) => current + 1
                )
              }
            />
          </CardContent>
        )}

        {/* ROLES Y PERMISOS */}

        {tab === 1 && (
          <CardContent>
            <RoleAdministration />
          </CardContent>
        )}

        {/* UBICACIONES */}

        {tab === 2 && (
          <CardContent>
            <LocationAdministration />
          </CardContent>
        )}

        {/* CONFIGURACIÓN */}

        {tab === 3 && (
          <CardContent>
            <ConfigurationAdministration />
          </CardContent>
        )}
      </Card>

      {/* FORMULARIO DE USUARIO */}

      {userFormOpen && (
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
