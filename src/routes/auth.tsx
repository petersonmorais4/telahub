import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    next: typeof search["next"] === "string" ? search["next"] : "",
  }),
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/acessar", search: { next: search.next }, replace: true });
  },
});
