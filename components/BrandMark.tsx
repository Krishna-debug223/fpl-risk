type Props = {
  className?: string;
  title?: string;
};

export default function BrandMark({ className, title = "FPL Risk" }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      focusable="false"
    >
      <rect width="64" height="64" rx="14" fill="#37003c" />
      <path d="M15 13h34v10H25v8h19v10H25v10H15V13Z" fill="#00ff87" />
      <path d="M46 44h7v7h-7z" fill="#04f5ff" />
    </svg>
  );
}
