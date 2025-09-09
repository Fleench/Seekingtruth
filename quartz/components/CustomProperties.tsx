// quartz/components/CustomProperties.tsx

import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

function slugifyKeepDirs(text: string): string {
  return text
    .trim()
    .replace(/^\/+/g, "")
    .replace(/\/+$/g, "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-\/]/g, "")
}

function ensureLeadingSlash(s: string) {
  if (!s) return "/"
  return s.startsWith("/") ? s : "/" + s
}

function deriveSiteBase(fileData: any): string {
  const cfg = fileData?.site?.basePath || fileData?.site?.base || fileData?.base || fileData?.siteBase || ''
  if (!cfg) return ''
  let out = String(cfg)
  if (out.startsWith("http")) {
    try {
      const u = new URL(out)
      out = u.pathname
    } catch {
      // ignore
    }
  }
  if (out === "/") return ''
  return out.replace(/\/+$/g, '')
}

function normalizeFileEntrySlug(f: any): string {
  const guess = (f && (f.slug || f.url || f.path || f.file || f.relativePath || f.filePath || f._path || f.href || f.name)) || ''
  let s = String(guess || '')
  try {
    if (s.match(/^https?:\/\//)) {
      s = new URL(s).pathname
    }
  } catch {}
  s = s.replace(/\.mdx?$|\.html?$/i, '')
  s = s.replace(/^\/+|\/+$/g, '').toLowerCase()
  return s
}

function resolveWikiLink(link: string, fileData: any): string {
  const obsidianLink = String(link || '').match(/^\[\[(.+?)(\|(.+))?\]\]$/)
  if (!obsidianLink) return String(link)

  const rawTarget = obsidianLink[1].trim()
  const targetNormalized = slugifyKeepDirs(rawTarget)
  const siteBase = deriveSiteBase(fileData)

  if (fileData?.allFiles && Array.isArray(fileData.allFiles)) {
    const tLower = targetNormalized.toLowerCase()
    for (const f of fileData.allFiles) {
      const fileSlug = normalizeFileEntrySlug(f)
      if (fileSlug === tLower || fileSlug.endsWith('/' + tLower) || fileSlug.split('/').pop() === tLower) {
        return ensureLeadingSlash((siteBase ? siteBase + '/' : '/') + fileSlug).replace(/\/+$/g, '').replace(/\/+/g, '/')
      }
      try {
        const aliases = (f.frontmatter && (f.frontmatter.aliases || f.frontmatter.alias)) || null
        if (aliases) {
          const list = Array.isArray(aliases) ? aliases : [aliases]
          for (const a of list) {
            const aNorm = slugifyKeepDirs(String(a || ''))
            if (aNorm === tLower || aNorm.split('/').pop() === tLower) {
              return ensureLeadingSlash((siteBase ? siteBase + '/' : '/') + fileSlug).replace(/\/+$/g, '').replace(/\/+/g, '/')
            }
          }
        }
      } catch {}
    }
  }

  if (targetNormalized.indexOf('/') >= 0) {
    return ensureLeadingSlash((siteBase ? siteBase + '/' : '/') + targetNormalized).replace(/\/+/g, '/')
  }

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
