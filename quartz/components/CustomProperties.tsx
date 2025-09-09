// quartz/components/CustomProperties.tsx
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { slugify } from "../util/path" // Quartz has a built-in slugify helper

function CustomProperties({ fileData }: QuartzComponentProps) {
  const frontmatter = fileData.frontmatter
  if (!frontmatter) {
    return null
  }

  // A list of properties to ignore from display
  const ignoreList = new Set([
    'title', 'tags', 'date', 'publishdate', 'draft', 'aliases', 'description',
    'publish', 'created', 'published', 'cssclasses'
  ])

  // Function to render values, including links
  function renderValue(value: any): any {
    if (typeof value === "string") {
      // Handle external links
      if (value.startsWith("http")) {
        return (
          <a href={value} target="_blank" rel="noopener noreferrer">
            {value}
          </a>
        )
      }

      // Handle Obsidian-style [[Page]] or [[Page|Alias]]
      const obsidianLink = value.match(/^\[\[(.+?)(\|(.+))?\]\]$/)
      if (obsidianLink) {
        const target = obsidianLink[1] // page name
        const alias = obsidianLink[3] || target
        const href = slugify(target) // use Quartz's slugify for proper URL generation

        return <a href={href}>{alias}</a>
      }

      // Fallback: plain string
      return " " + value
    }

    if (Array.isArray(value)) {
      return (
        <>
          {value.map((v, i) => (
            <span key={i}>
              {renderValue(v)}{i < value.length - 1 ? ", " : ""}
            </span>
          ))}
        </>
      )
    }

    return String(value)
  }

  // Get all property keys, filter out ignored ones and empty values
  const properties = Object.keys(frontmatter)
    .filter(key => !ignoreList.has(key.toLowerCase()))
    .filter(key => {
      const value = frontmatter[key]
      return value !== null && value !== undefined && value !== '' && (!Array.isArray(value) || value.length > 0)
    })

  if (properties.length > 0) {
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
  } else {
    return null
  }
}

export default (() => CustomProperties) satisfies QuartzComponentConstructor
