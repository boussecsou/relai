import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Search, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type Command = {
  id: string;
  label: string;
  detail: string;
  icon: LucideIcon;
  run: () => void;
  shortcut?: string;
};

/** A native modal: search stays focused while arrows select a command. */
export function CommandPalette({
  commands,
  onClose,
}: {
  commands: Command[];
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const matches = commands.filter((item) =>
    `${item.label} ${item.detail}`
      .toLowerCase()
      .includes(query.toLowerCase().trim()),
  );
  useEffect(() => {
    const origin = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    input.current?.focus();
    return () => {
      dialog.current?.close();
      origin?.focus();
    };
  }, []);
  useEffect(() => {
    document
      .getElementById(`command-${matches[active]?.id}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, query]);
  function run(command: Command) {
    onClose();
    // Let the dialog restore focus before the command opens its next surface.
    requestAnimationFrame(command.run);
  }
  return (
    <dialog
      ref={dialog}
      className="command-dialog"
      aria-label="Workspace commands"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="command-search">
        <Search size={20} aria-hidden="true" />
        <input
          ref={input}
          placeholder="Where would you like to go?"
          aria-label="Find a command"
          role="combobox"
          aria-expanded="true"
          aria-controls="command-results"
          aria-autocomplete="list"
          aria-activedescendant={
            matches[active] ? `command-${matches[active].id}` : undefined
          }
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={(event) => {
            if (["ArrowDown", "ArrowUp", "Enter"].includes(event.key))
              event.preventDefault();
            if (event.key === "ArrowDown")
              setActive((index) =>
                matches.length ? (index + 1) % matches.length : 0,
              );
            if (event.key === "ArrowUp")
              setActive((index) =>
                matches.length
                  ? (index + matches.length - 1) % matches.length
                  : 0,
              );
            if (event.key === "Enter" && matches[active]) run(matches[active]);
          }}
        />
        <button className="icon" aria-label="Close commands" onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <div
        className="command-list"
        id="command-results"
        role="listbox"
        aria-label="Commands"
      >
        {matches.map((command, index) => (
          <div
            key={command.id}
            id={`command-${command.id}`}
            role="option"
            aria-selected={index === active}
            className="command-option"
            onMouseMove={() => setActive(index)}
            onClick={() => run(command)}
          >
            <command.icon size={19} aria-hidden="true" />
            <span>
              <strong>{command.label}</strong>
              <small>{command.detail}</small>
            </span>
            {command.shortcut ? (
              <kbd>{command.shortcut}</kbd>
            ) : (
              <ArrowUpRight size={15} aria-hidden="true" />
            )}
          </div>
        ))}
      </div>
      {!matches.length && (
        <p className="command-empty" role="status">
          No matching commands. Try “sessions”, “compose” or “sources”.
        </p>
      )}
      <div className="command-footer">
        <span>
          <kbd>↑</kbd> <kbd>↓</kbd> to navigate
        </span>
        <span>
          <kbd>↵</kbd> to open
        </span>
        <span>
          <kbd>esc</kbd> to close
        </span>
      </div>
    </dialog>
  );
}
