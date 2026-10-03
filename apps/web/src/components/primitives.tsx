import type { LucideIcon } from "lucide-react";
import { marked } from "marked";
import DOMPurify from "dompurify";
export function IconButton({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  pressed,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
}) {
  return (
    <button
      className="icon"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
    >
      <Icon size={18} />
    </button>
  );
}
export function MarkdownView({ text }: { text: string }) {
  return (
    <div
      className="prose"
      dangerouslySetInnerHTML={{
        __html: DOMPurify.sanitize(
          marked.parse(text, { async: false }) as string,
          { FORBID_TAGS: ["img"], FORBID_ATTR: ["style"] },
        ),
      }}
    />
  );
}
