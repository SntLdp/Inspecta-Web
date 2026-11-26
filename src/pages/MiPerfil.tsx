import {
  useEffect,
  useState,
} from "react";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";

import {
  Business,
  Lock,
  Person,
  Refresh,
  Security,
} from "@mui/icons-material";

import ProfileHeader
  from "../components/profile/ProfileHeader";

import ProfilePersonalInformation
  from "../components/profile/ProfilePersonalInformation";

import ProfilePasswordForm
  from "../components/profile/ProfilePasswordForm";

import ProfileOrganizationAccess
  from "../components/profile/ProfileOrganizationAccess";

import ProfileAssignedLocations
  from "../components/profile/ProfileAssignedLocations";

import {
  getProfile,
  getProfileMembership,
  getProfileErrorMessage,
  isProfileRequestAborted,
} from "../services/profile.service";

import {
  useOrganization,
} from "../contexts/OrganizationContext";

import {
  useAuthUser,
} from "../hooks/useAuthUser";

import type {
  ProfileIdentity,
  ProfileMembership,
} from "../types/profile.types";

/* =====================================================
   TIPOS
   ===================================================== */

type ProfileTab =
  | "personal"
  | "security"
  | "access"
  | "locations";

/* =====================================================
   PESTAÑAS
   ===================================================== */

const PROFILE_TABS = [
  {
    value: "personal" as const,
    label: "Información personal",
    icon: <Person />,
  },
  {
    value: "security" as const,
    label: "Seguridad",
    icon: <Lock />,
  },
  {
    value: "access" as const,
    label: "Accesos",
    icon: <Security />,
  },
  {
    value: "locations" as const,
    label: "Ubicaciones",
    icon: <Business />,
  },
];

/* =====================================================
   COMPONENTE PRINCIPAL
   ===================================================== */

export default function MiPerfil() {
  const authUser = useAuthUser();

  const {
    organization,
    loading: organizationLoading,
  } = useOrganization();

  const organizationId =
    organization?.id ?? null;

  const userId =
    authUser?.id ?? null;

  /* ===================================================
     ESTADOS
     =================================================== */

  const [selectedTab, setSelectedTab] =
    useState<ProfileTab>("personal");

  const [identity, setIdentity] =
    useState<ProfileIdentity | null>(null);

  const [membership, setMembership] =
    useState<ProfileMembership | null>(null);

  const [membershipUserId, setMembershipUserId] =
    useState<string | null>(null);

  const [identityLoading, setIdentityLoading] =
    useState(true);

  const [membershipLoading, setMembershipLoading] =
    useState(true);

  const [identityError, setIdentityError] =
    useState<string | null>(null);

  const [membershipError, setMembershipError] =
    useState<string | null>(null);

  const [
    identityRefreshVersion,
    setIdentityRefreshVersion,
  ] = useState(0);

  const [
    membershipRefreshVersion,
    setMembershipRefreshVersion,
  ] = useState(0);

  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);

  const [profileSaving, setProfileSaving] =
    useState(false);

  /* ===================================================
     CONSULTAR IDENTIDAD GLOBAL
     =================================================== */

  useEffect(() => {
    const controller = new AbortController();

    setIdentity(null);
    setIdentityError(null);
    setIdentityLoading(true);
    setProfileSaving(false);

    if (!userId) {
      setIdentityLoading(false);

      return () => controller.abort();
    }

    async function loadIdentity() {
      try {
        const result = await getProfile(
          controller.signal
        );

        if (controller.signal.aborted) {
          return;
        }

        setIdentity(result);
      } catch (error) {
        if (
          controller.signal.aborted ||
          isProfileRequestAborted(error)
        ) {
          return;
        }

        setIdentityError(
          getProfileErrorMessage(error)
        );
      } finally {
        if (!controller.signal.aborted) {
          setIdentityLoading(false);
        }
      }
    }

    void loadIdentity();

    return () => controller.abort();
  }, [
    userId,
    identityRefreshVersion,
  ]);

  /* ===================================================
     CONSULTAR MEMBRESÍA ORGANIZACIONAL
     =================================================== */

  useEffect(() => {
    const controller = new AbortController();

    setMembership(null);
    setMembershipUserId(null);
    setMembershipError(null);
    setMembershipLoading(true);

    if (organizationLoading) {
      return () => controller.abort();
    }

    if (!userId || !organizationId) {
      setMembershipLoading(false);

      return () => controller.abort();
    }

    async function loadMembership() {
      try {
        const result =
          await getProfileMembership(
            controller.signal
          );

        if (controller.signal.aborted) {
          return;
        }

        setMembership(result);
        setMembershipUserId(userId);
      } catch (error) {
        if (
          controller.signal.aborted ||
          isProfileRequestAborted(error)
        ) {
          return;
        }

        setMembershipError(
          getProfileErrorMessage(error)
        );
      } finally {
        if (!controller.signal.aborted) {
          setMembershipLoading(false);
        }
      }
    }

    void loadMembership();

    return () => controller.abort();
  }, [
    userId,
    organizationId,
    organizationLoading,
    membershipRefreshVersion,
  ]);

  /* ===================================================
     VALIDAR CONTEXTO DE LOS DATOS
     =================================================== */

  const currentIdentity =
    identity?.id === userId
      ? identity
      : null;

  const currentMembership =
    !organizationLoading &&
    membershipUserId === userId &&
    membership?.organization.id === organizationId
      ? membership
      : null;

  /* ===================================================
     ACTUALIZAR INFORMACIÓN
     =================================================== */

  function refreshProfile() {
    if (profileSaving) {
      return;
    }

    setIdentityRefreshVersion(
      (current) => current + 1
    );

    setMembershipRefreshVersion(
      (current) => current + 1
    );
  }

  /* ===================================================
     INFORMACIÓN PERSONAL ACTUALIZADA
     =================================================== */

  function handleProfileSaved(
    updatedIdentity: ProfileIdentity,
    message: string
  ) {
    if (updatedIdentity.id !== userId) {
      return;
    }

    setIdentity(updatedIdentity);
    setSuccessMessage(message);
  }

  /* ===================================================
     CONTRASEÑA ACTUALIZADA
     =================================================== */

  function handlePasswordSaved(
    message: string
  ) {
    setSuccessMessage(message);
  }

  /* ===================================================
     VALIDAR SESIÓN
     =================================================== */

  if (!authUser) {
    return (
      <section className="page-section">
        <Alert severity="warning">
          No hay una sesión de usuario disponible.
        </Alert>
      </section>
    );
  }

  /* ===================================================
     INTERFAZ
     =================================================== */

  return (
    <section className="page-section">
      {/* ENCABEZADO */}

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
          mb: 3,
        }}
      >
        <Box>
          <span className="eyebrow">
            Cuenta
          </span>

          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: "#16324F",
            }}
          >
            Mi perfil
          </Typography>

          <Typography
            variant="body1"
            sx={{
              color: "#81909D",
              mt: 0.5,
            }}
          >
            Consulta y administra tu información
            personal y tus accesos organizacionales.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={refreshProfile}
          disabled={
            identityLoading ||
            membershipLoading ||
            profileSaving
          }
        >
          Actualizar información
        </Button>
      </Stack>

      {/* RESUMEN DEL PERFIL */}

      <ProfileHeader
        identity={currentIdentity}
        membership={currentMembership}
        identityLoading={identityLoading}
        membershipLoading={membershipLoading}
      />

      {/* PESTAÑAS */}

      <Card>
        <Box
          sx={{
            borderBottom: "1px solid #DCE6EE",
          }}
        >
          <Tabs
            value={selectedTab}
            onChange={(
              _,
              newValue: ProfileTab
            ) => {
              if (!profileSaving) {
                setSelectedTab(newValue);
              }
            }}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="Apartados de Mi perfil"
          >
            {PROFILE_TABS.map((tab) => (
              <Tab
                key={tab.value}
                value={tab.value}
                label={tab.label}
                icon={tab.icon}
                iconPosition="start"
                disabled={profileSaving}
                id={`profile-tab-${tab.value}`}
                aria-controls={
                  `profile-panel-${tab.value}`
                }
              />
            ))}
          </Tabs>
        </Box>

        {/* INFORMACIÓN PERSONAL */}

        {selectedTab === "personal" && (
          <CardContent
            role="tabpanel"
            id="profile-panel-personal"
            aria-labelledby="profile-tab-personal"
          >
            {identityLoading ? (
              <Stack
                direction="row"
                spacing={2}
                sx={{
                  alignItems: "center",
                  py: 3,
                }}
              >
                <CircularProgress size={24} />

                <Typography variant="body2">
                  Cargando información personal...
                </Typography>
              </Stack>
            ) : identityError ? (
              <Alert
                severity="error"
                action={
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() =>
                      setIdentityRefreshVersion(
                        (current) => current + 1
                      )
                    }
                  >
                    Reintentar
                  </Button>
                }
              >
                {identityError}
              </Alert>
            ) : currentIdentity ? (
              <ProfilePersonalInformation
                key={currentIdentity.id}
                identity={currentIdentity}
                onSaved={handleProfileSaved}
                onSavingChange={setProfileSaving}
              />
            ) : (
              <Alert severity="warning">
                No se pudo obtener tu identidad.
              </Alert>
            )}
          </CardContent>
        )}

        {/* SEGURIDAD */}

        {selectedTab === "security" && (
          <CardContent
            role="tabpanel"
            id="profile-panel-security"
            aria-labelledby="profile-tab-security"
          >
            <ProfilePasswordForm
              key={authUser.id}
              onSaved={handlePasswordSaved}
              onSavingChange={setProfileSaving}
            />
          </CardContent>
        )}

        {/* ACCESOS Y UBICACIONES */}

        {(
          selectedTab === "access" ||
          selectedTab === "locations"
        ) && (
          <CardContent
            role="tabpanel"
            id={`profile-panel-${selectedTab}`}
            aria-labelledby={
              `profile-tab-${selectedTab}`
            }
          >
            {membershipLoading ||
            organizationLoading ? (
              <Stack
                direction="row"
                spacing={2}
                sx={{
                  alignItems: "center",
                  py: 3,
                }}
              >
                <CircularProgress size={24} />

                <Typography variant="body2">
                  Cargando accesos organizacionales...
                </Typography>
              </Stack>
            ) : membershipError ? (
              <Alert
                severity="error"
                action={
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() =>
                      setMembershipRefreshVersion(
                        (current) => current + 1
                      )
                    }
                  >
                    Reintentar
                  </Button>
                }
              >
                {membershipError}
              </Alert>
            ) : !currentMembership ? (
              <Alert severity="warning">
                No hay información de membresía
                disponible para la organización actual.
              </Alert>
            ) : selectedTab === "access" ? (
              <ProfileOrganizationAccess
                key={
                  `${authUser.id}:${currentMembership.organization.id}`
                }
                membership={currentMembership}
              />
            ) : (
              <ProfileAssignedLocations
                key={
                  `${authUser.id}:${currentMembership.organization.id}`
                }
                locations={
                  currentMembership.locations
                }
              />
            )}
          </CardContent>
        )}
      </Card>

      {/* NOTIFICACIONES */}

      <Snackbar
        open={Boolean(successMessage)}
        autoHideDuration={5000}
        onClose={() => setSuccessMessage(null)}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
      >
        <Alert
          severity="success"
          onClose={() => setSuccessMessage(null)}
          sx={{ width: "100%" }}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </section>
  );
}