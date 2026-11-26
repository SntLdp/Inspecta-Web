import { useEffect, useRef, useState } from "react";
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { IonIcon } from "@ionic/react";
import { clearAuthToken } from "../api/client";
import { getStoredUser, logout } from "../services/auth.service";
import inspectaLogo from "../assets/inspecta-logo.png";
import { useOrganization } from "../contexts/OrganizationContext";

import type { ModuleKey } from "../services/capabilities.service";

import {
  gridOutline,
  clipboardOutline,
  warningOutline,
  checkmarkDoneOutline,
  listOutline,
  documentTextOutline,
  barChartOutline,
  settingsOutline,
  ellipsisVerticalOutline,
  personOutline,
  logOutOutline,
  menuOutline,
  businessOutline,
  swapHorizontalOutline,
} from "ionicons/icons";

const SIDEBAR_STORAGE_KEY = "inspecta_sidebar_collapsed";
const SIDEBAR_BREAKPOINT = "(max-width: 900px)";

interface NavigationItem {
  label: string;
  path: string;
  icon: string;
  capability: ModuleKey;
}

const items: NavigationItem[] = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: gridOutline,
    capability: "dashboard",
  },
  {
    label: "Inspecciones",
    path: "/inspecciones",
    icon: clipboardOutline,
    capability: "inspections",
  },
  {
    label: "Incidencias",
    path: "/incidencias",
    icon: warningOutline,
    capability: "incidents",
  },
  {
    label: "Acciones correctivas",
    path: "/acciones-correctivas",
    icon: checkmarkDoneOutline,
    capability: "corrective_actions",
  },
  {
    label: "Checklists",
    path: "/checklists",
    icon: listOutline,
    capability: "checklists",
  },
  {
    label: "Normativa",
    path: "/normativa",
    icon: documentTextOutline,
    capability: "norms",
  },
  {
    label: "Reportes",
    path: "/reportes",
    icon: barChartOutline,
    capability: "reports",
  },
  {
    label: "Administración",
    path: "/administracion",
    icon: settingsOutline,
    capability: "administration",
  },
];

function getInitialSidebarState(): boolean {
  if (window.matchMedia(SIDEBAR_BREAKPOINT).matches) {
    return true;
  }

  return localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
}

function getInitials(name?: string | null): string {
  if (!name?.trim()) {
    return "UI";
  }

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const user = getStoredUser();
  const {
    organization,
    roles,
    loading,
    error,
    refresh,
    hasModule,
  } = useOrganization();

  /* =====================================================
   MÓDULOS AUTORIZADOS
   ===================================================== */

  const visibleItems =
    loading || error
      ? []
      : items.filter((item) =>
        hasModule(item.capability)
      );

  const mainRef = useRef<HTMLElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);

  const [profileOpen, setProfileOpen] = useState(false);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    getInitialSidebarState
  );

  const userName = user?.name ?? "Usuario Inspecta";

  const userRole = loading
    ? "Cargando roles..."
    : error
      ? "Roles no disponibles"
      : roles.length > 0
        ? roles.join(", ")
        : "Sin rol asignado";

  const organizationName = loading
    ? "Cargando organización..."
    : error
      ? "Organización no disponible"
      : organization?.name ?? "Sin organización";

  const organizationCode = organization?.code ?? "";

  /* =====================================================
     REINICIAR SCROLL AL CAMBIAR DE MÓDULO
     ===================================================== */

  useEffect(() => {
    mainRef.current?.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  }, [location.pathname]);

  /* =====================================================
     COMPORTAMIENTO RESPONSIVE DEL SIDEBAR
     ===================================================== */

  useEffect(() => {
    const mediaQuery = window.matchMedia(SIDEBAR_BREAKPOINT);

    const handleBreakpointChange = (
      event: MediaQueryListEvent
    ) => {
      if (event.matches) {
        setSidebarCollapsed(true);
      } else {
        setSidebarCollapsed(
          localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true"
        );
      }

      setProfileOpen(false);
    };

    mediaQuery.addEventListener(
      "change",
      handleBreakpointChange
    );

    return () => {
      mediaQuery.removeEventListener(
        "change",
        handleBreakpointChange
      );
    };
  }, []);

  /* =====================================================
     CERRAR MENÚ DE PERFIL
     ===================================================== */

  useEffect(() => {
    if (!profileOpen) {
      return;
    }

    const handleOutsideClick = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !profileRef.current?.contains(event.target)
      ) {
        setProfileOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
        profileButtonRef.current?.focus();
      }
    };

    document.addEventListener(
      "pointerdown",
      handleOutsideClick
    );

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handleOutsideClick
      );

      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [profileOpen]);

  /* =====================================================
     CONTRAER / EXPANDIR SIDEBAR
     ===================================================== */

  const toggleSidebar = () => {
    const nextCollapsed = !sidebarCollapsed;

    setSidebarCollapsed(nextCollapsed);
    setProfileOpen(false);

    if (!window.matchMedia(SIDEBAR_BREAKPOINT).matches) {
      localStorage.setItem(
        SIDEBAR_STORAGE_KEY,
        String(nextCollapsed)
      );
    }
  };

  /* =====================================================
   CAMBIAR ORGANIZACIÓN
   ===================================================== */

  const handleChangeOrganization = () => {
    setProfileOpen(false);

    navigate("/seleccionar-organizacion?mode=switch");
  };

  /* =====================================================
     CERRAR SESIÓN
     ===================================================== */

  const handleLogout = async () => {
    setProfileOpen(false);

    try {
      await logout();
    } finally {
      clearAuthToken();
      localStorage.removeItem("inspecta_user");

      navigate("/login", {
        replace: true,
      });
    }
  };

  return (
    <div
      className={`app-shell ${sidebarCollapsed
        ? "sidebar-collapsed"
        : "sidebar-expanded"
        }`}
    >
      {/* =====================================================
          SIDEBAR
          ===================================================== */}

      <aside
        id="inspecta-sidebar"
        className="sidebar"
      >
        {/* BOTÓN PARA CONTRAER / EXPANDIR */}

        <div className="sidebar-controls">
          <button
            type="button"
            className="sidebar-toggle"
            onClick={toggleSidebar}
            title={
              sidebarCollapsed
                ? "Expandir menú lateral"
                : "Minimizar menú lateral"
            }
            aria-label={
              sidebarCollapsed
                ? "Expandir menú lateral"
                : "Minimizar menú lateral"
            }
            aria-expanded={!sidebarCollapsed}
            aria-controls="inspecta-sidebar"
          >
            <IonIcon
              icon={menuOutline}
              aria-hidden="true"
            />
          </button>
        </div>

        {/* LOGO */}

        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <img
              src={inspectaLogo}
              alt="Logo de INSPECTA"
            />
          </div>

          <div className="sidebar-brand-text">
            <strong>INSPECTA</strong>

            <span>Seguridad e higiene</span>
          </div>
        </div>

        {/* ORGANIZACIÓN ACTIVA */}

        <div
          className="sidebar-organization"
          title={
            organizationCode
              ? `${organizationName} (${organizationCode})`
              : organizationName
          }
          aria-label={`Organización activa: ${organizationName}`}
        >
          <div className="sidebar-organization-icon">
            <IonIcon
              icon={businessOutline}
              aria-hidden="true"
            />
          </div>

          <div className="sidebar-organization-info">
            <span>Organización activa</span>

            <strong>{organizationName}</strong>

            {organizationCode && (
              <small>{organizationCode}</small>
            )}
          </div>
        </div>

        {/* NAVEGACIÓN */}

        <nav
          className="sidebar-nav"
          aria-label="Navegación principal"
        >
          {visibleItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              title={item.label}
              aria-label={item.label}
              onClick={() => {
                setProfileOpen(false);

                if (
                  window.matchMedia(
                    SIDEBAR_BREAKPOINT
                  ).matches
                ) {
                  setSidebarCollapsed(true);
                }
              }}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <IonIcon
                icon={item.icon}
                className="nav-icon"
                aria-hidden="true"
              />

              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* PARTE INFERIOR */}

        <div className="sidebar-bottom">
          {/* PERFIL */}

          <div
            className="profile-container"
            ref={profileRef}
          >
            {profileOpen && (
              <div
                id="inspecta-profile-menu"
                className="profile-menu"
              >
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                  }}
                >
                  <IonIcon icon={personOutline} />
                  <span>Mi perfil</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                  }}
                >
                  <IonIcon icon={settingsOutline} />
                  <span>Configuración</span>
                </button>

                <button
                  type="button"
                  onClick={handleChangeOrganization}
                >
                  <IonIcon icon={swapHorizontalOutline} />
                  <span>Cambiar organización</span>
                </button>

                <div className="profile-menu-divider" />

                <button
                  type="button"
                  className="logout-button"
                  onClick={handleLogout}
                >
                  <IonIcon icon={logOutOutline} />
                  <span>Cerrar sesión</span>
                </button>
              </div>
            )}

            <div className="profile-card">
              <div
                className="profile-avatar"
                title={`${userName} — ${userRole}`}
              >
                {getInitials(user?.name)}
              </div>

              <div className="profile-info">
                <strong title={userName}>
                  {userName}
                </strong>

                <span title={userRole}>
                  {userRole}
                </span>
              </div>

              <button
                ref={profileButtonRef}
                type="button"
                className="profile-more"
                onClick={() =>
                  setProfileOpen((previous) => !previous)
                }
                title="Opciones de usuario"
                aria-label="Opciones de usuario"
                aria-expanded={profileOpen}
                aria-controls={
                  profileOpen
                    ? "inspecta-profile-menu"
                    : undefined
                }
              >
                <IonIcon
                  icon={ellipsisVerticalOutline}
                  aria-hidden="true"
                />
              </button>
            </div>
          </div>

          {/* VERSIÓN */}

          <div className="sidebar-footer">
            <span>INSPECTA PWA</span>

            <small>Frontend · v0.1</small>
          </div>
        </div>
      </aside>

      {/* =====================================================
          CONTENIDO
          ===================================================== */}

      <main
        className="main-area"
        ref={mainRef}
      >
        <div className="content">
          {loading ? (
            <div
              className="organization-state"
              role="status"
              aria-live="polite"
            >
              <div className="organization-spinner" />

              <h2>Cargando organización</h2>

              <p>
                Estamos obteniendo la información y los
                permisos de acceso.
              </p>
            </div>
          ) : error ? (
            <div
              className="organization-state"
              role="alert"
            >
              <IonIcon
                icon={warningOutline}
                className="organization-error-icon"
              />

              <h2>No fue posible cargar la organización</h2>

              <p>{error}</p>

              <button
                type="button"
                className="primary-button"
                onClick={() => void refresh()}
              >
                Reintentar
              </button>
            </div>
          ) : (
            <Outlet />
          )}
        </div>
      </main>
    </div>
  );
}