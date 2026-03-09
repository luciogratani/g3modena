import { useEffect, useRef, useState } from "react"

const INTERACTIVE_SELECTOR =
  'a, button, input, textarea, select, [role="button"], label[for]'

export function CustomCursor() {
  const ringRef = useRef<HTMLDivElement>(null)
  const dotRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)

  const targetRef = useRef({ x: 0, y: 0 })
  const ringRefPos = useRef({ x: 0, y: 0 })
  const visibleRef = useRef(false)

  const [enabled, setEnabled] = useState(false)
  const [visible, setVisible] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)

  useEffect(() => {
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)")
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const updateEnabled = () =>
      setEnabled(finePointer.matches && !reducedMotion.matches)

    updateEnabled()
    finePointer.addEventListener("change", updateEnabled)
    reducedMotion.addEventListener("change", updateEnabled)

    return () => {
      finePointer.removeEventListener("change", updateEnabled)
      reducedMotion.removeEventListener("change", updateEnabled)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return

    const updateHoverState = (target: EventTarget | null) => {
      const element = target as HTMLElement | null
      setHovered(Boolean(element?.closest(INTERACTIVE_SELECTOR)))
    }

    const onPointerMove = (event: PointerEvent) => {
      const x = event.clientX
      const y = event.clientY

      targetRef.current = { x, y }

      if (!visibleRef.current) {
        ringRefPos.current = { x, y }
      }

      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`
      }

      visibleRef.current = true
      setVisible(true)
      updateHoverState(event.target)
    }

    const onPointerDown = () => setPressed(true)
    const onPointerUp = () => setPressed(false)
    const onPointerLeave = () => {
      visibleRef.current = false
      setVisible(false)
    }

    const animate = () => {
      const target = targetRef.current
      const current = ringRefPos.current

      const nextX = current.x + (target.x - current.x) * 0.18
      const nextY = current.y + (target.y - current.y) * 0.18

      ringRefPos.current = { x: nextX, y: nextY }

      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${nextX}px, ${nextY}px, 0) translate(-50%, -50%)`
      }

      rafRef.current = window.requestAnimationFrame(animate)
    }

    rafRef.current = window.requestAnimationFrame(animate)
    document.addEventListener("pointermove", onPointerMove)
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("pointerup", onPointerUp)
    document.addEventListener("pointerleave", onPointerLeave)

    return () => {
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current)
      }
      document.removeEventListener("pointermove", onPointerMove)
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("pointerup", onPointerUp)
      document.removeEventListener("pointerleave", onPointerLeave)
    }
  }, [enabled])

  if (!enabled) return null

  const stateClass = [
    "custom-cursor",
    visible ? "is-visible" : "",
    hovered ? "is-hovered" : "",
    pressed ? "is-pressed" : "",
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <div className={stateClass} aria-hidden="true">
      <div ref={ringRef} className="custom-cursor-ring" />
      <div ref={dotRef} className="custom-cursor-dot" />
    </div>
  )
}
