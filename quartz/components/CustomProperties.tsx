// quartz/components/CustomProperties.tsx
import { QuartzComponentConstructor, QuartzComponentProps } from "../types"

const EXCLUDED_KEYS = ["title", "date", "tags"]

// turn Obsidian [[Wiki Links]] into Quartz-style slugs
function resolveLink(value: string): string {
  const wikiLinkMatch = value.match(/^\[\[(.+?)\]\]$/)
  if (wikiLinkMatch) {
    const slug = wikiLinkMatch[1].replace(/\s+/g, "-").toLowerCase()
    return `/${slug}`
  }
  return value
}

export default (() => {
  function CustomProperties({ fileData }: QuartzComponentProps) {
    const fm = fileData.frontmatter ?? {}
    const keys = Object.keys(fm).filter(
      (k) => !EXCLUDED_KEYS.includes(k) && fm[k] !== undefined && fm[k] !== ""
    )

    if (keys.length === 0) return null

    // Alpine-style toggle using data attributes
    return (
      <div class="my-4 p-4 border rounded-lg shadow bg-white" x-data="{ open: true }">
        <button
          class="font-semibold text-lg w-full text-left"
          x-on:click="open = !open"
        >
          <span x-show="open">▼ Credits</span>
          <span x-show="!open">▶ Credits</span>
        </button>

        <div class="mt-2 space-y-2" x-show="open">
          {keys.map((key) => {
            const raw = fm[key]
            const values = Array.isArray(raw) ? raw : [raw]

            return (
              <div class="flex flex-col" key={key}>
                <span class="font-medium capitalize">{key}:</span>
                <div class="ml-4">
                  {values.map((val, i) => {
                    const strVal = String(val).trim()
                    if (strVal.startsWith("http")) {
                      return (
                        <a
                          key={i}
                          href={strVal}
                          class="text-blue-600 underline"
                          target="_blank"
                        >
                          {strVal}
                        </a>
                      )
                    } else if (/^\[\[.+\]\]$/.test(strVal)) {
                      return (
                        <a
                          key={i}
                          href={resolveLink(strVal)}
                          class="text-blue-600 underline"
                        >
                          {strVal.replace(/^\[\[(.+?)\]\]$/, "$1")}
                        </a>
                      )
                    } else {
                      return <span key={i}>{strVal}</span>
                    }
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return CustomProperties
}) satisfies QuartzComponentConstructor
