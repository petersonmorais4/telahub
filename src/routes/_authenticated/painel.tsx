import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getMfaStatus } from "@/lib/mfa.functions";

export const Route = createFileRoute("/_authenticated/painel")({
  beforeLoad: async ({ location, context }) => {
    // Once verified, skip the server round-trip on every menu click (per user, per tab).
    const userId = (context as { user?: { id: string } }).user?.id;
    const key = userId ? `telahub_mfa_ok_${userId}` : null;
    if (key && sessionStorage.getItem(key) === "1") return;
    const { verified } = await getMfaStatus();
    if (!verified) throw redirect({ to: "/verificacao", search: { next: location.href } });
    if (key) sessionStorage.setItem(key, "1");
  },
  component: () => <Outlet />,
});
