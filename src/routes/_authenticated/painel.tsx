import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getMfaStatus } from "@/lib/mfa.functions";

export const Route = createFileRoute("/_authenticated/painel")({
  beforeLoad: async ({ location }) => {
    const { verified } = await getMfaStatus();
    if (!verified) throw redirect({ to: "/verificacao", search: { next: location.href } });
  },
  component: () => <Outlet />,
});
