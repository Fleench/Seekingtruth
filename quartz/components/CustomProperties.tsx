// quartz/components/CustomProperties.tsx

import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

function slugifyKeepDirs(text: string): string {
  return text
    .trim()
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9\-\/]/g, "")
}

function ensureLeadingSlash(s: string) {
  if (!s) return "/"
  return s.startsWith("/") ? s : "/" + s
}

function deriveSiteBase(fileData: any): string {
  // Try common config keys first
  const cfg = fileData?.site?.basePath || fileData?.site?.base || fileData?.base || fileData?.siteBase || ''
  let out = String(cfg || '')

  // If config points to a full URL, extract pathname
  if (out && out.startsWith("http")) {
    try {
      const u = new URL(out)
      out = u.pathname
    } catch {
      // ignore
    }
  }

  // If user explicitly set root '/', treat it as empty base
  if (out === "/") return ''
  out = out.replace(/\/+$/g, '')
  if (out) return out

  // --- FALLBACK: try to infer from runtime location (client-side only) ---
  try {
    if (typeof window !== 'undefined' && window?.location?.pathname) {
      const p = String(window.location.pathname || '/')
        .replace(/\/+$|\\/g, '/')
        .replace(/\/+$/g, '')
      const parts = p.split('/').filter(Boolean)
      // Typical GitHub Pages repo sites use the first path segment as the repo name
      if (parts.length > 0) {
        return '/' + parts[0]
      }
    }
  } catch {}

  return ''
}

// return both original-casing path and a lower-cased version for matching
function getFileSlugInfo(f: any): { original: string, lower: string } {
  const guess = (f && (f.slug || f.url || f.path || f.file || f.relativePath || f.filePath || f._path || f.href || f.name)) || ''
  let s = String(guess || '')
  try {
    if (s.match(/^https?:\/\//)) {
      s = new URL(s).pathname
    }
  } catch {}
  s = s.replace(/\.mdx?$|\.html?$/i, '')
  s = s.replace(/^\/+|\/+$/g, '')
  const original = s
  const lower = original.toLowerCase()
  return { original, lower }
}

function resolveWikiLink(link: string, fileData: any): string {
  const obsidianLink = String(link || '').match(/^\[\[(.+?)(\|(.+))?\]\]$/)
  if (!obsidianLink) return String(link)

  const rawTarget = obsidianLink[1].trim()
  const targetNormalized = slugifyKeepDirs(rawTarget).toLowerCase()
  const siteBase = deriveSiteBase(fileData)

  // try to resolve by searching the provided allFiles list
  if (fileData?.allFiles && Array.isArray(fileData.allFiles)) {
    const tLower = targetNormalized
    for (const f of fileData.allFiles) {
      const { original: fileSlugOriginal, lower: fileSlugLower } = getFileSlugInfo(f)

      // exact match, directory match, or filename match
      if (fileSlugLower === tLower || fileSlugLower.endsWith('/' + tLower) || fileSlugLower.split('/').pop() === tLower) {
        // return path preserving the original casing from the source file entry
        return ensureLeadingSlash((siteBase ? siteBase + '/' : '/') + fileSlugOriginal).replace(/\/+$|\\/g, '/').replace(/\/+/g, '/')
      }

      // also check aliases in frontmatter (case-insensitive)
      try {
        const aliases = (f.frontmatter && (f.frontmatter.aliases || f.frontmatter.alias)) || null
        if (aliases) {
          const list = Array.isArray(aliases) ? aliases : [aliases]
          for (const a of list) {
            const aNorm = slugifyKeepDirs(String(a || '')).toLowerCase()
            if (aNorm === tLower || aNorm.split('/').pop() === tLower) {
              return ensureLeadingSlash((siteBase ? siteBase + '/' : '/') + fileSlugOriginal).replace(/\/+$|\\/g, '/').replace(/\/+/g, '/')
            }
          }
        }
      } catch {}
    }
  }

  // If the link explicitly includes a slash (a path), prefer returning that path under the site base
  if (rawTarget.indexOf('/') >= 0) {
    // preserve the user's casing for path segments when possible; fall back to slugified form
    const cleaned = rawTarget.replace(/^\/+|\/+$/g, '')
    return ensureLeadingSlash((siteBase ? siteBase + '/' : '/') + cleaned).replace(/\/+/g, '/')
  }

  // Fallback: return the normalized (slugified) path under the site base
  return ensureLeadingSlash((siteBase ? siteBase + '/' : '/') + targetNormalized).replace(/\/+/g, '/')
}

function CustomProperties({ fileData }: QuartzComponentProps) {
  const frontmatter = fileData?.frontmatter
  if (!frontmatter) return null

  const ignoreList = new Set([
    'title', 'tags', 'date', 'publishdate', 'draft', 'aliases', 'description',
    'publish', 'created', 'published', 'cssclasses'
  ])

  function renderValue(value: any): any {
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (/^https?:\/\//i.test(trimmed)) {
        return <a href={trimmed} target="_blank" rel="noopener noreferrer">{trimmed}</a>
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
      return <>{value.map((v, i) => <span key={i}>{renderValue(v)}{i < value.length - 1 ? ', ' : ''}</span>)}</>
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
