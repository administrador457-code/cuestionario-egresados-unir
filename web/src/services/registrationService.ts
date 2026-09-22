import type { GraduateRegistration } from "../types/graduate";

/**
 * ============================================================================
 *  PUNTO DE CONEXIÓN CON LA API
 * ============================================================================
 * Esta función SIMULA el envío. Para conectar el backend real, reemplaza el
 * cuerpo por una llamada fetch, por ejemplo:
 *
 *   const response = await fetch(`${import.meta.env.VITE_API_URL}/api/egresados`, {
 *     method: "POST",
 *     headers: { "Content-Type": "application/json" },
 *     body: JSON.stringify(data),
 *   });
 *   if (!response.ok) throw new RegistrationError("El servidor rechazó el registro.");
 *   return (await response.json()) as SubmitResult;
 *
 * El resto de la aplicación solo depende de que esta función resuelva con un
 * SubmitResult o lance un error; no hay que tocar ningún componente.
 * ============================================================================
 */

export interface SubmitResult {
  /** Identificador que devolverá la API. En la simulación es aleatorio. */
  registrationId: string;
  receivedAt: string;
}

export class RegistrationError extends Error {}

const SIMULATED_DELAY_MS = 1200;

/**
 * Para probar el estado de error, abre la app con `?simularError=1`:
 * el primer envío falla y el reintento funciona.
 */
let simulatedFailurePending =
  typeof window !== "undefined" && new URLSearchParams(window.location.search).has("simularError");

export async function submitGraduateRegistration(data: GraduateRegistration): Promise<SubmitResult> {
  await new Promise((resolve) => window.setTimeout(resolve, SIMULATED_DELAY_MS));

  if (simulatedFailurePending) {
    simulatedFailurePending = false;
    throw new RegistrationError("Error simulado de red.");
  }

  const result: SubmitResult = {
    registrationId: crypto.randomUUID(),
    receivedAt: new Date().toISOString(),
  };
  console.info("[registro simulado] Datos que se enviarían a la API:", data, result);
  return result;
}
