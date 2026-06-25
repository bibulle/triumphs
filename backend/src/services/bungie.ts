import type { Triumph } from '../data/mock.js'

const BASE_URL = 'https://www.bungie.net'

const SECTION_ROOTS = [
  { id: 'triumphs', hash: 1163735237 },
  { id: 'titles',   hash: 616318467  },
  { id: 'ranks',    hash: 3741753466 },
] as const

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

function walkNode(
  nodeHash: number,
  nodesEn: Record<string, PresentationNode>,
  nodesFr: Record<string, PresentationNode>,
  recordsEn: Record<string, RecordDefinition>,
  recordsFr: Record<string, RecordDefinition>,
  section: string,
  cat: string, catFr: string,
  sub: string, subFr: string,
  triumphs: Triumph[],
  idx: { v: number },
  depth: number
): void {
  const nodeEn = nodesEn[nodeHash]
  if (!nodeEn) return
  const nodeFr = nodesFr[nodeHash]
  const name = nodeEn.displayProperties.name
  const nameFr = nodeFr?.displayProperties.name ?? name

  for (const { recordHash } of nodeEn.children?.records ?? []) {
    const recEn = recordsEn[recordHash]
    const recFr = recordsFr[recordHash]
    if (!recEn) continue
    const effectiveCat = cat || name
    const effectiveCatFr = catFr || nameFr
    const effectiveSub = sub || name
    const effectiveSubFr = subFr || nameFr
    triumphs.push({
      id: `t${idx.v++}`,
      section,
      cat: effectiveCat,
      catFr: effectiveCatFr,
      sub: effectiveSub,
      subFr: effectiveSubFr,
      groupKey: `${section}|${effectiveCat}|${effectiveSub}`,
      en: recEn.displayProperties.name,
      fr: recFr?.displayProperties.name ?? recEn.displayProperties.name,
      descEn: recEn.displayProperties.description,
      descFr: recFr?.displayProperties.description ?? recEn.displayProperties.description,
    })
  }

  for (const { presentationNodeHash: childHash } of nodeEn.children?.presentationNodes ?? []) {
    const childEn = nodesEn[childHash]
    const childFr = nodesFr[childHash]
    const childName = childEn?.displayProperties.name ?? ''
    const childNameFr = childFr?.displayProperties.name ?? childName

    if (depth === 0) {
      walkNode(childHash, nodesEn, nodesFr, recordsEn, recordsFr, section, childName, childNameFr, '', '', triumphs, idx, 1)
    } else if (depth === 1) {
      walkNode(childHash, nodesEn, nodesFr, recordsEn, recordsFr, section, cat, catFr, childName, childNameFr, triumphs, idx, 2)
    } else {
      walkNode(childHash, nodesEn, nodesFr, recordsEn, recordsFr, section, cat, catFr, sub, subFr, triumphs, idx, depth + 1)
    }
  }
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

  const triumphs: Triumph[] = []
  const idx = { v: 0 }

  for (const { id: section, hash } of SECTION_ROOTS) {
    const before = triumphs.length
    walkNode(hash, nodesEn, nodesFr, recordsEn, recordsFr, section, '', '', '', '', triumphs, idx, 0)
    console.log(`[bungie] section "${section}": ${triumphs.length - before} records`)
  }

  console.log(`[bungie] catalog built: ${triumphs.length} total records`)
  return { version, triumphs }
}
