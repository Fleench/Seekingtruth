// quartz/components/CustomProperties.tsx
// Root-aware single-file Quartz component that resolves Obsidian-style [[links]]
// to absolute site paths based on the site's root (the directory where the site's
// index/home page lives). All logic is contained in this single component file.

import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

// Helper: create a slug but keep folder separators. Returns *no* leading slash.
function slugifyKeepDirs(text: string): string {
  return text
    .trim()
    // remove surrounding slashes
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase()
    // allow directories, convert spaces to dashes
    .replace(/\s+/g, "-")
    // remove characters except a-z, 0-9, dash and slash
    .replace(/[^a-z0-9\-\/]/g, "")
}

function ensureLeadingSlash(s: string) {
  if (!s) return "/"
  return s.startsWith("/") ? s : "/" + s
}

// Try to derive the site root/base where the home index lives from fileData.
// Quartz sites might expose this in different properties; we try a few and fallback to '/'.
function deriveSiteBase(fileData: any): string {
  const maybe = fileData?.site?.basePath || fileData?.site?.base || fileData?.base || fileData?.siteBase || '/'
  if (!maybe) return ''
  // strip trailing slash, keep empty string if root
  const cleaned = maybe === '/' ? '' : String(maybe).replace(/\/+$/g, '')
  // return without trailing slash (we add slashes when joining)
  return cleaned
}

// Normalize a candidate file entry from fileData.allFiles to a comparable slug
function normalizeFileEntrySlug(f: any): string {
  // Try common fields that a build index might provide
  const guess = (f && (f.slug || f.url || f.path || f.file || f.relativePath || f.filePath || f._path || f.href || f.name)) || ''
  let s = String(guess || '')
  // If it's a full URL, try to extract path portion
  try {
    if (s.match(/^https?:\/\//)) {
      s = new URL(s).pathname
    }
  } catch (e) {
    // ignore
  }
  // remove extension if present (.md, .mdx, .html)
  s = s.replace(/\.mdx?$|\.html?$/i, '')
  // strip leading/trailing slashes and lowercase
  s = s.replace(/^\/+|\/+$/g, '').toLowerCase()
  return s
}

// Resolve a single wiki-style link ([[target]] or [[folder/target|Alias]]) into an absolute
// site path starting from the site's root (where index lives). Uses fileData.allFiles
// to find the correct path when possible, and falls back to a naive slug path.
function resolveWikiLink(link: string, fileData: any): string {
  const obsidianLink = String(link || '').match(/^\[\[(.+?)(\|(.+))?\]\]$/)
  if (!obsidianLink) return String(link)

  const rawTarget = obsidianLink[1].trim()
  const targetNormalized = slugifyKeepDirs(rawTarget) // e.g. 'Authors/Flench 04' -> 'authors/flench-04'
  const siteBase = deriveSiteBase(fileData) // e.g. '' or '/blog'

  // If an index of files is available, try to find the best match
  if (fileData?.allFiles && Array.isArray(fileData.allFiles)) {
    const t = targetNormalized
    // lower-case for comparisons
    const tLower = t.toLowerCase()

    for (const f of fileData.allFiles) {
      const fileSlug = normalizeFileEntrySlug(f) // no leading slash

      // Exact match (full slug)
      if (fileSlug === tLower) {
        return ensureLeadingSlash((siteBase ? siteBase + '/' : '/') + fileSlug).replace(/\/+/g, '/')
      }

      // Ends-with match (target might be just basename)
      if (fileSlug.endsWith('/' + tLower) || fileSlug === tLower) {
        return ensureLeadingSlash((siteBase ? siteBase + '/' : '/') + fileSlug).replace(/\/+/g, '/')
      }

      // basename match (final segment)
      const base = fileSlug.split('/').pop()
      if (base && base === tLower) {
        return ensureLeadingSlash((siteBase ? siteBase + '/' : '/') + fileSlug).replace(/\/+/g, '/')
      }

      // check aliases in frontmatter if present
      try {
        const aliases = (f.frontmatter && (f.frontmatter.aliases || f.frontmatter.alias)) || null
        if (aliases) {
          const list = Array.isArray(aliases) ? aliases : [aliases]
          for (const a of list) {
            const aNorm = slugifyKeepDirs(String(a || ''))
            if (aNorm === tLower || aNorm.split('/').pop() === tLower) {
              return ensureLeadingSlash((siteBase ? siteBase + '/' : '/') + fileSlug).replace(/\/+/g, '/')
            }
          }
        }
      } catch (e) {
        // ignore
      }
    }
  }

  // No index match: if the target already looks like a path (contains '/'), use it
  if (targetNormalized.indexOf('/') >= 0) {
    return ensureLeadingSlash((siteBase ? siteBase + '/' : '/') + targetNormalized).replace(/\/+/g, '/')
  }

  // Final fallback: assume it's a basename under root
  return ensureLeadingSlash((siteBase ? siteBase + '/' : '/') + targetNormalized).replace(/\/+/g, '/')
}

function CustomProperties({ fileData }: QuartzComponentProps) {
  const frontmatter = fileData?.frontmatter
  if (!frontmatter) {
    return null
  }

  // A list of properties to ignore from display
  const ignoreList = new Set([
    'title', 'tags', 'date', 'publishdate', 'draft', 'aliases', 'description',
    'publish', 'created', 'published', 'cssclasses'
  ])

  // Render a single value (string, wiki link, external link, array)
  function renderValue(value: any): any {
    if (typeof value === 'string') {
      const trimmed = value.trim()

      // External http(s) link
      if (/^https?:\/\//i.test(trimmed)) {
        return (
          <a href={trimmed} target="_blank" rel="noopener noreferrer">{trimmed}</a>
        )
      }

      // Obsidian-style [[link]]
      if (/^\[\[.+\]\]$/.test(trimmed)) {
        const m = trimmed.match(/^\[\[(.+?)(\|(.+))?\]\]$/)
        const alias = (m && m[3]) ? m[3] : (m ? m[1].split('/').pop() : trimmed)
        const href = resolveWikiLink(trimmed, fileData)
        return <a href={href}>{alias}</a>
      }

      // Plain string
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

    // Any other value
    return String(value)
  }

  // Collect displayable properties
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
