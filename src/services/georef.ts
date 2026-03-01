/**
 * Cliente para la API de GeoRef (datos.gob.ar).
 * @see https://apis.datos.gob.ar/georef/api/
 */

const GEOREF_BASE = "https://apis.datos.gob.ar/georef/api"

export type GeoRefProvincia = { id: string; nombre: string }

export type GeoRefLocalidad = {
  id: string
  nombre: string
  provincia: { id: string; nombre: string }
  departamento: { id: string; nombre: string } | null
  municipio: { id: string; nombre: string } | null
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: "application/json" } })
  if (!res.ok) throw new Error(`GeoRef API error: ${res.status}`)
  return res.json() as Promise<T>
}

/** Lista de provincias (24 jurisdicciones). */
export async function getProvincias(): Promise<GeoRefProvincia[]> {
  const data = await fetchJson<{
    provincias: Array<{ id: string; nombre: string }>
    total: number
  }>(`${GEOREF_BASE}/provincias?campos=id,nombre&max=30`)
  return data.provincias ?? []
}

export type GeoRefDepartamento = { id: string; nombre: string }
export type GeoRefMunicipio = { id: string; nombre: string }

/** Departamentos de una provincia. */
export async function getDepartamentos(provinciaId: string): Promise<GeoRefDepartamento[]> {
  const id = provinciaId.trim()
  if (!id) return []
  const data = await fetchJson<{
    departamentos: Array<{ id: string; nombre: string }>
    total: number
  }>(`${GEOREF_BASE}/departamentos?provincia=${encodeURIComponent(id)}&campos=id,nombre&max=500`)
  return data.departamentos ?? []
}

/** Municipios de una provincia. */
export async function getMunicipios(provinciaId: string): Promise<GeoRefMunicipio[]> {
  const id = provinciaId.trim()
  if (!id) return []
  const data = await fetchJson<{
    municipios: Array<{ id: string; nombre: string }>
    total: number
  }>(`${GEOREF_BASE}/municipios?provincia=${encodeURIComponent(id)}&campos=id,nombre&max=500`)
  return data.municipios ?? []
}

/** Localidades filtradas por provincia y opcionalmente departamento y/o municipio (menos resultados). */
export async function getLocalidades(
  provinciaId: string,
  departamentoId?: string | null,
  municipioId?: string | null
): Promise<GeoRefLocalidad[]> {
  const id = provinciaId.trim()
  if (!id) return []
  const params = new URLSearchParams({ provincia: id, campos: "id,nombre,provincia,departamento,municipio", max: "5000" })
  if (departamentoId?.trim()) params.set("departamento", departamentoId.trim())
  if (municipioId?.trim()) params.set("municipio", municipioId.trim())
  const data = await fetchJson<{
    localidades: Array<{
      id: string
      nombre: string
      provincia: { id: string; nombre: string }
      departamento: { id: string; nombre: string } | null
      municipio: { id: string; nombre: string } | null
    }>
    total: number
  }>(`${GEOREF_BASE}/localidades?${params.toString()}`)
  return (data.localidades ?? []).map((loc) => ({
    id: loc.id,
    nombre: loc.nombre,
    provincia: loc.provincia,
    departamento: loc.departamento ?? null,
    municipio: loc.municipio ?? null,
  }))
}
