import { API_URL } from "../config/app";
import type { GraduateRegistration, ProgramRecommendation } from "../types/graduate";

/**
 * ============================================================================
 *  CONEXIÓN CON LA API
 * ============================================================================
 * Envía el registro a POST {API_URL}/api/registros (FastAPI en Railway).
 * El backend lo guarda en la base de datos (tabla registros_egresados) y
 * devuelve las recomendaciones de programas UNIR.
 *
 * Los componentes solo dependen de que esta función resuelva con un
 * SubmitResult o lance un RegistrationError.
 * ============================================================================
 */

export interface SubmitResult {
  /** Identificador público del registro (UUID). */
  registrationId: string;
  receivedAt: string;
  recommendations: ProgramRecommendation[];
}

export class RegistrationError extends Error {}

const TIMEOUT_MS = 20000;

/**
 * Para probar el estado de error sin cortar la red, abre la app con
 * `?simularError=1`: el primer envío falla y el reintento funciona.
 */
let simulatedFailurePending =
  typeof window !== "undefined" && new URLSearchParams(window.location.search).has("simularError");

export async function submitGraduateRegistration(data: GraduateRegistration): Promise<SubmitResult> {
  if (simulatedFailurePending) {
    simulatedFailurePending = false;
    await new Promise((resolve) => window.setTimeout(resolve, 800));
    throw new RegistrationError("Error simulado de red.");
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${API_URL}/api/registros`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      signal: controller.signal,
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new RegistrationError(`El servidor respondió ${response.status}. ${detail}`);
    }
    return (await response.json()) as SubmitResult;
  } catch (error) {
    if (error instanceof RegistrationError) throw error;
    throw new RegistrationError(error instanceof Error ? error.message : "Error de red.");
  } finally {
    window.clearTimeout(timeout);
  }
}
