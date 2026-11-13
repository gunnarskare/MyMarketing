/** Spott wordmark: the vermilion dot is the distinctive O. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-baseline font-editorial leading-none tracking-[-0.075em] ${className}`}>
      <span className="sr-only">Spott</span>
      <span aria-hidden className="inline-flex items-baseline">
        sp
        <span className="mx-[0.055em] inline-block size-[0.48em] translate-y-[-0.02em] rounded-full bg-spot" />
        tt
      </span>
    </span>
  );
}
