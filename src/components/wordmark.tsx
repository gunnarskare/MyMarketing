/** Ordmerket: «spott» der o-en er prikken. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-baseline font-black tracking-[-0.04em] ${className}`}>
      <span className="sr-only">Spott</span>
      <span aria-hidden className="inline-flex items-baseline">
        sp
        <span className="mx-[0.05em] inline-block size-[0.56em] rounded-full bg-spot" />
        tt
      </span>
    </span>
  );
}
