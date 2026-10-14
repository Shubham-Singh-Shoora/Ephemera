/** A single isometric projection; shared edges meet at identical vertices. */
export function Logo() {
  return (
    <span className="brand">
      <svg viewBox="0 0 32 34" fill="none" aria-hidden="true">
        <g stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 3 28.124 10v14L16 31 3.876 24V10Z" />
          <path d="m3.876 10 12.124 7 12.124-7M16 17v14" />
          <path d="m9.938 6.5 12.124 7v14M22.062 6.5l-12.124 7v14M3.876 17 16 24l12.124-7" />
        </g>
      </svg>
      <span>
        ephemera<span className="brand-period">.</span>
      </span>
    </span>
  );
}
