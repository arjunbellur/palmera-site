// Single scroll event bus — Lenis calls dispatchScroll() once per RAF tick,
// and all components subscribe here instead of each running their own listener.
type Callback = () => void
const callbacks = new Set<Callback>()

export function onScrollFrame(cb: Callback): () => void {
  callbacks.add(cb)
  return () => { callbacks.delete(cb) }
}

export function dispatchScroll(): void {
  callbacks.forEach(cb => cb())
}
