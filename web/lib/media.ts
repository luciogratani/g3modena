import type { HeroMediaType } from "@/data/site-content"

export function inferMediaType(src: string | undefined): HeroMediaType {
  if (!src) return "video"
  const normalized = src.split("?")[0]?.toLowerCase() ?? ""
  return /\.(mp4|webm|ogg|mov|m4v)$/i.test(normalized) ? "video" : "image"
}
