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
          <a
            href={raw}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
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

        return (
          <a href={href} className="text-blue-600 hover:underline">
            {display}
          </a>
        )
      }

      // Fallback: just render as text
      return <span>{raw}</span>
    }

    return (
      <div className="mt-6">
        <div className="rounded-2xl shadow-md border border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              Credits
            </h3>
          </div>
          <div className="p-4">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              {keys.map((k) => (
                <div key={k} className="flex flex-col">
                  <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {k}
                  </dt>
                  <dd className="text-sm text-gray-900 dark:text-gray-200">
                    {renderValue(fm[k])}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    )
  }

  return PropertyList
}) satisfies QuartzComponentConstructor
