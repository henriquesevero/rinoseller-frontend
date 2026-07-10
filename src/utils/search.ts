// Smart product search: matches any word (first, middle, last), ignores accents/case/punctuation,
// and tolerates typos/malformed names via a small edit-distance budget.

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function tokenize(text: string): string[] {
  const n = normalize(text)
  return n ? n.split(' ') : []
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  const al = a.length
  const bl = b.length
  if (al === 0) return bl
  if (bl === 0) return al

  let prev = new Array(bl + 1)
  let curr = new Array(bl + 1)
  for (let j = 0; j <= bl; j++) prev[j] = j

  for (let i = 1; i <= al; i++) {
    curr[0] = i
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    const tmp = prev
    prev = curr
    curr = tmp
  }
  return prev[bl]
}

// Score how well a single query token matches a single name token.
// 0 means "no match". Higher is better.
function tokenMatchScore(queryToken: string, nameToken: string): number {
  if (nameToken === queryToken) return 4
  if (nameToken.startsWith(queryToken)) return 3
  if (nameToken.includes(queryToken)) return 2

  // Typo tolerance, scaled to token length so short words stay strict.
  const maxDistance = queryToken.length <= 3 ? 0 : queryToken.length <= 5 ? 1 : 2
  if (maxDistance === 0) return 0
  const dist = levenshtein(queryToken, nameToken)
  return dist <= maxDistance ? 1 - dist * 0.2 : 0
}

/**
 * Checks whether `text` matches `query`, and returns a relevance score.
 * Every whitespace-separated word in the query must match some word in the
 * text (in any order), so "azul camisa" matches "Camisa Polo Azul M".
 */
export function matchText(text: string, query: string): { matches: boolean; score: number } {
  const queryTokens = tokenize(query)
  if (queryTokens.length === 0) return { matches: true, score: 0 }

  const textTokens = tokenize(text)
  let score = 0
  for (const qt of queryTokens) {
    let best = 0
    for (const nt of textTokens) {
      const s = tokenMatchScore(qt, nt)
      if (s > best) best = s
    }
    if (best === 0) return { matches: false, score: 0 }
    score += best
  }
  return { matches: true, score }
}

/**
 * Filters and ranks `items` by how well `getText(item)` matches `query`.
 * Best matches come first. Returns `items` unchanged (in original order)
 * when the query is empty.
 */
export function searchByText<T>(items: T[], query: string, getText: (item: T) => string): T[] {
  const q = query.trim()
  if (!q) return items

  const scored: { item: T; score: number }[] = []
  for (const item of items) {
    const { matches, score } = matchText(getText(item), q)
    if (matches) scored.push({ item, score })
  }
  scored.sort((a, b) => b.score - a.score)
  return scored.map(s => s.item)
}
