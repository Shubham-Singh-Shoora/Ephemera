/** Retired plaintext endpoints. Deliberately never consume or log the request body. */
export function retiredRoomEndpoint(): Response {
  return Response.json(
    {
      error: 'This endpoint is retired. The test room now runs entirely in your browser.',
      code: 'BROWSER_ONLY',
    },
    {
      status: 410,
      headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
    },
  );
}
