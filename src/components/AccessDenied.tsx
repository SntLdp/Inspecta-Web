import { useNavigate } from "react-router-dom";
import { IonIcon } from "@ionic/react";
import { lockClosedOutline } from "ionicons/icons";
import { useOrganization } from "../contexts/OrganizationContext";

export default function AccessDenied() {
    const navigate = useNavigate();
    const { organization } = useOrganization();

    return (
        <div className="access-denied">
            <div className="access-denied-icon">
                <IonIcon icon={lockClosedOutline} />
            </div>

            <span className="access-denied-code">
                403 — Acceso restringido
            </span>

            <h1>Acceso denegado</h1>

            <p>
                No tienes los permisos necesarios para acceder a
                este módulo dentro de la organización seleccionada.
            </p>

            {organization && (
                <div className="access-denied-organization">
                    <span>Organización activa</span>
                    <strong>{organization.name}</strong>
                    <small>{organization.code}</small>
                </div>
            )}

            <p className="access-denied-help">
                Si consideras que necesitas acceso a este módulo,
                contacta con el administrador de tu organización.
            </p>

            <button
                type="button"
                className="primary-button"
                onClick={() =>
                    navigate("/dashboard", { replace: true })
                }
            >
                Volver al Dashboard
            </button>
        </div>
    );
}