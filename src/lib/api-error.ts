import { GameServiceError } from "@/lib/game-service";

export function apiErrorResponse(error: unknown) {
  if (error instanceof GameServiceError) {
    return Response.json({ error: error.message, details: error.details ?? null }, { status: error.status });
  }
  console.error("CEO Arena API error:", error);
  return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
