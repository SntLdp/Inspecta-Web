
import { useOrganization } from "../contexts/OrganizationContext";

export function useAdministrationCapabilities() {
    const {
        administration,
        hasModule,
        loading,
        error,
    } = useOrganization();

    // Denegar capacidades mientras no exista
    // un contexto válido de autorización.
    const ready =
        !loading &&
        !error &&
        administration !== null;

    const canAccessAdministration =
        ready &&
        hasModule("administration");

    // =================================================
    // USUARIOS Y MEMBRESÍAS
    // =================================================

    const canViewUsers =
        canAccessAdministration &&
        (
            administration?.manage_users === true ||
            administration?.manage_memberships === true
        );

    const canManageUsers =
        canAccessAdministration &&
        administration?.manage_users === true;

    const canCreateUsers =
        canAccessAdministration &&
        administration?.create_users === true;

    const canManageMemberships =
        canAccessAdministration &&
        administration?.manage_memberships === true;

    // =================================================
    // ROLES Y PERMISOS
    // =================================================

    const canViewRoles =
        canAccessAdministration &&
        (
            administration?.manage_roles === true ||
            administration?.manage_users === true
        );

    const canManageRoles =
        canAccessAdministration &&
        administration?.manage_roles === true;

    const canAssignRoles =
        canAccessAdministration &&
        administration?.assign_roles === true;

    // =================================================
    // UBICACIONES
    // =================================================

    const canViewLocations =
        canAccessAdministration &&
        administration?.view_locations === true;

    const canManageLocations =
        canViewLocations &&
        administration?.manage_locations === true;

    const canViewAllLocations =
        canViewLocations &&
        administration?.view_all_locations === true;

    const canAssignLocations =
        canManageLocations &&
        administration?.assign_locations === true;

    // La edición mediante reemplazo completo requiere
    // visibilidad general para evitar eliminar
    // asignaciones que el usuario no puede consultar.
    const canReplaceUserLocations =
        canAssignLocations &&
        canViewAllLocations;

    // =================================================
    // ORGANIZACIÓN
    // =================================================

    const canViewOrganization =
        canAccessAdministration;

    return {
        loading,
        error,
        ready,

        canAccessAdministration,

        canViewUsers,
        canManageUsers,
        canCreateUsers,
        canManageMemberships,

        canViewRoles,
        canManageRoles,
        canAssignRoles,

        canViewLocations,
        canManageLocations,
        canViewAllLocations,
        canAssignLocations,
        canReplaceUserLocations,

        canViewOrganization,
    };
}
