import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import type { ReactNode } from "react";

import {
  API_ACCESS_EVENT,
  getAuthToken,
  getOrganizationId,
  invalidateOrganization,
  invalidateSession,
} from "../api/client";

import {
  getOrganizations,
} from "../services/organizations.service";

import type {
  Organization,
} from "../services/organizations.service";

import {
  getCapabilities,
} from "../services/capabilities.service";

import type {
  OrganizationCapabilities,
  ModuleCapabilities,
  ModuleKey,
  CorrectiveActionCapabilities,
  AdministrationCapabilities,
} from "../services/capabilities.service";

/* =====================================================
   TIPOS DEL CONTEXTO
   ===================================================== */

interface OrganizationContextValue {
  organization: Organization | null;
  organizations: Organization[];
  capabilities: OrganizationCapabilities | null;
  roles: string[];
  modules: ModuleCapabilities | null;
  correctiveActions: CorrectiveActionCapabilities | null;
  administration: AdministrationCapabilities | null;
  loading: boolean;
  error: string | null;
  hasModule: (module: ModuleKey) => boolean;
  refresh: () => Promise<void>;
}

interface OrganizationProviderProps {
  children: ReactNode;
}

const OrganizationContext =
  createContext<OrganizationContextValue | undefined>(
    undefined
  );

/* =====================================================
   PROVIDER
   ===================================================== */

export function OrganizationProvider({
  children,
}: OrganizationProviderProps) {
  const [organization, setOrganization] =
    useState<Organization | null>(null);

  const [organizations, setOrganizations] =
    useState<Organization[]>([]);

  const [capabilities, setCapabilities] =
    useState<OrganizationCapabilities | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const requestRef =
    useRef<AbortController | null>(null);

  /* =====================================================
     LIMPIAR CONTEXTO
     ===================================================== */

  const clearContext = useCallback(() => {
    setOrganization(null);
    setOrganizations([]);
    setCapabilities(null);
  }, []);

  /* =====================================================
     CARGAR ORGANIZACIÓN Y CAPACIDADES
     ===================================================== */

  const refresh = useCallback(async () => {
    requestRef.current?.abort();

    const controller = new AbortController();

    requestRef.current = controller;

    const token = getAuthToken();
    const organizationId = getOrganizationId();

    clearContext();

    setError(null);
    setLoading(true);

    const isCurrentRequest = () =>
      !controller.signal.aborted &&
      getAuthToken() === token &&
      getOrganizationId() === organizationId;

    try {
      if (!token) {
        invalidateSession();
        return;
      }

      if (!organizationId) {
        invalidateOrganization(
          "organization_required",
          "No hay una organización seleccionada."
        );

        return;
      }

      const availableOrganizations =
        await getOrganizations();

      if (!isCurrentRequest()) {
        return;
      }

      const selectedOrganization =
        availableOrganizations.find(
          (item) => item.id === organizationId
        );

      if (!selectedOrganization) {
        invalidateOrganization(
          "organization_access_denied",
          "Ya no tienes acceso a la organización seleccionada."
        );

        return;
      }

      const organizationCapabilities =
        await getCapabilities(controller.signal);

      if (!isCurrentRequest()) {
        return;
      }

      if (
        organizationCapabilities.organization_id !==
        organizationId
      ) {
        throw new Error(
          "Las capacidades recibidas no corresponden a la organización activa."
        );
      }

      setOrganizations(availableOrganizations);
      setOrganization(selectedOrganization);
      setCapabilities(organizationCapabilities);
    } catch (err) {
      if (!isCurrentRequest()) {
        return;
      }

      clearContext();

      setError(
        err instanceof Error
          ? err.message
          : "No fue posible cargar la información de la organización."
      );
    } finally {
      if (isCurrentRequest()) {
        setLoading(false);
      }
    }
  }, [clearContext]);

  /* =====================================================
     ESCUCHAR INVALIDACIÓN DE ACCESO
     ===================================================== */

  useEffect(() => {
    const handleAccessInvalidated = () => {
      requestRef.current?.abort();

      clearContext();

      setError(null);
      setLoading(true);
    };

    window.addEventListener(
      API_ACCESS_EVENT,
      handleAccessInvalidated
    );

    return () => {
      window.removeEventListener(
        API_ACCESS_EVENT,
        handleAccessInvalidated
      );
    };
  }, [clearContext]);

  /* =====================================================
     INICIALIZAR CONTEXTO
     ===================================================== */

  useEffect(() => {
    void refresh();

    return () => {
      requestRef.current?.abort();
    };
  }, [refresh]);

  /* =====================================================
     CONSULTAR CAPACIDADES
     ===================================================== */

  const hasModule = useCallback(
    (module: ModuleKey): boolean => {
      return capabilities?.modules[module] === true;
    },
    [capabilities]
  );

  const value: OrganizationContextValue = {
    organization,
    organizations,
    capabilities,
    roles: capabilities?.roles ?? [],
    modules: capabilities?.modules ?? null,
    correctiveActions: capabilities?.corrective_actions ?? null,
    administration: capabilities?.administration ?? null,
    loading,
    error,
    hasModule,
    refresh,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

/* =====================================================
   HOOK DEL CONTEXTO
   ===================================================== */

export function useOrganization(): OrganizationContextValue {
  const context = useContext(OrganizationContext);

  if (!context) {
    throw new Error(
      "useOrganization debe utilizarse dentro de OrganizationProvider."
    );
  }

  return context;
}