export function Logo() {
  return (
    <span className="group flex items-center gap-2.5 select-none">
      <span className="relative flex h-8 w-8 items-center justify-center transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110">
        <span className="absolute left-0 top-0 h-5 w-5 -rotate-6 rounded-lg border-2 border-foreground bg-primary shadow-[2px_2px_0_0_var(--foreground)]" />
        <span className="absolute bottom-0 right-0 h-5 w-5 rotate-6 rounded-full border-2 border-foreground bg-accent shadow-[2px_2px_0_0_var(--foreground)] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        <span className="absolute bottom-[9px] right-[9px] h-1 w-1 rounded-full bg-foreground" />
      </span>
      <span
        className="text-lg font-black lowercase tracking-tight text-foreground transition-transform duration-300 group-hover:-rotate-2"
        style={{ fontFamily: "'Fredoka', 'Baloo 2', ui-rounded, system-ui, sans-serif" }}
      >
        poo<span className="text-primary">labs</span>
      </span>
    </span>
  );
}
