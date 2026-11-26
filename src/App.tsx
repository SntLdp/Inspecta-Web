import { useEffect } from "react";

import {
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";

import type { ReactNode } from "react";

import {
  API_ACCESS_EVENT,
  getAuthToken,
  getOrganizationId,
} from "./api/client";

import type {
  ApiAccessEventDetail,
} from "./api/client";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AppLayout from "./layouts/AppLayout";
import Inspecciones from "./pages/Inspecciones";
import Incidencias from "./pages/Incidencias";
import AccionesCorrectivas from "./pages/AccionesCorrectivas";
import Checklists from "./pages/Checklists";
import Normativa from "./pages/Normativa";
import Reportes from "./pages/Reportes";
import Administracion from "./pages/Administracion";
import SeleccionOrganizacion from "./pages/SeleccionOrganizacion";
import RequireCapability from "./components/RequireCapability";

import {
  OrganizationProvider,
} from "./contexts/OrganizationContext";

/* =====================================================
   GESTIÓN GLOBAL DE ACCESO
   ===================================================== */

function ApiAccessHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAccessInvalidated = (event: Event) => {
      const { detail } =
        event as CustomEvent<ApiAccessEventDetail>;

      if (!detail) {
        return;
      }

      if (detail.type === "session") {
        navigate("/login", {
          replace: true,
          state: {
            accessMessage: detail.message,
          },
        });

        return;
      }

      if (detail.type === "organization") {
        if (!getAuthToken()) {
          navigate("/login", {
            replace: true,
          });

          return;
        }

        navigate(
          "/seleccionar-organizacion?mode=recovery",
          {
            replace: true,
            state: {
              accessMessage: detail.message,
            },
          }
        );
      }
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
  }, [navigate]);

  return null;
}

/* =====================================================
   PROTECCIÓN DE SESIÓN
   ===================================================== */

function RequireLogin({
  children,
}: {
  children: ReactNode;
}) {
  if (!getAuthToken()) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

/* =====================================================
   PROTECCIÓN DE ORGANIZACIÓN
   ===================================================== */

function RequireOrganization({
  children,
}: {
  children: ReactNode;
}) {
  if (!getAuthToken()) {
    return <Navigate to="/login" replace />;
  }

  if (!getOrganizationId()) {
    return (
      <Navigate
        to="/seleccionar-organizacion"
        replace
      />
    );
  }

  return <>{children}</>;
}

/* =====================================================
   APLICACIÓN
   ===================================================== */

export default function App() {
  return (
    <>
      <ApiAccessHandler />

      <Routes>
        {/* RUTAS PÚBLICAS */}

        <Route
          path="/login"
          element={<Login />}
        />

        {/* SELECCIÓN DE ORGANIZACIÓN */}

        <Route
          path="/seleccionar-organizacion"
          element={
            <RequireLogin>
              <SeleccionOrganizacion />
            </RequireLogin>
          }
        />

        {/* RUTAS PROTEGIDAS */}

        <Route
          element={
            <RequireOrganization>
              <OrganizationProvider>
                <AppLayout />
              </OrganizationProvider>
            </RequireOrganization>
          }
        >
          {/* DASHBOARD */}

          <Route
            path="/dashboard"
            element={
              <RequireCapability capability="dashboard">
                <Dashboard />
              </RequireCapability>
            }
          />

          {/* INSPECCIONES */}

          <Route
            path="/inspecciones"
            element={
              <RequireCapability capability="inspections">
                <Inspecciones />
              </RequireCapability>
            }
          />

          {/* INCIDENCIAS */}

          <Route
            path="/incidencias"
            element={
              <RequireCapability capability="incidents">
                <Incidencias />
              </RequireCapability>
            }
          />

          {/* ACCIONES CORRECTIVAS */}

          <Route
            path="/acciones-correctivas"
            element={
              <RequireCapability capability="corrective_actions">
                <AccionesCorrectivas />
              </RequireCapability>
            }
          />

          {/* CHECKLISTS */}

          <Route
            path="/checklists"
            element={
              <RequireCapability capability="checklists">
                <Checklists />
              </RequireCapability>
            }
          />

          {/* NORMATIVA */}

          <Route
            path="/normativa"
            element={
              <RequireCapability capability="norms">
                <Normativa />
              </RequireCapability>
            }
          />

          {/* REPORTES */}

          <Route
            path="/reportes"
            element={
              <RequireCapability capability="reports">
                <Reportes />
              </RequireCapability>
            }
          />

          {/* ADMINISTRACIÓN */}

          <Route
            path="/administracion"
            element={
              <RequireCapability capability="administration">
                <Administracion />
              </RequireCapability>
            }
          />
        </Route>

        {/* REDIRECCIONES */}

        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />

        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />
      </Routes>
    </>
  );
}