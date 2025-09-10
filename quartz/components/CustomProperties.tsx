import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { Card, CardContent } from "@/components/ui/card"
import { motion } from "framer-motion"

// About Card
export const AboutCard: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  return (
    <motion.div className={displayClass} whileHover={{ scale: 1.02 }}>
      <Card className="rounded-2xl shadow-md p-4 bg-white/80 backdrop-blur">
        <CardContent>
          <h2 className="text-xl font-bold mb-2">About</h2>
          <p className="text-base text-gray-700">
            This site is a living garden of notes, fragments, and explorations. Wander freely, connect threads, and discover hidden pathways.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Timeline / Journey Card
export const TimelineCard: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  const timeline = [
    { year: "2023", event: "Launched the Vault" },
    { year: "2024", event: "Expanded into deeper research" },
    { year: "2025", event: "Added public-facing Quartz site" }
  ]

  return (
    <motion.div className={displayClass}>
      <Card className="rounded-2xl shadow-md p-4 bg-white/80 backdrop-blur">
        <CardContent>
          <h2 className="text-xl font-bold mb-2">Journey</h2>
          <ul className="space-y-2">
            {timeline.map((item, i) => (
              <li key={i} className="flex gap-3 items-start">
                <span className="font-semibold text-indigo-600">{item.year}</span>
                <span className="text-gray-700">{item.event}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Quote of the Day Card
export const QuoteCard: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
  const quotes = [
    "The map is not the territory.",
    "Stay curious, wander often.",
    "Connections are where meaning lives.",
    "Knowledge is a garden — tend it daily."
  ]

  const random = quotes[Math.floor(Math.random() * quotes.length)]

  return (
    <motion.div className={displayClass} whileHover={{ rotate: 1 }}>
      <Card className="rounded-2xl shadow-md p-4 bg-gradient-to-r from-indigo-100 to-purple-100">
        <CardContent>
          <blockquote className="italic text-gray-800">“{random}”</blockquote>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Related Pages Card (basic stub — expands Obsidian [[links]])
export const RelatedPages: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
  const links = fileData.links ?? []

  if (links.length === 0) return null

  return (
    <motion.div className={displayClass}>
      <Card className="rounded-2xl shadow-md p-4 bg-white/80 backdrop-blur">
        <CardContent>
          <h2 className="text-xl font-bold mb-2">Related Pages</h2>
          <ul className="list-disc pl-5 text-gray-700">
            {links.map((l, i) => (
              <li key={i}><a href={l.slug} className="text-indigo-600 hover:underline">{l.title}</a></li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default [AboutCard, TimelineCard, QuoteCard, RelatedPages] satisfies QuartzComponentConstructor[]
