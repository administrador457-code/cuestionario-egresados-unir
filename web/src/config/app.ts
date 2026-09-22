/** Configuración general de la aplicación. */

/** Destino del enlace "¿Necesitas ayuda?". Cámbialo por el canal de egresados. */
export const HELP_URL = "https://www.unir.net/";

/**
 * URL del backend (FastAPI en Railway). Se puede cambiar sin tocar el código
 * definiendo VITE_API_URL en Vercel o en un archivo web/.env.local.
 */
export const API_URL: string = (
  import.meta.env.VITE_API_URL || "https://cuestionario-web-production.up.railway.app"
).replace(/\/$/, "");
