import {
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";

import {
  Business,
  Person,
} from "@mui/icons-material";

import type {
  ProfileIdentity,
  ProfileMembership,
} from "../../types/profile.types";

/* =====================================================
   TIPOS
   ===================================================== */

interface ProfileHeaderProps {
  identity: ProfileIdentity | null;
  membership: ProfileMembership | null;
  identityLoading: boolean;
  membershipLoading: boolean;
}

/* =====================================================
   INICIALES DEL USUARIO
   ===================================================== */

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) =>
      word.charAt(0).toUpperCase()
    )
    .join("");
}

/* =====================================================
   COMPONENTE
   ===================================================== */

export default function ProfileHeader({
  identity,
  membership,
  identityLoading,
  membershipLoading,
}: ProfileHeaderProps) {
  const activeRoles =
    membership?.roles.filter(
      (role) => role.status
    ) ?? [];

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent
        sx={{
          p: 3,
          "&:last-child": {
            pb: 3,
          },
        }}
      >
        {/* IDENTIDAD GLOBAL */}

        <Stack
          direction={{
            xs: "column",
            sm: "row",
          }}
          spacing={3}
          sx={{
            alignItems: {
              xs: "flex-start",
              sm: "center",
            },
          }}
        >
          <Avatar
            sx={{
              width: 80,
              height: 80,
              bgcolor: "#16324F",
              color: "#FFFFFF",
              fontSize: 30,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {identity?.name
              ? getInitials(identity.name)
              : <Person sx={{ fontSize: 40 }} />}
          </Avatar>

          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              width: "100%",
            }}
          >
            {identityLoading && !identity ? (
              <>
                <Skeleton
                  variant="text"
                  width="65%"
                  height={36}
                />

                <Skeleton
                  variant="text"
                  width="45%"
                  height={24}
                />
              </>
            ) : (
              <>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    color: "#16324F",
                    overflowWrap: "anywhere",
                  }}
                >
                  {identity?.name ??
                    "Identidad no disponible"}
                </Typography>

                <Typography
                  variant="body2"
                  sx={{
                    color: "#81909D",
                    mt: 0.5,
                    overflowWrap: "anywhere",
                  }}
                >
                  {identity?.email ??
                    "Correo no disponible"}
                </Typography>
              </>
            )}

            {/* ROLES ACTIVOS */}

            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{
                flexWrap: "wrap",
                mt: 1.5,
              }}
            >
              {membershipLoading ? (
                <Skeleton
                  variant="rounded"
                  width={120}
                  height={24}
                />
              ) : membership ? (
                <>
                  {activeRoles.map((role) => (
                    <Chip
                      key={role.id}
                      label={role.name}
                      size="small"
                      sx={{
                        bgcolor: "#E8F0F6",
                        color: "#16324F",
                        fontWeight: 500,
                      }}
                    />
                  ))}

                  {activeRoles.length === 0 && (
                    <Chip
                      label="Sin rol activo"
                      size="small"
                      variant="outlined"
                    />
                  )}

                  <Chip
                    label="Membresía activa"
                    color="success"
                    size="small"
                    variant="outlined"
                  />
                </>
              ) : (
                <Chip
                  label="Accesos no disponibles"
                  size="small"
                  variant="outlined"
                />
              )}
            </Stack>
          </Box>
        </Stack>

        <Divider sx={{ my: 2.5 }} />

        {/* ORGANIZACIÓN ACTIVA */}

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
              bgcolor: "#E8F0F6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Business
              sx={{ color: "#16324F" }}
            />
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="body2"
              sx={{ color: "#81909D" }}
            >
              Organización activa
            </Typography>

            {membershipLoading ? (
              <Skeleton
                variant="text"
                width={180}
                height={26}
              />
            ) : (
              <>
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: 600,
                    color: "#16324F",
                    overflowWrap: "anywhere",
                  }}
                >
                  {membership?.organization.name ??
                    "Organización no disponible"}
                </Typography>

                {membership && (
                  <Typography
                    variant="caption"
                    sx={{ color: "#81909D" }}
                  >
                    {membership.organization.code}
                  </Typography>
                )}
              </>
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}