/** Eyebrow label + serif section heading used by How / Features / Languages. */
export default function SectionTitle({
  eyebrow,
  children,
  maxWidth = "max-w-[760px]",
  className = "gap-3",
}) {
  return (
    <div className={`flex flex-col items-start ${className}`}>
      <p className="text-xs font-extrabold uppercase leading-4 tracking-[0.14em] text-primary-text">
        {eyebrow}
      </p>
      <h2
        className={`font-serif text-[32px] font-bold leading-10 tracking-[-0.01em] text-fg md:text-[42px] md:leading-[50px] ${maxWidth}`}
      >
        {children}
      </h2>
    </div>
  );
}
