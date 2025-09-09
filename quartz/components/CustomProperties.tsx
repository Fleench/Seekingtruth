// quartz/components/CustomProperties.tsx
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

// ------- small path utilities (lightweight, Quartz-like behaviour) -------
function splitAnchor(s: string): [string, string] {
  const idx = s.indexOf("#")
  if (idx === -1) return [s, ""]
  const fp = s.slice(0, idx)
  // keep a slugified anchor (Quartz uses github-slugger internally; here we lower-case and replace spaces)
  const anchor = "#" + encodeURIComponent(String(s.slice(idx + 1)).trim().replace(/\s+/g, "-"))
  return [fp, anchor]
}

function stripExt(s: string) {
  return s.replace(/\.mdx?$|\.html?$/i, "")
}

function stripSlashes(s: string) {
  return String(s || "").replace(/^\/+|\/+$/g, "")
}

function joinSegments(...parts: string[]) {
  return parts.filter(Boolean).map(p => stripSlashes(p)).join("/")
}

// resolveRelative: from current canonical slug to target canonical slug (posix segments)
function resolveRelative(curSlug: string, targetSlug: string): string {
  const cur = stripSlashes(String(curSlug || ""))
  const targ = stripSlashes(String(targetSlug || ""))
  const curParts = cur === "" ? [] : cur.split("/")
  const targParts = targ === "" ? [] : targ.split("/")

  // treat cur as a *file* path: pop last segment to get its directory
  if (curParts.length > 0) curParts.pop()

  // find common prefix
  let i = 0
  while (i < curParts.length && i < targParts.length && curParts[i] === targParts[i]) i++
  const up = curParts.length - i
  const parts: string[] = []
  for (let j = 0; j < up; j++) parts.push("..")
  parts.push(...targParts.slice(i))
  if (parts.length === 0) return "./"
  return parts.join("/")
}

function ensureLeadingSlash(s: string) {
  if (!s) return "/"
  return s.startsWith("/") ? s : "/" + s
}

// normalize a discovered slug/path into the form Quartz uses (no leading slash, no ext, lowercase)
function canonicalizeCandidate(s: string) {
  let t = String(s || "")
  try {
    if (/^https?:\/\//i.test(t)) {
      t = new URL(t).pathname
    }
  } catch (e) {}
  t = stripExt(t)
  t = stripSlashes(t).toLowerCase()
  return t
}

// Helper to get the "current file slug" from fileData if available
function getCurrentSlug(fileData: any) {
  // checkbox through commonly exposed fields
  return (fileData && (fileData.slug || fileData.url || fileData.path || fileData.file || fileData.relativePath)) ?
    canonicalizeCandidate(fileData.slug || fileData.url || fileData.path || fileData.file || fileData.relativePath) :
    ""
}

// Try to obtain allSlugs (preferred) or derive from allFiles like your original code
function getAllSlugs(fileData: any): string[] | null {
  if (!fileData) return null
  if (Array.isArray(fileData.allSlugs)) return fileData.allSlugs.map((s: string) => canonicalizeCandidate(s))
  if (Array.isArray(fileData.allFiles)) {
    return fileData.allFiles.map((f: any) => canonicalizeCandidate(
      f && (f.slug || f.url || f.path || f.file || f.relativePath || f.filePath || f._path || f.href || f.name) || ""
    ))
  }
  return null
}

// transformInternalLink: convert user target into a "relative-ish" token similar to Quartz's transformInternalLink
function transformInternalLink(target: string) {
  let t = String(target || "").trim()
  // leave ../ or ./ as-is (but strip extension)
  if (t.startsWith("..")) {
    return stripExt(t)
  }
  if (t.startsWith("./")) {
    return "./" + stripExt(t.slice(2))
  }
  // if absolute slash, normalize to a root-relative like "./foo/bar"
  if (t.startsWith("/")) {
    return "./" + stripSlashes(stripExt(t))
  }
  // default: make it "./foo/bar"
  return "./" + stripSlashes(stripExt(t))
}

// ------- Improved resolver: mirrors Quartz' CrawlLinks/transformLink behaviour -------
function resolveWikiLink(link: string, fileData: any): string {
  const obsidianLink = String(link || "").match(/^\[\[(.+?)(\|(.+))?\]\]$/)
  if (!obsidianLink) return String(link)

  const rawTarget = obsidianLink[1].trim()
  const alias = (obsidianLink[3]) ? obsidianLink[3] : rawTarget.split("/").pop()

  // site base (like your original helper)
  const siteBase = deriveSiteBase(fileData) // '' or '/blog' style (no trailing slash)
  const siteBasePrefix = siteBase ? ensureLeadingSlash(siteBase) : ""

  // which strategy does this site want? fallback to 'absolute' (Quartz default)
  const strategy = (fileData && (fileData.markdownLinkResolution || fileData.site?.markdownLinkResolution || fileData.quartz?.markdownLinkResolution)) || 'absolute'

  // take care of anchors
  const transformed = transformInternalLink(rawTarget) // e.g. './path/to/file' or '../something'
  // remove leading './' (Quartz slices it off later) for canonical use
  const withoutDot = transformed.startsWith("./") ? transformed.slice(2) : transformed
  const [targetCanonical, targetAnchor] = splitAnchor(withoutDot)
  const allSlugs = getAllSlugs(fileData)
  const curSlug = getCurrentSlug(fileData)

  // If we have canonical list of slugs, try to find precise matches first
  if (allSlugs && Array.isArray(allSlugs)) {
    const t = targetCanonical.toLowerCase()

    // exact match (full slug)
    const exact = allSlugs.find((s: string) => s === t)
    if (exact) {
      const resolved = exact
      if (strategy === 'relative') {
        return resolveRelative(curSlug, resolved) + targetAnchor
      }
      // absolute
      return ensureLeadingSlash(siteBasePrefix + "/" + resolved).replace(/\/+/g, "/") + targetAnchor
    }

    // ends-with match (folder/target)
    const ends = allSlugs.find((s: string) => s.endsWith("/" + t))
    if (ends) {
      const resolved = ends
      if (strategy === 'relative') {
        return resolveRelative(curSlug, resolved) + targetAnchor
      }
      return ensureLeadingSlash(siteBasePrefix + "/" + resolved).replace(/\/+/g, "/") + targetAnchor
    }

    // basename match (file name only) — used by 'shortest'
    const basenameMatches = allSlugs.filter((s: string) => s.split("/").pop() === t)
    if (strategy === 'shortest' && basenameMatches.length === 1) {
      const resolved = basenameMatches[0]
      // Quartz prefers a relative path when this is unique
      return resolveRelative(curSlug, resolved) + targetAnchor
    }
  }

  // If target looks like a path (contains '/') just use it under site base
  if (targetCanonical.indexOf("/") >= 0) {
    return ensureLeadingSlash(siteBasePrefix + "/" + targetCanonical).replace(/\/+/g, "/") + targetAnchor
  }

  // Fallback: assume it's a basename under the root
  return ensureLeadingSlash(siteBasePrefix + "/" + targetCanonical).replace(/\/+/g, "/") + targetAnchor
}

// ----------------- rest of your component (unchanged except using resolveWikiLink) -----------------
function slugifyKeepDirs(text: string): string {
  return text
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-\/]/g, "")
}

function deriveSiteBase(fileData: any): string {
  const maybe = fileData?.site?.basePath || fileData?.site?.base || fileData?.base || fileData?.siteBase || '/'
  if (!maybe) return ''
  const cleaned = maybe === '/' ? '' : String(maybe).replace(/\/+$/g, '')
  return cleaned
}

function normalizeFileEntrySlug(f: any): string {
  const guess = (f && (f.slug || f.url || f.path || f.file || f.relativePath || f.filePath || f._path || f.href || f.name)) || ''
  let s = String(guess || '')
  try {
    if (s.match(/^https?:\/\//)) {
      s = new URL(s).pathname
    }
  } catch (e) {}
  s = s.replace(/\.mdx?$|\.html?$/i, '')
  s = s.replace(/^\/+|\/+$/g, '').toLowerCase()
  return s
}

function CustomProperties({ fileData }: QuartzComponentProps) {
  const frontmatter = fileData?.frontmatter
  if (!frontmatter) {
    return null
  }

  const ignoreList = new Set([
    'title', 'tags', 'date', 'publishdate', 'draft', 'aliases', 'description',
    'publish', 'created', 'published', 'cssclasses'
  ])

  function renderValue(value: any): any {
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (/^https?:\/\//i.test(trimmed)) {
        return (
          <a href={trimmed} target="_blank" rel="noopener noreferrer">{trimmed}</a>
        )
      }

      if (/^\[\[.+\]\]$/.test(trimmed)) {
        const m = trimmed.match(/^\[\[(.+?)(\|(.+))?\]\]$/)
        const alias = (m && m[3]) ? m[3] : (m ? m[1].split('/').pop() : trimmed)
        const href = resolveWikiLink(trimmed, fileData)
        return <a href={href}>{alias}</a>
      }

      return ' ' + trimmed
    }

    if (Array.isArray(value)) {
      return (
        <>
          {value.map((v, i) => (
            <span key={i}>{renderValue(v)}{i < value.length - 1 ? ', ' : ''}</span>
          ))}
        </>
      )
    }

    return String(value)
  }

  const properties = Object.keys(frontmatter || {})
    .filter(k => !ignoreList.has(k.toLowerCase()))
    .filter(k => {
      const v = frontmatter[k]
      return v !== null && v !== undefined && v !== '' && (!Array.isArray(v) || v.length > 0)
    })

  if (properties.length === 0) return null

  return (
    <div class="custom-properties">
      <h3>Metadata</h3>
      <ul class="meta-ul">
        {properties.map(key => {
          const value = frontmatter[key]
          const formattedKey = key.charAt(0).toUpperCase() + key.slice(1)
          return (
            <li class="meta-li" key={key}>
              <strong>{formattedKey}:</strong> {renderValue(value)}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default (() => CustomProperties) satisfies QuartzComponentConstructor
