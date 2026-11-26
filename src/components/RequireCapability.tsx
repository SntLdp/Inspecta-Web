import type { ReactNode } from "react";
import { useOrganization } from "../contexts/OrganizationContext";
import type { ModuleKey } from "../services/capabilities.service";
import AccessDenied from "./AccessDenied";

interface RequireCapabilityProps {
  capability: ModuleKey;
  children: ReactNode;
}

export default function RequireCapability({
  capability,
  children,
}: RequireCapabilityProps) {
  const { loading, error, hasModule } = useOrganization();

  if (loading || error) {
    return null;
  }

  if (!hasModule(capability)) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}