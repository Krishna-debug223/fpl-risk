import type { SVGProps } from "react";

const base = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
export function ShieldIcon(props: SVGProps<SVGSVGElement>) { return <svg {...base} {...props}><path d="M12 3 5 6v5c0 4.6 2.8 8.3 7 10 4.2-1.7 7-5.4 7-10V6l-7-3Z"/><path d="m9.5 12 1.6 1.6 3.6-4"/></svg>; }
export function BoltIcon(props: SVGProps<SVGSVGElement>) { return <svg {...base} {...props}><path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z"/></svg>; }
export function GridIcon(props: SVGProps<SVGSVGElement>) { return <svg {...base} {...props}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>; }
export function SwapIcon(props: SVGProps<SVGSVGElement>) { return <svg {...base} {...props}><path d="M7 7h11l-3-3"/><path d="m18 7-3 3"/><path d="M17 17H6l3 3"/><path d="m6 17 3-3"/></svg>; }
export function MarketIcon(props: SVGProps<SVGSVGElement>) { return <svg {...base} {...props}><path d="M4 19V9"/><path d="M10 19V5"/><path d="M16 19v-7"/><path d="M22 19V3"/><path d="M2 19h21"/></svg>; }
export function ArrowIcon(props: SVGProps<SVGSVGElement>) { return <svg {...base} {...props}><path d="M5 12h14"/><path d="m14 7 5 5-5 5"/></svg>; }
export function RefreshIcon(props: SVGProps<SVGSVGElement>) { return <svg {...base} {...props}><path d="M20 7v5h-5"/><path d="M4 17v-5h5"/><path d="M6.1 8A7 7 0 0 1 18 6l2 1"/><path d="m4 17 2 1a7 7 0 0 0 11.9-2"/></svg>; }
