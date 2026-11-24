// Generates consistent input styling depending on whether an error exists.
// Centralizes the styling of input field containers into one reusable function,
// ensuring consistent appearance across forms and allowing error-dependent styling
// to be managed and updated from a single place.
export const fieldShell = (error) =>
  [
    "group flex items-center gap-2.5 rounded-[10px] border bg-surface px-3 transition-[border-color,box-shadow] duration-150 focus-within:ring-4",
    error
      ? "border-live focus-within:border-live focus-within:ring-live/15"
      : "border-line-strong hover:border-fg-3 focus-within:border-primary focus-within:ring-primary/15",
  ].join(" ");
