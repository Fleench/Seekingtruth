import { QuartzComponentConstructor } from "../types"

const KnowledgeCards: QuartzComponentConstructor = ({ fileData }) => {
  const events = [
    { year: "2023", text: "Started the SeekingTruth site" },
    { year: "2024", text: "Expanded content and notes" },
    { year: "2025", text: "Still evolving..." },
  ]

  return () => (
    <div class="grid gap-4 md:grid-cols-2">
      {/* About Card */}
      <div class="rounded-2xl shadow-md p-4 bg-white dark:bg-gray-900">
        <h2 class="text-xl font-bold mb-2">About</h2>
        <p class="text-sm">
          This site is a living garden of ideas — weaving notes, sources, and
          reflections into a growing web.
        </p>
      </div>

      {/* Timeline Card */}
      <div class="rounded-2xl shadow-md p-4 bg-white dark:bg-gray-900">
        <h2 class="text-xl font-bold mb-2">Journey</h2>
        <ul class="space-y-1">
          {events.map((e) => (
            <li>
              <span class="font-semibold">{e.year}:</span> {e.text}
            </li>
          ))}
        </ul>
      </div>

      {/* Quote Card */}
      <div class="rounded-2xl shadow-md p-4 bg-white dark:bg-gray-900 italic">
        <p>“Truth is not found in the end, but in the seeking.”</p>
      </div>

      {/* Related Pages Card */}
      {fileData.links && fileData.links.length > 0 && (
        <div class="rounded-2xl shadow-md p-4 bg-white dark:bg-gray-900">
          <h2 class="text-xl font-bold mb-2">Related Pages</h2>
          <ul class="list-disc list-inside space-y-1">
            {fileData.links.map((link) => (
              <li>
                <a
                  href={link.slug}
                  class="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {link.slug}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default KnowledgeCards
