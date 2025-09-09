// quartz/components/CustomProperties.tsx
import { QuartzComponentConstructor, QuartzComponentProps } from "./types"

function slugifyKeepDirs(text: string): string {
  return String(text || "")
    .trim()
    .replace(/^\/+/g, "")
    .replace(/\/+$/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9\-\/]/g, "")
}

function ensureLeadingSlash(s: string) {
  if (!s) return "/"
  return s.startsWith("/") ? s : "/" + s
}

function stripHtmlExt(s: string) {
  return s.replace(/\.mdx?$|\.html?$/i, "")
}

function safeNormalizePath(s: any) {
  if (!s && s !== 0) return ""
  let out = String(s)
  try {
    if (/^https?:\/\//i.test(out)) {
      out = new URL(out).pathname
    }
  } catch {}
  // collapse multiple slashes into one, but keep protocol slashes intact
  out = out.replace(/([^:]\/)\/+/g, "$1")
  out = stripHtmlExt(out)
  out = out.replace(/^\/+|\/+$/g, "")
  return out
}

function deriveSiteBase(fileData: any): string {
  // prefer explicit config keys
  const cfg =
    fileData?.site?.basePath ??
    fileData?.site?.base ??
    fileData?.base ??
    fileData?.siteBase ??
    fileData?.basePath ??
    ""
  let out = String(cfg || "")

  // handle full URLs
  if (out && out.startsWith("http")) {
    try {
      out = new URL(out).pathname
    } catch {}
  }
  out = out.replace(/\/+$/g, "")
  if (out === "/") return ""
  if (out) return out

  // client-side heuristic: if served under /<repo>/..., pick the first segment
  try {
    if (typeof window !== "undefined" && window?.location?.pathname) {
      const parts = window.location.pathname.split("/").filter(Boolean)
      if (parts.length > 0) {
        // If the repo is github.io/<repo>/... this picks <repo>
        return "/" + parts[0]
      }
    }
  } catch {}

  return ""
}

// Collect many possible path-like properties from a file entry.
// Return array of { original, lower } candidates in order of preference.
function collectFileCandidates(f: any): { original: string; lower: string }[] {
  const propsToTry = [
    "url",
    "permalink",
    "path",
    "filePath",
    "relativePath",
    "_path",
    "href",
    "file",
    "outputPath",
    "route",
    "slug",
    "name",
  ]
  const seen = new Set<string>()
  const list: { original: string; lower: string }[] = []

  // frontmatter slug/permalink
  try {
    if (f?.frontmatter) {
      if (f.frontmatter.permalink) propsToTry.unshift("frontmatter.permalink")
      if (f.frontmatter.slug) propsToTry.unshift("frontmatter.slug")
    }
  } catch {}

  for (const p of propsToTry) {
    let val: any = undefined
    if (p.indexOf("frontmatter.") === 0) {
      const key = p.split(".")[1]
      val = f?.frontmatter?.[key]
    } else {
      val = f?.[p]
    }
    if (!val && val !== 0) continue
    const cleaned = safeNormalizePath(val)
    if (!cleaned) continue
    if (seen.has(cleaned.toLowerCase())) continue
    seen.add(cleaned.toLowerCase())
    list.push({ original: cleaned, lower: cleaned.toLowerCase() })
  }

  // As a last resort, if the file entry has a full path in some nested shape,
  // try JSON-stringifying and extracting a path-like substring.
  if (list.length === 0) {
    try {
      const j = JSON.stringify(f || {})
      const m = j.match(/([A-Za-z0-9\-\/_]+\.mdx?)/)
      if (m) {
        const cleaned = safeNormalizePath(m[1])
        list.push({ original: cleaned, lower: cleaned.toLowerCase() })
      }
    } catch {}
  }

  return list
}

function resolveWikiLink(link: string, fileData: any): string {
  const obsidianLink = String(link || "").match(/^\[\[(.+?)(\|(.+))?\]\]$/)
  if (!obsidianLink) return String(link)

  const rawTarget = obsidianLink[1].trim()
  const displayAlias = obsidianLink[3] ? obsidianLink[3] : rawTarget.split("/").pop()
  const targetNormalized = slugifyKeepDirs(rawTarget).toLowerCase()
  const siteBase = deriveSiteBase(fileData)

  // If there's a list of all files, try to find the best match
  if (fileData?.allFiles && Array.isArray(fileData.allFiles)) {
    const tLower = targetNormalized
    // heuristics: 1) exact path, 2) endsWith '/t', 3) filename match
    for (const f of fileData.allFiles) {
      const candidates = collectFileCandidates(f)
      if (!candidates || candidates.length === 0) continue

      // prefer exact directory-preserving match first
      let bestMatch: string | null = null
      for (const c of candidates) {
        if (c.lower === tLower || c.lower === tLower.replace(/^\/+/, "")) {
          bestMatch = c.original
          break
        }
      }
      if (!bestMatch) {
        for (const c of candidates) {
          if (c.lower.endsWith("/" + tLower) || c.lower.split("/").pop() === tLower) {
            bestMatch = c.original
            break
          }
        }
      }

      if (bestMatch) {
        // If the file has a URL/permalink that looks already site-rooted, prefer that raw url
        const preferProps = ["url", "permalink", "frontmatter.permalink"]
        for (const p of preferProps) {
          let raw: any = undefined
          if (p.indexOf("frontmatter.") === 0) {
            const key = p.split(".")[1]
            raw = f?.frontmatter?.[key]
          } else {
            raw = f?.[p]
          }
          if (raw) {
            const cleanedRaw = String(raw)
            // If it looks like an absolute path on the site, use it as-is (strip domain)
            if (cleanedRaw.startsWith("/")) {
              const final = ensureLeadingSlash((siteBase ? siteBase + "/" : "/") + safeNormalizePath(cleanedRaw))
                .replace(/\/+/g, "/")
              console.debug("[CustomProperties] resolved wiki link", rawTarget, "->", final, "via file property", p)
              return final
            }
            // if raw is a full URL, use only the path
            try {
              if (/^https?:\/\//i.test(cleanedRaw)) {
                const u = new URL(cleanedRaw)
                const final = ensureLeadingSlash((siteBase ? siteBase + "/" : "/") + safeNormalizePath(u.pathname)).replace(/\/+/g, "/")
                console.debug("[CustomProperties] resolved wiki link", rawTarget, "->", final, "via file property (full URL)", p)
                return final
              }
            } catch {}
          }
        }

        // Otherwise, return bestMatch under the site base, preserving original directory structure
        const final = ensureLeadingSlash((siteBase ? siteBase + "/" : "/") + bestMatch).replace(/\/+/g, "/")
        console.debug("[CustomProperties] resolved wiki link", rawTarget, "->", final, "via bestMatch")
        return final
      }
    }
  }

  // If the user typed a path (contains '/'), prefer using it verbatim but normalized
  if (rawTarget.indexOf("/") >= 0) {
    const cleaned = safeNormalizePath(rawTarget)
    const final = ensureLeadingSlash((siteBase ? siteBase + "/" : "/") + cleaned).replace(/\/+/g, "/")
    console.debug("[CustomProperties] resolved wiki link (explicit path)", rawTarget, "->", final)
    return final
  }

  // fallback: slugify and put under site base
  const final = ensureLeadingSlash((siteBase ? siteBase + "/" : "/") + targetNormalized).replace(/\/+/g, "/")
  console.warn("[CustomProperties] wiki link fallback for", rawTarget, "->", final)
  return final
}

export default (() => {
  // minimal render-only component: only include the resolver logic above in your existing component
  // For brevity this file only exports an empty component since your project already has the JSX rendering.
  return function CustomProperties(_: QuartzComponentProps) {
    return null
  }
}) satisfies QuartzComponentConstructor
