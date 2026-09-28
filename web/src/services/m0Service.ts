import { API_URL } from "../config/app";
import type { M0Prefill } from "../types/graduate";

/**
 * Busca al egresado en la base institucional M0 por su documento.
 * Devuelve null si no está. Lanza error si falla la red o el servidor.
 */
export async function lookupM0(documentType: string, documentNumber: string, signal?: AbortSignal): Promise<M0Prefill | null> {
  const url = `${API_URL}/api/m0/${encodeURIComponent(documentType)}/${encodeURIComponent(documentNumber.trim())}`;
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`El servidor respondió ${response.status}.`);
  const data = (await response.json()) as ({ found: false } | ({ found: true } & M0Prefill));
  return data.found ? data : null;
}
