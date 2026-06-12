import { ApiReference } from "@scalar/nextjs-api-reference";

const config = {
  url: "/api/openapi",
  theme: "kepler",
  layout: "modern",
  darkMode: true,
  forceDarkModeState: "dark",
  hideDownloadButton: false,
  hideTestRequestButton: false,
  persistAuth: true,
  searchHotKey: "k",
  showOperationId: true,
  authentication: {
    preferredSecurityScheme: "cookieAuth",
    securitySchemes: {
      cookieAuth: {
        value: "",
      },
    },
    createAnySecurityScheme: true,
  },
  metaData: {
    title: "Filo Estilo API Reference",
    description:
      "Documentacion interactiva de los endpoints principales de Filo Estilo para autenticacion, reservas y administracion. Primero ejecuta login y luego prueba endpoints protegidos en la misma sesion.",
  },
} as const;

export const GET = ApiReference(config);
