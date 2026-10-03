import {
  Archive,
  Calendar,
  Clock,
  FileText,
  Inbox,
  MessagesSquare,
  Plus,
  Send,
  Settings2,
  Star,
  Command,
  ArrowUpRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Discovery, Label } from "../lib/types";
import { IconButton } from "./primitives";

export const views: [string, string, LucideIcon][] = [
  ["inbox", "Inbox", Inbox],
  ["sent", "Sent", Send],
  ["drafts", "Drafts", FileText],
  ["queued", "Queued", Clock],
  ["scheduled", "Scheduled", Calendar],
  ["sessions", "Sessions", MessagesSquare],
  ["starred", "Starred", Star],
  ["archived", "Archived", Archive],
];

export function Sidebar({
  scope,
  labelFilter,
  labels,
  draftCount,
  discovery,
  onNavigate,
  onCompose,
  onLabel,
  onSources,
  onCommands,
}: {
  scope: string;
  labelFilter: string;
  labels: Label[];
  draftCount: number;
  discovery: Discovery;
  onNavigate: (view: string, label?: string) => void;
  onCompose: () => void;
  onLabel: (label: Label) => void;
  onSources: () => void;
  onCommands: () => void;
}) {
  const agents = Array.from(
    new Set(discovery.sources.map((source) => source.tool)),
  );
  return (
    <>
      <div className="workspace-identity">
        <span className="workspace-avatar">
          R<span />
        </span>
        <div>
          <strong>Personal workspace</strong>
          <span>Local on this machine</span>
        </div>
      </div>
      <button
        className="compose-button"
        aria-label="Compose a Relai"
        aria-keyshortcuts="c"
        onClick={onCompose}
      >
        <Plus size={18} />
        Compose a Relai<kbd aria-hidden="true">C</kbd>
      </button>
      <nav aria-label="Mailboxes and conversations">
        <div className="nav-divider">
          <span>Workspace</span>
        </div>
        {views.map(([key, name, Icon]) => (
          <div key={key}>
            {key === "sessions" && (
              <div className="nav-divider">
                <span>Library</span>
              </div>
            )}
            <button
              aria-label={name}
              aria-current={scope === key && !labelFilter ? "page" : undefined}
              className={
                "nav " + (scope === key && !labelFilter ? "active" : "")
              }
              onClick={() => onNavigate(key)}
            >
              <Icon size={18} strokeWidth={1.7} />
              <span>{name}</span>
              {key === "drafts" && draftCount > 0 && (
                <span className="count">{draftCount}</span>
              )}
            </button>
          </div>
        ))}
      </nav>
      <div className="section-label">
        <span>Labels</span>
        <IconButton
          icon={Plus}
          label="Create label"
          onClick={() => onLabel({ id: "", name: "", color: "teal" })}
        />
      </div>
      <div className="label-list">
        {labels.length ? (
          labels.map((label) => (
            <div className="label-nav" key={label.id}>
              <button
                className={"nav " + (labelFilter === label.id ? "active" : "")}
                onClick={() => onNavigate("sessions", label.id)}
              >
                <span className={"label-dot " + label.color} />
                <span>{label.name}</span>
              </button>
              <IconButton
                icon={Settings2}
                label={"Edit " + label.name}
                onClick={() => onLabel(label)}
              />
            </div>
          ))
        ) : (
          <p className="sidebar-empty">Give your work a little order.</p>
        )}
      </div>
      <div className="sidebar-bottom">
        <div className="source-heading">
          <span>Connected sources</span>
          <button
            className="icon"
            aria-label="Sources and discovery"
            onClick={onSources}
          >
            <Settings2 size={15} />
          </button>
        </div>
        {agents.map((agent) => {
          const sources = discovery.sources.filter(
            (source) => source.tool === agent,
          );
          const count = sources.reduce(
            (total, source) => total + (source.count || 0),
            0,
          );
          const partial = sources.some((source) => source.status === "partial");
          return (
            <button
              className="source-link"
              key={agent}
              onClick={onSources}
              aria-label={`${agent}: ${count} histories${partial ? ", partial discovery" : ""}`}
            >
              <span
                className={
                  "agent-mark " + agent.toLowerCase().replaceAll(" ", "-")
                }
              >
                {agent === "Claude Code" ? "✳" : agent.slice(0, 1)}
              </span>
              <span>{agent}</span>
              <span className="source-count">
                {discovery.scanning ? "…" : count}
              </span>
              {partial && <span title="Partial discovery">!</span>}
            </button>
          );
        })}
        {!agents.length && (
          <button className="source-link" onClick={onSources}>
            Configure sources
            <ArrowUpRight size={14} />
          </button>
        )}
        <button className="nav command-trigger" onClick={onCommands}>
          <Command size={16} />
          <span>Commands</span>
          <kbd>⇧⌘P</kbd>
        </button>
      </div>
    </>
  );
}
