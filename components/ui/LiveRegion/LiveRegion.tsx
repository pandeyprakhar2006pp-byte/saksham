interface LiveRegionProps {
  message: string
}

export function LiveRegion({ message }: LiveRegionProps) {
  return (
    <div aria-live="polite" className="sr-only">
      {message}
    </div>
  )
}
