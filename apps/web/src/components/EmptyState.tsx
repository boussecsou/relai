import {
  ArrowRight,
  Calendar,
  Check,
  FileText,
  Inbox,
  MessagesSquare,
  Search,
  Send,
} from "lucide-react";

const states = {
  inbox: {
    icon: Inbox,
    title: "Your Inbox is clear",
    body: "A little space to think. Replies, questions and approvals from your agents will arrive here.",
    action: "Compose a Relai",
  },
  drafts: {
    icon: FileText,
    title: "Your next idea starts here",
    body: "Write it down now. Your drafts stay on this machine, ready whenever you are.",
    action: "Write your first draft",
  },
  sent: {
    icon: Send,
    title: "Work starts with a message",
    body: "Send a prompt to a new or existing Codex conversation. Track its progress here, from acceptance to completion.",
    action: "Compose a Relai",
  },
  queued: {
    icon: Check,
    title: "Nothing waiting in line",
    body: "Send another prompt while an agent is working. Relai keeps the order and delivers it when the conversation is ready.",
    action: "Compose a Relai",
  },
  scheduled: {
    icon: Calendar,
    title: "Make room for later",
    body: "Prepare a prompt and choose Schedule to deliver it at the right moment. Keep Relai running when it is due.",
    action: "Schedule a Relai",
  },
  sessions: {
    icon: MessagesSquare,
    title: "Bring your conversations together",
    body: "Relai discovers local histories from Codex, Claude Code, OpenCode and Pi. Choose the folders that hold your conversations.",
    action: "Check sources",
  },
  starred: {
    icon: MessagesSquare,
    title: "Keep the important work close",
    body: "Star a conversation in Sessions to make it easy to return to here.",
    action: "View sessions",
  },
  archived: {
    icon: Inbox,
    title: "A place for finished work",
    body: "Archive conversations to put them aside. Their history stays available and you can restore them anytime.",
    action: "View sessions",
  },
};

export function EmptyState({
  scope,
  filtered,
  loading,
  onCompose,
  onSessions,
  onSources,
  onClear,
}: {
  scope: string;
  filtered: boolean;
  loading: boolean;
  onCompose: () => void;
  onSessions: () => void;
  onSources: () => void;
  onClear: () => void;
}) {
  const state = states[scope as keyof typeof states] || states.sessions;
  const Icon = filtered ? Search : state.icon;
  if (loading)
    return (
      <div
        className="list-skeleton"
        role="status"
        aria-label="Loading conversations"
      >
        {[0, 1, 2, 3].map((key) => (
          <div key={key}>
            <i />
            <span />
            <span />
          </div>
        ))}
      </div>
    );
  return (
    <div className="empty workspace-empty">
      <div className="empty-illustration" aria-hidden="true">
        <span className="empty-orbit" />
        <span className="empty-sheet">
          <i />
          <i />
          <i />
        </span>
        <span className="empty-symbol">
          <Icon size={26} strokeWidth={1.5} />
        </span>
      </div>
      <span className="eyebrow">
        {filtered
          ? "Refine your search"
          : scope === "inbox"
            ? "Ready when you are"
            : "Your workspace"}
      </span>
      <h2>{filtered ? "No results" : state.title}</h2>
      <p>
        {filtered
          ? "Nothing matches these filters. Clear them to see all conversations in this view."
          : state.body}
      </p>
      <div className="empty-actions">
        <button
          className="primary"
          onClick={
            filtered
              ? onClear
              : scope === "sessions"
                ? onSources
                : ["starred", "archived"].includes(scope)
                  ? onSessions
                  : onCompose
          }
        >
          {filtered ? "Clear filters" : state.action}
          <ArrowRight size={16} />
        </button>
        {!filtered && scope === "inbox" && (
          <button className="secondary" onClick={onSessions}>
            View sessions
          </button>
        )}
      </div>
      {!filtered && scope === "inbox" && (
        <div className="empty-note">
          <kbd>C</kbd>
          <span>to compose · your drafts are saved locally</span>
        </div>
      )}
    </div>
  );
}
