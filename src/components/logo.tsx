/** Poolabs mark: a lab flask holding two bubbles — several AI users testing together. */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect x="1" y="1" width="30" height="30" rx="9" fill="var(--primary)" />
      <path d="M12.5 7h7M13.5 7v6.2L8.4 22.6A2.6 2.6 0 0 0 10.7 26.5h10.6a2.6 2.6 0 0 0 2.3-3.9L18.5 13.2V7"
        fill="none" stroke="var(--primary-foreground)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="13.6" cy="21.6" r="2.1" fill="var(--accent)" />
      <circle cx="18.6" cy="20.2" r="1.5" fill="var(--primary-foreground)" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="group flex select-none items-center gap-2">
      <span className="transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105"><LogoMark /></span>
      <span className="text-xl font-bold lowercase tracking-tight text-foreground"
        style={{ fontFamily: "'Fredoka', ui-rounded, system-ui, sans-serif" }}>
        poolabs
      </span>
    </span>
  );
}
