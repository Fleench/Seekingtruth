// quartz/components/CustomProperties.tsx
import { QuartzComponentConstructor, QuartzComponentProps } from "./types"

function CustomProperties({ fileData }: QuartzComponentProps) {
  const frontmatter = fileData.frontmatter
  if (!frontmatter) return null

  // Keys to suppress entirely
  const ignoreList = new Set([
    "title", "tags", "date", "publishDate", "draft",
    "aliases", "description", "Publish", "Created",
    "Published", "Cssclasses",
  ])

  const properties = Object.entries(frontmatter)
    .filter(([key]) => !ignoreList.has(key)) // drop ignored keys
    .filter(([, value]) => {
      if (value === null || value === undefined) return false
      if (typeof value === "string" && value.trim() === "") return false
      if (Array.isArray(value) && value.length === 0) return false
      if (typeof value === "boolean") return false // hide true/false flags
      if (typeof value === "object" && !(value instanceof Date)) return false // hide random objects
      return true
    })

  if (properties.length === 0) return null

  return (
    <div class="custom-properties">
      <h3>Metadata</h3>
      <ul class="meta-ul">
        {properties.map(([key, value]) => {
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
                String(value)
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default CustomProperties as QuartzComponentConstructor
