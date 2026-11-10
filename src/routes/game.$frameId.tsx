import { createFileRoute } from "@tanstack/react-router";

import { FrameGame } from "~/components/FrameGame";

export const Route = createFileRoute("/game/$frameId")({
  component: GameFrameRoute,
});

/** Thin route wrapper: the frame engine itself lives in FrameGame so the
 * Eldoria adventure can open the same mini-games as mission overlays. */
function GameFrameRoute() {
  const { frameId } = Route.useParams();
  return <FrameGame frameId={frameId} />;
}
