// quartz/components/CustomProperties.tsx
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

function CustomProperties({ fileData }: QuartzComponentProps) {
  const frontmatter = fileData.frontmatter
  if (!frontmatter) return null

  const ignoreList = new Set([
    "title", "tags", "date", "publishDate", "draft",
    "aliases", "description", "Publish", "Created",
    "Published", "Cssclasses",
  ])

  const properties = Object.keys(frontmatter).filter(key => {
    if (ignoreList.has(key)) return false
    const value = frontmatter[key]
    return (
      value !== null &&
      value !== undefined &&
      value !== "" &&
      (!Array.isArray(value) || value.length > 0)
    )
  })

  if (properties.length === 0) return null

  return (
    <div class="custom-properties">
      <h3>Metadata</h3>
      <ul class="meta-ul">
        {properties.map(key => {
          const value = frontmatter[key]
          const valueIsLink = typeof value === "string" && value.startsWith("http")
          const formattedKey = key.charAt(0).toUpperCase() + key.slice(1)

          return (
            <li class="meta-li">
              <strong>{formattedKey}:</strong>{" "}
              {valueIsLink ? (
                <a href={value} target="_blank" rel="noopener noreferrer">
                  {value}
                </a>
              ) : Array.isArray(value) ? (
                value.join(", ")
              ) : (
                value
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default CustomProperties satisfies QuartzComponentConstructor
