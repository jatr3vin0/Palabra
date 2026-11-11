import { createFileRoute, redirect } from "@tanstack/react-router";

// W4: the app root now opens straight into the adventure world (Eldoria /
// The Pilgrim's Progress). The old village hub page is retired; / redirects
// to /adventure on both server and client via the router's beforeLoad hook.
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/adventure" });
  },
});
