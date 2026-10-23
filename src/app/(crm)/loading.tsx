import { LoadingState } from "@/components/shared/loading-state";

/**
 * Route-level loading boundary for the CRM shell. Mirrors the dashboard
 * layout to avoid structural shift while content is deferred.
 */
export default function CrmLoading() {
  return <LoadingState variant="page" />;
}
