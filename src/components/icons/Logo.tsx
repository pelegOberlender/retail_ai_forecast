export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M4 20L8 6L12 16L16 5L20 20"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      <path
        d="M13.6 11L19.6 2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="square"
      />
    </svg>
  );
}
