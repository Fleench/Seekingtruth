// quartz/components/CustomProperties.tsx
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

function CustomProperties({ fileData }: QuartzComponentProps) {
  const frontmatter = fileData.frontmatter
  if (!frontmatter) {
    return null
  }

  // A list of properties to ignore from display
  // You can customize this list to add or remove property names
  const ignoreList = new Set(['title', 'tags', 'date', 'publishDate', 'draft', 'aliases', 'description','Publish','Created','Published','Cssclasses'])

  // Get all property keys, then filter out the ones to ignore AND the ones with empty values
  const properties = Object.keys(frontmatter)
    .filter(key => !ignoreList.has(key))
    .filter(key => {
      const value = frontmatter[key]
      // Check for non-empty values. This will filter out null, undefined, '', and empty arrays [].
      return value !== null && value !== undefined && value !== '' && (!Array.isArray(value) || value.length > 0)
    })

  // Only render the component if there are properties left to display
  if (properties.length > 0) {
    return (
      <div class="custom-properties">
        <h3>Metadata</h3>
        <ul class="meta-ul">
          {properties.map(key => {
            const value = frontmatter[key]
            const valueIsLink = typeof value === 'string' && value.startsWith('http')
            const formattedKey = key.charAt(0).toUpperCase() + key.slice(1) // Capitalize first letter of the key
            
            return (
              <li class="meta-li" key={key}>
                <strong>{formattedKey}:</strong>
                {valueIsLink
                  ? <a href={value} target="_blank" rel="noopener noreferrer">{value}</a>
                  : ` ${Array.isArray(value) ? value.join(', ') : value}`
                }
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
