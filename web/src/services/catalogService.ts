import { API_URL } from "../config/app";
import type { RoleSuggestion, SkillSuggestion } from "../types/graduate";

/** Catálogos del mercado laboral que expone el backend (vacantes vigentes normalizadas). */

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { signal });
  if (!response.ok) throw new Error(`El servidor respondió ${response.status}.`);
  return (await response.json()) as T;
}

/** Cargos de las vacantes vigentes que coinciden con el texto. */
export function searchRoles(query: string, signal?: AbortSignal): Promise<RoleSuggestion[]> {
  return getJson(`/api/cargos?q=${encodeURIComponent(query)}&limit=8`, signal);
}

/** Habilidades del catálogo normalizado. Sin texto: las más pedidas. */
export function searchSkills(query: string, signal?: AbortSignal, limit = 10): Promise<SkillSuggestion[]> {
  return getJson(`/api/habilidades?q=${encodeURIComponent(query)}&limit=${limit}`, signal);
}

/** Áreas de desempeño que sugiere un cargo. */
export function suggestAreas(role: string, signal?: AbortSignal): Promise<string[]> {
  return getJson(`/api/areas-sugeridas?cargo=${encodeURIComponent(role)}`, signal);
}
