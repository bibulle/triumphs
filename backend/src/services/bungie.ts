import type { Triumph } from '../data/mock.js'

const BASE_URL = 'https://www.bungie.net'
const MONUMENT_NAME_EN = 'Monument of Triumph'

interface PresentationNode {
  hash: number
  displayProperties: { name: string; description: string }
  children?: {
    presentationNodes?: Array<{ presentationNodeHash: number }>
    records?: Array<{ recordHash: number }>
  }
}

interface RecordDefinition {
  hash: number
  displayProperties: { name: string; description: string }
}

function apiHeaders(): HeadersInit {
  return { 'X-API-Key': process.env.BUNGIE_API_KEY! }
}

async function bungieGet(path: string): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${path}`, { headers: apiHeaders() })
  if (!res.ok) throw new Error(`Bungie API ${res.status}: ${path}`)
  return res.json()
}

async function fetchDefinitions<T>(path: string): Promise<Record<string, T>> {
  const res = await fetch(`${BASE_URL}${path}`)
  if (!res.ok) throw new Error(`Bungie definitions ${res.status}: ${path}`)
  return res.json() as Promise<Record<string, T>>
}

export async function fetchManifestVersion(): Promise<string> {
  const json = await bungieGet('/Platform/Destiny2/Manifest/') as { Response: { version: string } }
  return json.Response.version
}

export async function fetchTriumphCatalog(): Promise<{ version: string; triumphs: Triumph[] }> {
  const json = await bungieGet('/Platform/Destiny2/Manifest/') as {
    Response: {
      version: string
      jsonWorldComponentContentPaths: Record<string, Record<string, string>>
    }
  }
  const r = json.Response
  const version = r.version
  const paths = r.jsonWorldComponentContentPaths

  const [nodesEn, nodesFr, recordsEn, recordsFr] = await Promise.all([
    fetchDefinitions<PresentationNode>(paths.en.DestinyPresentationNodeDefinition),
    fetchDefinitions<PresentationNode>(paths.fr.DestinyPresentationNodeDefinition),
    fetchDefinitions<RecordDefinition>(paths.en.DestinyRecordDefinition),
    fetchDefinitions<RecordDefinition>(paths.fr.DestinyRecordDefinition),
  ])

  const monument = Object.values(nodesEn).find(
    n => n.displayProperties.name === MONUMENT_NAME_EN
  )
  if (!monument) throw new Error(`"${MONUMENT_NAME_EN}" node not found in Bungie manifest`)

  const triumphs: Triumph[] = []
  let idx = 0

  for (const { presentationNodeHash: catHash } of monument.children?.presentationNodes ?? []) {
    const catEn = nodesEn[catHash]
    const catFrNode = nodesFr[catHash]
    if (!catEn) continue
    const cat = catEn.displayProperties.name
    const catFr = catFrNode?.displayProperties.name ?? cat

    for (const { presentationNodeHash: subHash } of catEn.children?.presentationNodes ?? []) {
      const subEn = nodesEn[subHash]
      const subFrNode = nodesFr[subHash]
      if (!subEn) continue
      const sub = subEn.displayProperties.name
      const subFr = subFrNode?.displayProperties.name ?? sub
      const groupKey = `${cat}|${sub}`

      for (const { recordHash } of subEn.children?.records ?? []) {
        const recEn = recordsEn[recordHash]
        const recFr = recordsFr[recordHash]
        if (!recEn) continue

        triumphs.push({
          id: `t${idx++}`,
          cat,
          catFr,
          sub,
          subFr,
          groupKey,
          en: recEn.displayProperties.name,
          fr: recFr?.displayProperties.name ?? recEn.displayProperties.name,
          descEn: recEn.displayProperties.description,
          descFr: recFr?.displayProperties.description ?? recEn.displayProperties.description,
        })
      }
    }
  }

  return { version, triumphs }
}
