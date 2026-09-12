export function Screensaver({ onWake }: { settings: unknown; onWake: () => void }) {
  return <div className="fixed inset-0 z-40 bg-black" onPointerDown={onWake} />
}
