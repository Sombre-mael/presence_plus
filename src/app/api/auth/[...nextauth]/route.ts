const response = {
  error: "AUTH_NOT_CONFIGURED",
  message: "Auth.js sera configuré dans le prochain jalon.",
};

export function GET() {
  return Response.json(response, { status: 501 });
}

export function POST() {
  return Response.json(response, { status: 501 });
}
