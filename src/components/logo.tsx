export function Logo() {
  return (
    <span className="flex items-center gap-2 font-mono text-sm font-medium tracking-[0.2em]">
      <span className="relative flex h-5 w-5 items-center justify-center">
        <span className="absolute left-0 top-0 h-3 w-3 rounded-sm border border-primary" />
        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-sm border border-accent bg-background" />
      </span>
      POOLABS
    </span>
  );
}
