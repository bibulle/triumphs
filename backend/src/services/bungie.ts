import type { Triumph, NodeMeta } from '../data/mock.js'

const BASE_URL = 'https://www.bungie.net'

const SECTION_ROOTS = [
  { id: 'triumphs', hash: 1163735237 },
  { id: 'titles',   hash: 616318467  },
  { id: 'ranks',    hash: 3741753466 },
] as const

interface DisplayProperties {
  name: string
  description: string
  icon?: string
  hasIcon?: boolean
}

interface PresentationNode {
  hash: number
  index: number
  displayProperties: DisplayProperties
  children?: {
    presentationNodes?: Array<{ presentationNodeHash: number }>
    records?: Array<{ recordHash: number }>
  }
}

interface RecordDefinition {
  hash: number
  displayProperties: DisplayProperties
  titleInfo?: {
    hasTitle?: boolean
    titlesByGender?: { Male?: string; Female?: string }
  }
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

function extractIcon(dp: DisplayProperties): string | undefined {
  return dp.icon || undefined
}

function walkNode(
  nodeHash: number,
  nodesEn: Record<string, PresentationNode>,
  nodesFr: Record<string, PresentationNode>,
  nodesPt: Record<string, PresentationNode>,
  recordsEn: Record<string, RecordDefinition>,
  recordsFr: Record<string, RecordDefinition>,
  recordsPt: Record<string, RecordDefinition>,
  section: string,
  cat: string, catFr: string,
  sub: string, subFr: string,
  triumphs: Triumph[],
  nodes: NodeMeta[],
  depth: number
): void {
  const nodeEn = nodesEn[nodeHash]
  if (!nodeEn) return
  const nodeFr = nodesFr[nodeHash]
  const nodePt = nodesPt[nodeHash]
  const name = nodeEn.displayProperties.name
  const nameFr = nodeFr?.displayProperties.name ?? name
  const namePt = nodePt?.displayProperties.name

  // Capture node metadata for levels 0 (section), 1 (category), 2 (subcategory)
  if (depth <= 2) {
    const meta: NodeMeta = {
      hash: nodeHash,
      level: depth as 0 | 1 | 2,
      sectionId: section,
      nameEn: name,
      nameFr,
      namePt,
      descEn: nodeEn.displayProperties.description ?? '',
      descFr: nodeFr?.displayProperties.description ?? nodeEn.displayProperties.description ?? '',
      descPt: nodePt?.displayProperties.description,
      icon: extractIcon(nodeEn.displayProperties),
    }
    if (depth === 1) {
      meta.catKey = `${section}|${cat}`
    }
    if (depth === 2) meta.groupKey = `${section}|${cat}|${sub}`
    nodes.push(meta)
  }

  // Leaf records (triumph entries)
  for (const { recordHash } of nodeEn.children?.records ?? []) {
    const recEn = recordsEn[recordHash]
    const recFr = recordsFr[recordHash]
    const recPt = recordsPt[recordHash]
    if (!recEn) continue
    const effectiveCat = cat || name
    const effectiveCatFr = catFr || nameFr
    const effectiveSub = sub || name
    const effectiveSubFr = subFr || nameFr

    const triumph: Triumph = {
      id: String(recordHash),
      section,
      cat: effectiveCat,
      catFr: effectiveCatFr,
      sub: effectiveSub,
      subFr: effectiveSubFr,
      groupKey: `${section}|${effectiveCat}|${effectiveSub}`,
      en: recEn.displayProperties.name,
      fr: recFr?.displayProperties.name ?? recEn.displayProperties.name,
      pt: recPt?.displayProperties.name,
      descEn: recEn.displayProperties.description,
      descFr: recFr?.displayProperties.description ?? recEn.displayProperties.description,
      descPt: recPt?.displayProperties.description,
      icon: extractIcon(recEn.displayProperties),
    }

    const titleEn = recEn.titleInfo?.titlesByGender?.Male ?? recEn.titleInfo?.titlesByGender?.Female
    if (titleEn) {
      triumph.titleEn = titleEn
      triumph.titleFr = recFr?.titleInfo?.titlesByGender?.Male ?? recFr?.titleInfo?.titlesByGender?.Female ?? titleEn
      triumph.titlePt = recPt?.titleInfo?.titlesByGender?.Male ?? recPt?.titleInfo?.titlesByGender?.Female
    }

    triumphs.push(triumph)
  }

  // Recurse into child presentation nodes
  for (const { presentationNodeHash: childHash } of nodeEn.children?.presentationNodes ?? []) {
    const childEn = nodesEn[childHash]
    const childFr = nodesFr[childHash]
    const childName = childEn?.displayProperties.name ?? ''
    const childNameFr = childFr?.displayProperties.name ?? childName

    if (depth === 0) {
      walkNode(childHash, nodesEn, nodesFr, nodesPt, recordsEn, recordsFr, recordsPt, section, childName, childNameFr, '', '', triumphs, nodes, 1)
    } else if (depth === 1) {
      walkNode(childHash, nodesEn, nodesFr, nodesPt, recordsEn, recordsFr, recordsPt, section, cat, catFr, childName, childNameFr, triumphs, nodes, 2)
    } else {
      walkNode(childHash, nodesEn, nodesFr, nodesPt, recordsEn, recordsFr, recordsPt, section, cat, catFr, sub, subFr, triumphs, nodes, depth + 1)
    }
  }
}

export async function fetchTriumphCatalog(): Promise<{ version: string; triumphs: Triumph[]; nodes: NodeMeta[] }> {
  const json = await bungieGet('/Platform/Destiny2/Manifest/') as {
    Response: {
      version: string
      jsonWorldComponentContentPaths: Record<string, Record<string, string>>
    }
  }
  const r = json.Response
  const version = r.version
  const paths = r.jsonWorldComponentContentPaths

  const [nodesEn, nodesFr, nodesPt, recordsEn, recordsFr, recordsPt] = await Promise.all([
    fetchDefinitions<PresentationNode>(paths.en.DestinyPresentationNodeDefinition),
    fetchDefinitions<PresentationNode>(paths.fr.DestinyPresentationNodeDefinition),
    fetchDefinitions<PresentationNode>(paths['pt-br'].DestinyPresentationNodeDefinition),
    fetchDefinitions<RecordDefinition>(paths.en.DestinyRecordDefinition),
    fetchDefinitions<RecordDefinition>(paths.fr.DestinyRecordDefinition),
    fetchDefinitions<RecordDefinition>(paths['pt-br'].DestinyRecordDefinition),
  ])

  const triumphs: Triumph[] = []
  const nodes: NodeMeta[] = []

  for (const { id: section, hash } of SECTION_ROOTS) {
    const before = triumphs.length
    walkNode(hash, nodesEn, nodesFr, nodesPt, recordsEn, recordsFr, recordsPt, section, '', '', '', '', triumphs, nodes, 0)
    console.log(`[bungie] section "${section}": ${triumphs.length - before} records`)
  }

  nodes.filter(n => n.sectionId === 'ranks' && n.level === 1).forEach((n, i) => { n.rankIndex = i })

  const level0 = nodes.filter(n => n.level === 0)
  const level1 = nodes.filter(n => n.level === 1)
  console.log(`[bungie] catalog built: ${triumphs.length} total records, ${nodes.length} nodes`)
  console.log('[bungie] level-0 nodes:')
  level0.forEach((n, i) => {
    const rawNode = nodesEn[String(SECTION_ROOTS[i]?.hash)]
    const rawIcon = rawNode?.displayProperties.icon ?? '(missing)'
    const hasIcon = rawNode?.displayProperties.hasIcon
    console.log(`  [${n.sectionId}] nameEn="${n.nameEn}" icon="${n.icon ?? '(none)'}" rawIcon="${rawIcon}" hasIcon=${hasIcon}`)
  })
  console.log('[bungie] level-1 nodes (first 10):')
  level1.slice(0, 10).forEach(n => {
    const rawNode = nodesEn[String(n.hash)]
    const rawIcon = rawNode?.displayProperties.icon ?? '(missing)'
    const hasIcon = rawNode?.displayProperties.hasIcon
    console.log(`  [${n.sectionId}] catKey="${n.catKey}" nameEn="${n.nameEn}" icon="${n.icon ?? '(none)'}" rawIcon="${rawIcon}" hasIcon=${hasIcon}`)
  })
  const level2 = nodes.filter(n => n.level === 2)
  console.log('[bungie] level-2 nodes (first 15):')
  level2.slice(0, 15).forEach(n => {
    const rawNode = nodesEn[String(n.hash)]
    const rawIcon = rawNode?.displayProperties.icon ?? '(missing)'
    const hasIcon = rawNode?.displayProperties.hasIcon
    console.log(`  [${n.sectionId}] groupKey="${n.groupKey}" nameEn="${n.nameEn}" icon="${n.icon ?? '(none)'}" rawIcon="${rawIcon}" hasIcon=${hasIcon}`)
  })

  // Guardian Ranks deep dive
  const ranksRootHash = SECTION_ROOTS.find(r => r.id === 'ranks')!.hash
  const ranksRoot = nodesEn[String(ranksRootHash)]
  console.log('[bungie] ranks root raw keys:', ranksRoot ? Object.keys(ranksRoot).join(', ') : '(not found)')
  console.log('[bungie] ranks root children count:', ranksRoot?.children?.presentationNodes?.length ?? 0)
  ranksRoot?.children?.presentationNodes?.forEach(({ presentationNodeHash: h }) => {
    const n = nodesEn[String(h)]
    if (!n) return
    const rawNode = n
    console.log(`[bungie] ranks L1 hash=${h} name="${n.displayProperties.name}" keys=${Object.keys(n).join(',')} children_nodes=${n.children?.presentationNodes?.length ?? 0} children_records=${n.children?.records?.length ?? 0}`)
    console.log(`  raw node extra keys:`, Object.keys(rawNode).filter(k => !['hash','displayProperties','children'].includes(k)).join(', ') || '(none)')
    // Show first record full raw data
    const firstRecordHash = n.children?.records?.[0]?.recordHash
    if (firstRecordHash) {
      const rec = recordsEn[String(firstRecordHash)]
      console.log(`  first record hash=${firstRecordHash} keys=${Object.keys(rec ?? {}).join(', ')}`)
      console.log(`  first record:`, JSON.stringify(rec).slice(0, 400))
    }
    // Show first child node full raw data
    const firstChildHash = n.children?.presentationNodes?.[0]?.presentationNodeHash
    if (firstChildHash) {
      const child = nodesEn[String(firstChildHash)]
      console.log(`  first child hash=${firstChildHash} name="${child?.displayProperties.name}" keys=${Object.keys(child ?? {}).join(', ')}`)
      console.log(`  first child:`, JSON.stringify(child).slice(0, 400))
    }
  })

  return { version, triumphs, nodes }
}
