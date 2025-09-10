// quartz/components/PropertyList.tsx
import { QuartzComponentConstructor, QuartzComponentProps } from "./types"

interface Options {
  exclude?: string[]
}

const defaultOptions: Options = {
  exclude: [],
}

export default ((userOpts?: Options) => {
  const opts = { ...defaultOptions, ...userOpts }

  function PropertyList({ fileData, allFiles, cfg }: QuartzComponentProps) {
    const fm = fileData.frontmatter || {}
    const keys = Object.keys(fm).filter((k) => !opts.exclude.includes(k))

    if (keys.length === 0) {
      return null
    }

    function renderValue(val: any): JSX.Element {
      if (!val) return <span />

      const raw = String(val).trim()

      // External links
      if (/^https?:\/\//i.test(raw)) {
        return (
          <a href={raw} target="_blank" rel="noopener noreferrer">
            {raw}
          </a>
        )
      }

      // Obsidian wiki links [[Page]], [[Page|Alias]], [[Folder/Page]]
      const wiki = raw.match(/^\[\[(.+?)\]\]$/)
      if (wiki) {
        const [target, alias] = wiki[1].split("|")
        const display = alias || target.split("/").pop() || target

        // Find the file in allFiles by slug
        const file = allFiles.find(
          (f) =>
            f.slug.toLowerCase() === target.toLowerCase() ||
            f.slug.toLowerCase().endsWith("/" + target.toLowerCase())
        )

        // Use site root from cfg
        const base = cfg.baseUrl ?? ""
        const href = file ? `${base}/${file.slug}` : "#"

        return <a href={href}>{display}</a>
      }

      // Fallback: just render as text
      return <span>{raw}</span>
    }

    return (
      <details open>
        <summary>Credits</summary>
        <ul>
          {keys.map((k) => (
            <li key={k}>
              <strong>{k}:</strong> {renderValue(fm[k])}
            </li>
          ))}
        </ul>
      </details>
    )
  }

  return PropertyList
}) satisfies QuartzComponentConstructor
