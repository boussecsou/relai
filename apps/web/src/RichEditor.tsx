import { useRef, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import { TableKit } from "@tiptap/extension-table";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { marked } from "marked";
import { Bold, Italic, List, Code, Quote, Heading2, Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
function normalizedMarkdown(text: string): string {
  const normalize = (v: unknown): unknown => {
    if (Array.isArray(v))
      return v
        .filter(
          (x) =>
            !(x && typeof x === "object" && "type" in x && x.type === "space"),
        )
        .map(normalize);
    if (v && typeof v === "object")
      return Object.fromEntries(
        Object.entries(v)
          .filter(
            ([k]) =>
              !["raw", "links"].includes(k) && !(k === "text" && "tokens" in v),
          )
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, val]) => [k, normalize(val)]),
      );
    return v;
  };
  return JSON.stringify(normalize(marked.lexer(text)));
}
export default function RichEditor({
  markdown,
  disabled = false,
  onChange,
  onUnsafe,
}: {
  markdown: string;
  disabled?: boolean;
  onChange: (text: string) => void;
  onUnsafe: () => void;
}) {
  const safe = useRef(false);
  const change = useRef(onChange);
  change.current = onChange;
  const editor = useEditor({
    extensions: [
      StarterKit,
      TableKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      Markdown,
    ],
    content: markdown,
    contentType: "markdown",
    editorProps: {
      attributes: {
        "aria-label": "Relai content",
        role: "textbox",
        "aria-multiline": "true",
      },
    },
    onCreate: ({ editor }) => {
      safe.current =
        normalizedMarkdown(editor.getMarkdown()) ===
        normalizedMarkdown(markdown);
      if (!safe.current) onUnsafe();
    },
    onUpdate: ({ editor }) => {
      if (safe.current) change.current(editor.getMarkdown());
    },
  });
  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);
  if (!editor) return null;
  const tools: [LucideIcon, string, () => void][] = [
    [Bold, "Bold", () => editor.chain().focus().toggleBold().run()],
    [Italic, "Italic", () => editor.chain().focus().toggleItalic().run()],
    [
      Heading2,
      "Heading",
      () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    ],
    [List, "List", () => editor.chain().focus().toggleBulletList().run()],
    [Check, "Task list", () => editor.chain().focus().toggleTaskList().run()],
    [Code, "Code block", () => editor.chain().focus().toggleCodeBlock().run()],
    [Quote, "Quote", () => editor.chain().focus().toggleBlockquote().run()],
  ];
  return (
    <>
      <div className="format-tools" role="toolbar" aria-label="Formatting">
        {tools.map(([Icon, label, fn]) => (
          <button
            className="icon"
            key={label}
            aria-label={label}
            title={label}
            onClick={fn}
          >
            <Icon size={18} />
          </button>
        ))}
      </div>
      <EditorContent editor={editor} />
    </>
  );
}
