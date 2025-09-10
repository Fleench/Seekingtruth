// quartz/components/CustomProperties.tsx
import { QuartzComponentConstructor, QuartzComponentProps } from "./types"

type Options = {
  exclude?: string[]
  title?: string
}

const defaultOptions: Options = {
  exclude: [],
  title: "Credits",
}

export default ((userOpts?: Options) => {
  const opts = { ...defaultOptions, ...(userOpts ?? {}) }
  const excludeSet = new Set((opts.exclude ?? []).map((s) => s.toLowerCase()))

  // Helpers
  const normalizeKey = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, "")
  const keyIs = (k: string, name: string) => normalizeKey(k) === normalizeKey(name)

  const isExternal = (text: string) => /^https?:\/\//i.test(text)
  const tryHost = (u: string) => {
    try {
      const url = new URL(u)
      return url.hostname.replace(/^www\./, "")
    } catch {
      return u
    }
  }

  // constructor returns the component function Quartz expects
  function CustomProperties({ fileData, allFiles, cfg }: QuartzComponentProps) {
    return () => {
      const fm = (fileData && fileData.frontmatter) || {}
      const files = allFiles ?? []
      const keys = Object.keys(fm).filter((k) => !excludeSet.has(k.toLowerCase()))

      // site base handling (cfg provides baseUrl or site.url)
      const rawBase = (cfg && (cfg.baseUrl || (cfg as any).site?.url)) || ""
      const base = String(rawBase).replace(/\/+$/g, "")

      const findFileByName = (target: string) => {
        const t = target.toLowerCase().replace(/(^\/+|\.md$|\.html$)/g, "")
        return files.find((f: any) => {
          const slug = String(f.slug ?? "").toLowerCase().replace(/^\/+/, "")
          const title = String((f.title ?? "")).toLowerCase()
          if (!slug && !title) return false
          if (slug === t) return true
          if (slug.endsWith("/" + t)) return true
          if (title === t) return true
          // try last segment of slug:
          const last = slug.split("/").pop() || ""
          if (last === t) return true
          return false
        })
      }

      const buildHrefForPage = (pagePart: string) => {
        const [pageOnly, anchor] = pagePart.split("#")
        const file = findFileByName(pageOnly)
        const slug = (file && String(file.slug)) || pageOnly
        const trimmedSlug = String(slug).replace(/^\/+/, "")
        const href = base ? `${base}/${trimmedSlug}` : `/${trimmedSlug}`
        return anchor ? `${href}#${encodeURIComponent(anchor)}` : href
      }

      // Render a single primitive value (string/number/bool)
      const renderPrimitive = (v: any): any => {
        if (v === null || v === undefined || v === "") {
          return <span class="text-gray-500">—</span>
        }

        // string handling
        if (typeof v === "string") {
          const raw = v.trim()

          // External URL
          if (isExternal(raw)) {
            const host = tryHost(raw)
            return (
              <a href={raw} target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">
                {host}
              </a>
            )
          }

          // Obsidian wiki link [[...]]
          const wiki = raw.match(/^\[\[(.+?)\]\]$/)
          if (wiki) {
            const inner = wiki[1]
            // alias split
            const [targetPart, alias] = inner.split("|")
            const display = (alias || (targetPart.split("/").pop() ?? targetPart)).trim()
            const href = buildHrefForPage(targetPart.trim())
            return (
              <a href={href} class="text-blue-600 hover:underline">
                {display}
              </a>
            )
          }

          // Looks like a bare domain (e.g. example.com) -> try to show as link
          if (/^[\w.-]+\.[a-z]{2,}($|\/)/i.test(raw)) {
            const maybe = raw.startsWith("http") ? raw : `https://${raw}`
            const host = tryHost(maybe)
            return (
              <a href={maybe} target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">
                {host}
              </a>
            )
          }

          // fallback: plain text
          return <span>{raw}</span>
        }

        // arrays => list
        if (Array.isArray(v)) {
          return (
            <ul class="list-disc list-inside ml-4">
              {v.map((it: any, idx: number) => (
                <li key={idx}>{renderPrimitive(it)}</li>
              ))}
            </ul>
          )
        }

        // object => render small key: value table
        if (typeof v === "object") {
          return (
            <dl class="ml-2">
              {Object.keys(v).map((kk) => (
                <div key={kk} class="flex gap-2">
                  <dt class="font-medium mr-1">{kk}:</dt>
                  <dd>{renderPrimitive(v[kk])}</dd>
                </div>
              ))}
            </dl>
          )
        }

        // number / boolean fallback
        return <span>{String(v)}</span>
      }

      // We will track keys we've rendered (so Source-Name + Link can be merged)
      const rendered = new Set<string>()

      // Small util to find link/key variants
      const findKey = (names: string[]) => keys.find((k) => names.some((n) => keyIs(k, n)))

      // Build the list items (preserve order of keys)
      const items = keys.map((k) => {
        if (rendered.has(k)) return null

        // Merge Source-Name + Link into a single "Source" entry if both exist
        const sourceNameKey = findKey(["Source-Name", "SourceName", "Source_Name", "sourcename"])
        const linkKey = findKey(["Link", "link", "URL", "url"])

        if (sourceNameKey && linkKey && (k === sourceNameKey || k === linkKey)) {
          // Avoid double rendering: do only once when encountering the earlier of the two in order
          if (rendered.has(sourceNameKey) || rendered.has(linkKey)) return null
          const nameVal = fm[sourceNameKey]
          const linkVal = fm[linkKey]
          rendered.add(sourceNameKey)
          rendered.add(linkKey)

          // Pairing rules:
          // - both scalars -> single linked name
          // - both arrays of same length -> pairwise list
          // - otherwise render name then link(s)
          if (!Array.isArray(nameVal) && !Array.isArray(linkVal)) {
            return (
              <li key={sourceNameKey} class="mb-1">
                <strong>{sourceNameKey}:</strong>{" "}
                {typeof linkVal === "string" && isExternal(linkVal) ? (
                  <a href={linkVal} target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">
                    {String(nameVal) || tryHost(String(linkVal))}
                  </a>
                ) : (
                  <>
                    {renderPrimitive(nameVal)}{" "}
                    {renderPrimitive(linkVal)}
                  </>
                )}
              </li>
            )
          }

          if (Array.isArray(nameVal) && Array.isArray(linkVal) && nameVal.length === linkVal.length) {
            return (
              <li key={sourceNameKey} class="mb-1">
                <strong>Sources:</strong>
                <ul class="list-disc list-inside ml-4">
                  {nameVal.map((nm: any, i: number) => (
                    <li key={i}>
                      {typeof linkVal[i] === "string" && isExternal(String(linkVal[i])) ? (
                        <a href={String(linkVal[i])} target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">
                          {String(nm) || tryHost(String(linkVal[i]))}
                        </a>
                      ) : (
                        <>
                          {renderPrimitive(nm)} {renderPrimitive(linkVal[i])}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            )
          }

          // mixed shapes -> render both cleanly
          return (
            <li key={sourceNameKey} class="mb-1">
              <strong>Sources:</strong>
              <div class="ml-2">
                <div>{renderPrimitive(nameVal)}</div>
                <div>{renderPrimitive(linkVal)}</div>
              </div>
            </li>
          )
        }

        // Otherwise, normal single-key rendering
        rendered.add(k)
        return (
          <li key={k} class="mb-1">
            <strong>{k}:</strong> {renderPrimitive(fm[k])}
          </li>
        )
      })

      // Remove null map entries
      const finalItems = items.filter(Boolean)

      // Nothing to show guard
      if (finalItems.length === 0) {
        return (
          <div class="rounded-2xl shadow-sm p-3 bg-white/90 dark:bg-gray-900/80">
            <details open>
              <summary class="font-semibold">{opts.title}</summary>
              <div class="text-sm text-gray-500 mt-2">No metadata to display.</div>
            </details>
          </div>
        )
      }

      return (
        <div class="rounded-2xl shadow-sm p-3 bg-white/90 dark:bg-gray-900/80">
          <details open>
            <summary class="font-semibold flex items-center gap-2">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                <path d="M12 5v14" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              </svg>
              {opts.title}
            </summary>

            <div class="mt-2 text-sm">
              <ul class="space-y-1">{finalItems}</ul>
            </div>
          </details>
        </div>
      )
    }
  }

  return CustomProperties
}) satisfies QuartzComponentConstructor
