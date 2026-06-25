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
  console.log(`[bungie] GET ${path}`)
  const res = await fetch(`${BASE_URL}${path}`, { headers: apiHeaders() })
  if (!res.ok) throw new Error(`Bungie API ${res.status}: ${path}`)
  return res.json()
}

async function fetchDefinitions<T>(path: string): Promise<Record<string, T>> {
  const url = `${BASE_URL}${path}`
  console.log(`[bungie] downloading definitions: ${url}`)
  const start = Date.now()
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Bungie definitions ${res.status}: ${path}`)
  const data = await res.json() as Record<string, T>
  console.log(`[bungie] downloaded ${Object.keys(data).length} entries in ${Date.now() - start}ms`)
  return data
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
  if (!monument) {
    console.error(`[bungie] "${MONUMENT_NAME_EN}" node not found. Available top-level nodes: ${Object.values(nodesEn).slice(0, 5).map(n => n.displayProperties.name).join(', ')}…`)
    throw new Error(`"${MONUMENT_NAME_EN}" node not found in Bungie manifest`)
  }
  const catNodes = monument.children?.presentationNodes ?? []
  console.log(`[bungie] Monument node hash=${monument.hash}, children.presentationNodes=${catNodes.length}`)
  if (catNodes.length === 0) {
    console.log(`[bungie] Monument node raw children keys: ${Object.keys(monument.children ?? {}).join(', ')}`)
  } else {
    console.log(`[bungie] First category hash: ${catNodes[0].presentationNodeHash}`)
  }

  const triumphs: Triumph[] = []
  let idx = 0

  for (const { presentationNodeHash: catHash } of catNodes) {
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

  console.log(`[bungie] catalog built: ${triumphs.length} triumphs across ${new Set(triumphs.map(t => t.cat)).size} categories`)
  return { version, triumphs }
}
