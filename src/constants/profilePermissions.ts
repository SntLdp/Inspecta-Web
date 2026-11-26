/* =====================================================
   TIPOS
   ===================================================== */

export interface ProfilePermissionDefinition {
  key: string;
  label: string;
  description: string;
}

export interface ProfilePermissionGroup {
  id: string;
  label: string;
  permissions: ProfilePermissionDefinition[];
}

/* =====================================================
   CATÁLOGO DE PERMISOS
   ===================================================== */

export const PROFILE_PERMISSION_GROUPS:
  ProfilePermissionGroup[] = [
    {
      id: "administration",
      label: "Administración",
      permissions: [
        {
          key: "users.manage",
          label: "Administrar usuarios",
          description:
            "Gestionar usuarios conforme al alcance administrativo autorizado.",
        },
        {
          key: "roles.manage",
          label: "Administrar roles",
          description:
            "Gestionar roles y sus permisos asociados.",
        },
        {
          key: "memberships.manage",
          label: "Administrar membresías",
          description:
            "Gestionar las membresías organizacionales de los usuarios.",
        },
      ],
    },
    {
      id: "locations",
      label: "Ubicaciones",
      permissions: [
        {
          key: "plants.view",
          label: "Consultar ubicaciones",
          description:
            "Consultar plantas y áreas dentro del alcance autorizado.",
        },
        {
          key: "locations.view_all",
          label: "Acceso global a ubicaciones",
          description:
            "Ampliar el alcance de ubicaciones a toda la organización cuando se cuenta con el permiso de consulta correspondiente.",
        },
        {
          key: "plants.manage",
          label: "Administrar ubicaciones",
          description:
            "Gestionar ubicaciones conforme a los permisos y alcance asignados.",
        },
      ],
    },
    {
      id: "checklists",
      label: "Checklists",
      permissions: [
        {
          key: "checklists.view",
          label: "Consultar checklists",
          description:
            "Consultar listas de verificación y su contenido.",
        },
        {
          key: "checklists.manage",
          label: "Administrar checklists",
          description:
            "Gestionar listas de verificación, versiones, secciones y preguntas.",
        },
      ],
    },
    {
      id: "norms",
      label: "Normativas",
      permissions: [
        {
          key: "norms.view",
          label: "Consultar normativas",
          description:
            "Consultar normativas y requisitos normativos.",
        },
        {
          key: "norms.manage",
          label: "Administrar normativas",
          description:
            "Gestionar normativas y requisitos asociados.",
        },
      ],
    },
    {
      id: "inspections",
      label: "Inspecciones",
      permissions: [
        {
          key: "inspections.manage",
          label: "Administrar inspecciones",
          description:
            "Gestionar inspecciones conforme al alcance autorizado.",
        },
        {
          key: "inspections.execute",
          label: "Ejecutar inspecciones",
          description:
            "Realizar inspecciones y registrar sus resultados.",
        },
      ],
    },
    {
      id: "incidents",
      label: "Incidencias",
      permissions: [
        {
          key: "findings.register",
          label: "Registrar incidencias",
          description:
            "Registrar hallazgos e incidencias de seguridad e higiene.",
        },
        {
          key: "findings.close",
          label: "Cerrar incidencias",
          description:
            "Realizar operaciones de cierre de incidencias autorizadas.",
        },
      ],
    },
    {
      id: "corrective-actions",
      label: "Acciones correctivas",
      permissions: [
        {
          key: "corrective_actions.manage",
          label: "Administrar acciones correctivas",
          description:
            "Gestionar acciones correctivas y registrar su seguimiento.",
        },
        {
          key: "corrective_actions.verify",
          label: "Verificar acciones correctivas",
          description:
            "Verificar el cumplimiento de acciones correctivas.",
        },
      ],
    },
    {
      id: "reports",
      label: "Reportes",
      permissions: [
        {
          key: "reports.view",
          label: "Consultar reportes",
          description:
            "Consultar reportes dentro del alcance autorizado.",
        },
        {
          key: "reports.view_own",
          label: "Consultar reportes propios",
          description:
            "Consultar reportes asociados a la actividad del propio usuario.",
        },
      ],
    },
  ];

/* =====================================================
   PERMISOS CONOCIDOS
   ===================================================== */

export const KNOWN_PROFILE_PERMISSION_KEYS =
  new Set(
    PROFILE_PERMISSION_GROUPS.flatMap(
      (group) =>
        group.permissions.map(
          (permission) => permission.key
        )
    )
  );