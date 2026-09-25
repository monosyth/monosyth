// Draw the shop marks so mobile platforms cannot substitute emoji glyphs.
export function ShopStar({ className }: { className?: string }) {
  return <svg className={className} width="1em" height="1em" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true" focusable="false"><path d="M16 1v30M1 16h30M5.4 5.4l21.2 21.2M5.4 26.6L26.6 5.4" /></svg>;
}

export function DiagonalArrow() {
  return <svg width="1em" height="1em" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true" focusable="false" style={{ display: "inline-block", verticalAlign: "-0.1em", flexShrink: 0 }}><path d="M3 13L13 3M4 3h9v9" /></svg>;
}
