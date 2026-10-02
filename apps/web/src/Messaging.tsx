import React, { useEffect, useState, useRef } from "react";
import {
  Folder,
  ChevronLeft,
  ChevronRight,
  X,
  Maximize2,
  Minimize2,
  Clock,
  Send,
  StopCircle,
} from "lucide-react";
export type DraftData = {
  id: string;
  sessionId: string | null;
  tool: string;
  source?: string;
  branch?: string;
  cwd: string;
  title: string;
  markdown: string;
  labels: string[];
  ticket: string;
  revision: number;
  modified: number;
};
export type Delivery = {
  id: string;
  key: string;
  draft: DraftData;
  revision: number;
  status: string;
  execution: string;
  stage: string;
  dueAt: number | null;
  timezone: string;
  error: string;
  nativeTurnId: string;
  nativeThreadId: string;
  acceptedAt: number | null;
  modified: number;
  attempt: number;
};
export type MailRow = {
  id: string;
  kind: "session" | "draft" | "delivery";
  session?: any;
  data?: DraftData | Delivery;
  modified: number;
  preview?: string;
};
export async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const options: RequestInit = {
    method,
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  };
  let r = await fetch("/api/v1/" + path, options);
  if (r.status === 401) {
    await fetch("/api/v1/bootstrap");
    r = await fetch("/api/v1/" + path, options);
  }
  if (!r.ok) {
    let text = "The local service is unavailable.";
    try {
      text = (await r.json()).error || text;
    } catch {}
    throw new Error(text);
  }
  return r.json();
}
export const stateName = (s: string) =>
  ({
    waiting_approval: "Needs approval",
    waiting_input: "Needs input",
    dispatching: "Preparing",
    uncertain: "Delivery uncertain",
    missed: "Missed schedule",
    queued: "Queued",
    scheduled: "Scheduled",
    accepted: "Accepted",
    running: "Working",
    completed: "Completed",
    failed: "Failed",
    interrupted: "Stopped",
    cancelled: "Cancelled",
    unknown: "Unknown",
  })[s] || s;
export function DeliveryRows({
  rows,
  onOpen,
}: {
  rows: MailRow[];
  onOpen: (d: Delivery) => void;
}) {
  return (
    <>
      {rows
        .filter((r) => r.kind === "delivery")
        .map((r) => {
          const d = r.data as Delivery;
          return (
            <div className="draft-row" key={d.id}>
              <Send size={18} />
              <button className="row-main" onClick={() => onOpen(d)}>
                <strong>{d.draft.title}</strong>
                <span className="row-context">
                  <span className="tool-badge">{d.draft.tool}</span>
                  <span title={d.draft.cwd}>
                    {d.draft.cwd.split("/").filter(Boolean).slice(-2).join("/")}
                  </span>
                  <span>{d.draft.markdown.slice(0, 70)}</span>
                  <span
                    className={d.error ? "state-badge warning" : "state-badge"}
                  >
                    {stateName(d.status)}
                    {d.acceptedAt ? " · " + stateName(d.execution) : ""}
                  </span>
                  {d.dueAt && (
                    <span>
                      {new Date(d.dueAt).toLocaleString("en", {
                        timeZone: d.timezone,
                      })}{" "}
                      · {d.timezone}
                    </span>
                  )}
                </span>
              </button>
              <time>
                {new Date(d.modified).toLocaleString("en", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
              <ChevronRight size={16} />
            </div>
          );
        })}
    </>
  );
}
function futureInstant(value: string) {
  const time = new Date(value);
  if (
    !value ||
    !Number.isFinite(time.getTime()) ||
    time.getTime() <= Date.now()
  )
    throw new Error("Choose a future date and time.");
  const [day, clock] = value.split("T");
  const [y, m, d] = day.split("-").map(Number);
  const [h, min] = clock.split(":").map(Number);
  if (
    time.getFullYear() !== y ||
    time.getMonth() !== m - 1 ||
    time.getDate() !== d ||
    time.getHours() !== h ||
    time.getMinutes() !== min
  )
    throw new Error("This local time does not exist. Choose another time.");
  const same = (x: Date) =>
    x.getFullYear() === y &&
    x.getMonth() === m - 1 &&
    x.getDate() === d &&
    x.getHours() === h &&
    x.getMinutes() === min;
  if (
    [30, 60, 90, 120].some(
      (minutes) =>
        same(new Date(time.getTime() - minutes * 60000)) ||
        same(new Date(time.getTime() + minutes * 60000)),
    )
  )
    throw new Error(
      "This local time is ambiguous because the clock changes. Choose an unambiguous time.",
    );
  return time.getTime();
}
export function ScheduleFields({
  onSchedule,
  busy,
}: {
  onSchedule: (due: number, tz: string) => void;
  busy: boolean;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return (
    <div className="schedule-fields">
      <label>
        Send at
        <input
          type="datetime-local"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </label>
      <span className="small muted">Time zone: {zone}</span>
      <button
        className="primary"
        disabled={busy}
        onClick={() => {
          try {
            setError("");
            onSchedule(futureInstant(value), zone);
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        <Clock size={16} />
        Schedule send
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
export function DeliveryDetail({
  delivery,
  onClose,
  onChanged,
  onConversation,
}: {
  delivery: Delivery;
  onClose: () => void;
  onChanged: (d: Delivery) => void;
  onConversation: (sid: string) => void;
}) {
  const [d, setD] = useState(delivery);
  const [text, setText] = useState(d.draft.markdown);
  const [cwd, setCwd] = useState(d.draft.cwd);
  const editRevision = useRef<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [duplicate, setDuplicate] = useState(false);
  const [schedule, setSchedule] = useState(false);
  useEffect(() => {
    let live = true;
    const timer = setInterval(
      () =>
        request<{ delivery: Delivery }>("deliveries/" + delivery.id)
          .then((r) => {
            if (live) {
              setD(r.delivery);
              if (editRevision.current === null) {
                setText(r.delivery.draft.markdown);
                setCwd(r.delivery.draft.cwd);
              }
            }
          })
          .catch(() => {}),
      1500,
    );
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [delivery.id]);
  const active =
    ["running", "waiting_approval", "waiting_input"].includes(d.execution) ||
    d.status === "dispatching";
  const native = d.key?.startsWith("terminal:");
  const pending =
    ["queued", "scheduled", "missed", "failed"].includes(d.status) && !active;
  const editable = pending && !native;
  async function action(name: string, extra: unknown = {}) {
    if (editRevision.current !== null) {
      setError(
        "Save your edits before changing this delivery. Your local text is preserved.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const r = await request<{ delivery: Delivery }>(
        "deliveries/" + d.id + "/actions",
        "POST",
        { revision: d.revision, action: name, ...(extra as object) },
      );
      setD(r.delivery);
      onChanged(r.delivery);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="reader delivery-detail">
      <div className="pane-heading">
        <button className="back" onClick={onClose}>
          <ChevronLeft size={18} />
          Back
        </button>
        <span className="state-badge">
          {stateName(d.status)} · {stateName(d.execution)}
        </span>
      </div>
      <div className="reader-heading">
        <h1>{d.draft.title}</h1>
        <p className="context">
          {d.draft.tool} · {d.draft.cwd}
        </p>
        {d.dueAt && (
          <p className="small muted">
            {new Date(d.dueAt).toLocaleString("en", { timeZone: d.timezone })} ·{" "}
            {d.timezone}
          </p>
        )}
      </div>
      <div className="delivery-content">
        {d.error && (
          <p className="banner error" role="alert">
            {d.error}
          </p>
        )}
        {error && (
          <p className="banner error" role="alert">
            {error}
          </p>
        )}
        {native && (
          <p className="banner">
            This prompt contains native terminal input. Verify its history and
            resume from Open terminal to preserve skills and attachments.
          </p>
        )}
        <label className="field">
          Message
          <textarea
            value={text}
            readOnly={!editable}
            onChange={(e) => {
              editRevision.current ??= d.revision;
              setText(e.target.value);
            }}
            rows={12}
          />
        </label>
        {editable && (
          <FolderPicker
            value={cwd}
            onChange={(value) => {
              editRevision.current ??= d.revision;
              setCwd(value);
            }}
          />
        )}
        {error && editRevision.current !== null && (
          <button
            className="secondary"
            onClick={() =>
              void navigator.clipboard
                .writeText(text)
                .catch(() =>
                  setError("Select and copy the preserved message manually."),
                )
            }
          >
            Copy local message
          </button>
        )}
        {editable && editRevision.current !== null && (
          <button
            className="secondary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await request<{ delivery: Delivery }>(
                  "deliveries/" + d.id,
                  "PATCH",
                  { revision: editRevision.current, markdown: text, cwd },
                );
                editRevision.current = null;
                setError("");
                setD(r.delivery);
                onChanged(r.delivery);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Save message
          </button>
        )}
        <div className="delivery-actions">
          {d.draft.sessionId && (
            <button
              className="secondary"
              onClick={() => onConversation(d.draft.sessionId!)}
            >
              View conversation
            </button>
          )}
          {!native && ["scheduled", "missed"].includes(d.status) && (
            <>
              <button
                className="primary"
                disabled={busy}
                onClick={() => void action("send_now")}
              >
                Send now
              </button>
              <button
                className="secondary"
                onClick={() => setSchedule(!schedule)}
              >
                Reschedule
              </button>
            </>
          )}
          {!native &&
            !active &&
            d.status !== "cancelled" &&
            (d.status === "failed" ||
              ["failed", "interrupted"].includes(d.execution)) && (
              <button
                className="primary"
                disabled={busy}
                onClick={() => void action("retry")}
              >
                Retry
              </button>
            )}
          {!active &&
            d.status !== "cancelled" &&
            (pending ||
              d.status === "uncertain" ||
              ["failed", "interrupted"].includes(d.execution)) && (
              <>
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => void action("skip")}
                >
                  Skip
                </button>
                {!native && (
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() => void action("cancel")}
                  >
                    Cancel and restore draft
                  </button>
                )}
              </>
            )}
        </div>
        {d.status === "uncertain" && (
          <div className="recovery-block">
            <p>
              Check the native history before resending. The original prompt may
              already have run.
            </p>
            <button
              className="secondary"
              disabled={busy}
              onClick={() => void action("reconcile")}
            >
              Verify native outcome
            </button>
            {!native && (
              <>
                <label>
                  <input
                    type="checkbox"
                    checked={duplicate}
                    onChange={(e) => setDuplicate(e.target.checked)}
                  />{" "}
                  I understand resending may repeat the work
                </label>
                <button
                  className="primary"
                  disabled={!duplicate || busy}
                  onClick={() =>
                    void action("resend", { confirmDuplicateRisk: true })
                  }
                >
                  Resend explicitly
                </button>
              </>
            )}
          </div>
        )}
        {schedule && (
          <ScheduleFields
            busy={busy}
            onSchedule={(dueAt, timezone) =>
              void action("reschedule", { dueAt, timezone })
            }
          />
        )}
        <p className="small muted">
          Attempt {d.attempt} ·{" "}
          {d.nativeTurnId
            ? "Native turn: " + d.nativeTurnId
            : "Awaiting native acknowledgement"}
        </p>
      </div>
    </section>
  );
}
type FolderItem = { name: string; path: string; available?: boolean };
type FolderPage = {
  items: FolderItem[];
  path: string;
  root: string;
  parent: string | null;
  offset: number;
  total: number;
  partial: boolean;
};
export function FolderPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [suggestions, setSuggestions] = useState<FolderItem[]>([]);
  const [open, setOpen] = useState(false);
  const [browse, setBrowse] = useState(false);
  const [page, setPage] = useState<FolderPage | null>(null);
  const [path, setPath] = useState("");
  const [error, setError] = useState("");
  const [hidden, setHidden] = useState(false);
  const [loading, setLoading] = useState(false);
  const [index, setIndex] = useState(-1);
  const [crumbs, setCrumbs] = useState<string[]>([]);
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let live = true;
    const timer = setTimeout(async () => {
      try {
        let r = await request<{ items: FolderItem[] }>(
          "folders?" + new URLSearchParams({ q: value }),
        );
        if (value.startsWith("/") && value.includes("/")) {
          const cut = value.lastIndexOf("/");
          try {
            const sub = await request<FolderPage>(
              "folders?" +
                new URLSearchParams({
                  path: value.slice(0, cut) || "/",
                  prefix: value.slice(cut + 1),
                }),
            );
            r = { items: [...r.items, ...sub.items] };
          } catch {}
        }
        if (live) {
          setSuggestions(
            r.items.filter(
              (v, i, a) => a.findIndex((x) => x.path === v.path) === i,
            ),
          );
          setIndex(-1);
        }
      } catch {}
    }, 180);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [value]);
  useEffect(() => {
    if (browse) dialog.current?.showModal();
    else dialog.current?.close();
  }, [browse]);
  async function load(
    next: string,
    root?: string,
    offset = 0,
    showHidden = hidden,
  ) {
    setLoading(true);
    setError("");
    try {
      const r = await request<FolderPage>(
        "folders?" +
          new URLSearchParams({
            path: next,
            root: root || next,
            offset: String(offset),
            hidden: String(showHidden),
          }),
      );
      setPage(r);
      setPath(r.path);
      const parts = r.path.slice(r.root.length).split("/").filter(Boolean);
      setCrumbs([
        r.root,
        ...parts.map(
          (_, i) =>
            r.root.replace(/\/$/, "") + "/" + parts.slice(0, i + 1).join("/"),
        ),
      ]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  const choose = (path: string) => {
    onChange(path);
    setOpen(false);
    setBrowse(false);
    input.current?.focus();
  };
  return (
    <div className="folder-picker">
      <label>
        Working folder
        <div className="folder-input">
          <input
            ref={input}
            aria-label="Working folder"
            value={value}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open && suggestions.length > 0}
            aria-controls="folder-suggestions"
            aria-activedescendant={
              index >= 0 ? "folder-option-" + index : undefined
            }
            placeholder="/home/you/projects/project"
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onChange={(e) => {
              onChange(e.target.value);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setOpen(true);
                setIndex((i) => Math.min(i + 1, suggestions.length - 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setIndex((i) => Math.max(0, i - 1));
              }
              if (e.key === "Enter" && open && index >= 0) {
                e.preventDefault();
                choose(suggestions[index].path);
              }
              if (e.key === "Escape") setOpen(false);
            }}
          />
          <button
            className="secondary"
            type="button"
            onClick={() => {
              setBrowse(true);
              void load(
                value.startsWith("/")
                  ? value
                  : suggestions.find((s) => s.available !== false)?.path ||
                      "/home",
              );
            }}
          >
            <Folder size={16} />
            Browse
          </button>
        </div>
      </label>
      {open && suggestions.length > 0 && (
        <ul
          className="folder-suggestions"
          id="folder-suggestions"
          role="listbox"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.path}
              id={"folder-option-" + i}
              role="option"
              aria-selected={i === index}
              onMouseDown={(e) => e.preventDefault()}
            >
              <button
                tabIndex={-1}
                onClick={() => choose(s.path)}
                disabled={s.available === false}
              >
                <Folder size={14} />
                {s.path}
                {s.available === false && " · Unavailable"}
              </button>
            </li>
          ))}
        </ul>
      )}
      <dialog
        ref={dialog}
        className="folder-dialog"
        aria-labelledby="folder-browser-title"
        onCancel={() => setBrowse(false)}
        onClose={() => {
          setBrowse(false);
          input.current?.focus();
        }}
      >
        <div className="dialog-heading">
          <h2 id="folder-browser-title">Choose working folder</h2>
          <button
            className="icon"
            aria-label="Close folder browser"
            onClick={() => setBrowse(false)}
          >
            <X size={18} />
          </button>
        </div>
        <label className="field">
          Browsing root
          <div className="folder-input">
            <input
              value={path}
              onChange={(e) => setPath(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void load(path);
              }}
            />
            <button className="secondary" onClick={() => void load(path)}>
              Open
            </button>
          </div>
        </label>
        <nav className="folder-crumbs" aria-label="Folder path">
          {crumbs.map((c, i) => (
            <button key={c} title={c} onClick={() => void load(c, page?.root)}>
              {i === 0 ? c : c.split("/").pop()}
              <ChevronRight size={12} />
            </button>
          ))}
        </nav>
        <label className="small">
          <input
            type="checkbox"
            checked={hidden}
            onChange={(e) => {
              setHidden(e.target.checked);
              if (page) void load(page.path, page.root, 0, e.target.checked);
            }}
          />{" "}
          Show hidden folders
        </label>
        {error && (
          <p role="alert" className="banner error">
            {error}
          </p>
        )}
        <div className="folder-list" aria-busy={loading}>
          {page?.parent && (
            <button onClick={() => void load(page.parent!, page.root)}>
              <ChevronLeft size={16} />
              Parent folder
            </button>
          )}
          {page?.items.map((s) => (
            <button key={s.path} onClick={() => void load(s.path, page.root)}>
              <Folder size={16} />
              {s.name}
              <ChevronRight size={14} />
            </button>
          ))}
          {!loading && page?.items.length === 0 && (
            <p className="muted">No subfolders here.</p>
          )}
          {loading && <p role="status">Loading folders…</p>}
        </div>
        {page && (
          <>
            <div className="folder-page">
              <button
                className="secondary"
                disabled={page.offset === 0 || loading}
                onClick={() =>
                  void load(
                    page.path,
                    page.root,
                    Math.max(0, page.offset - 100),
                  )
                }
              >
                Previous
              </button>
              <span>
                {page.offset + page.items.length} / {page.total}
              </span>
              <button
                className="secondary"
                disabled={page.offset + 100 >= page.total || loading}
                onClick={() =>
                  void load(page.path, page.root, page.offset + 100)
                }
              >
                Next
              </button>
            </div>
            {page.partial && (
              <p className="small muted">Some folders could not be read.</p>
            )}
            <button
              className="primary"
              disabled={loading}
              onClick={() => choose(page.path)}
            >
              Use this folder
            </button>
          </>
        )}
      </dialog>
    </div>
  );
}
type NativeRequest = { id: string; state: string; method: string; params: any };
function InteractionCard({
  r,
  onChanged,
}: {
  r: NativeRequest;
  onChanged: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [content, setContent] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const p = r.params;
  const pending = r.state === "pending";
  const question = r.method === "item/tool/requestUserInput";
  const permission = r.method === "item/permissions/requestApproval";
  const nativePermission = r.method === "native/permission";
  const elicitation = r.method === "mcpServer/elicitation/request";
  const fields = p.requestedSchema?.properties || {};
  async function respond(body: unknown) {
    setBusy(true);
    setError("");
    try {
      await request(
        (nativePermission ? "terminal-requests/" : "requests/") +
          r.id +
          "/respond",
        "POST",
        body,
      );
      onChanged();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="interaction-card">
      <h3>
        {question
          ? "Codex needs your input"
          : elicitation
            ? "Connected tool needs input"
            : p.networkApprovalContext
              ? "Network access requested"
              : permission
                ? "Permissions requested"
                : "Approval requested"}
      </h3>
      <p className="small muted">
        {stateName(r.state)}
        {p.cwd ? " · " + p.cwd : ""}
      </p>
      {p.reason && <p>{p.reason}</p>}
      {p.command && <pre>{p.command}</pre>}
      {p.networkApprovalContext && (
        <p>
          {p.networkApprovalContext.protocol} · {p.networkApprovalContext.host}
        </p>
      )}
      {p.grantRoot && <p>Files: {p.grantRoot}</p>}
      {permission && <pre>{JSON.stringify(p.permissions, null, 2)}</pre>}
      {nativePermission && (
        <>
          <p>
            {p.agent} · {p.tool}
          </p>
          <pre>{JSON.stringify(p.input, null, 2)}</pre>
        </>
      )}
      {question &&
        (p.questions || []).map((q: any) => (
          <fieldset key={q.id}>
            <legend>{q.question}</legend>
            {q.options?.map((o: any) => (
              <label className="question-option" key={o.label}>
                <input
                  type="radio"
                  name={r.id + q.id}
                  checked={answers[q.id] === o.label}
                  onChange={() =>
                    setAnswers((a) => ({ ...a, [q.id]: o.label }))
                  }
                  disabled={!pending || busy}
                />
                <span>
                  {o.label}
                  <small>{o.description}</small>
                </span>
              </label>
            ))}
            <label className="field">
              {q.options?.length ? "Your answer" : "Answer"}
              <input
                type={q.isSecret ? "password" : "text"}
                value={answers[q.id] || ""}
                disabled={!pending || busy}
                onChange={(e) =>
                  setAnswers((a) => ({ ...a, [q.id]: e.target.value }))
                }
              />
            </label>
          </fieldset>
        ))}
      {elicitation && (
        <>
          <p>{p.message}</p>
          {p.url && (
            <a href={p.url} target="_blank" rel="noreferrer">
              Open requested page
            </a>
          )}
          {Object.entries(fields).map(([key, schema]) => {
            const f = schema as any;
            return (
              <label className="field" key={key}>
                {f.title || key}
                {f.enum ? (
                  <select
                    disabled={!pending || busy}
                    value={String(content[key] ?? "")}
                    onChange={(e) =>
                      setContent((c) => ({ ...c, [key]: e.target.value }))
                    }
                  >
                    <option value="">Choose…</option>
                    {f.enum.map((v: unknown) => (
                      <option key={String(v)}>{String(v)}</option>
                    ))}
                  </select>
                ) : f.type === "boolean" ? (
                  <input
                    type="checkbox"
                    checked={content[key] === true}
                    disabled={!pending || busy}
                    onChange={(e) =>
                      setContent((c) => ({ ...c, [key]: e.target.checked }))
                    }
                  />
                ) : (
                  <input
                    type={
                      f.type === "integer" || f.type === "number"
                        ? "number"
                        : "text"
                    }
                    value={String(content[key] ?? "")}
                    disabled={!pending || busy}
                    onChange={(e) =>
                      setContent((c) => ({
                        ...c,
                        [key]: ["integer", "number"].includes(f.type)
                          ? Number(e.target.value)
                          : e.target.value,
                      }))
                    }
                  />
                )}
              </label>
            );
          })}
        </>
      )}
      {error && <p role="alert">{error}</p>}
      {pending && (
        <div className="delivery-actions">
          {question ? (
            <button
              className="primary"
              disabled={
                busy ||
                (p.questions || []).some((q: any) => !answers[q.id]?.trim())
              }
              onClick={() => void respond({ answers })}
            >
              Submit answers
            </button>
          ) : elicitation ? (
            <>
              <button
                className="primary"
                disabled={busy}
                onClick={() => void respond({ action: "accept", content })}
              >
                Accept
              </button>
              <button
                className="secondary"
                disabled={busy}
                onClick={() => void respond({ action: "decline" })}
              >
                Decline
              </button>
              <button
                className="secondary"
                disabled={busy}
                onClick={() => void respond({ action: "cancel" })}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              {(permission || nativePermission
                ? ["accept", "decline"]
                : ["accept", "acceptForSession", "decline", "cancel"]
              )
                .filter(
                  (d) =>
                    !p.availableDecisions || p.availableDecisions.includes(d),
                )
                .map((decision) => (
                  <button
                    key={decision}
                    className={decision === "accept" ? "primary" : "secondary"}
                    disabled={busy}
                    onClick={() => void respond({ decision })}
                  >
                    {
                      {
                        accept: "Allow once",
                        acceptForSession: "Allow for session",
                        decline: "Decline",
                        cancel: "Cancel turn",
                      }[decision]
                    }
                  </button>
                ))}
            </>
          )}
        </div>
      )}
    </article>
  );
}
export function ConversationActivity({
  sessionId,
  onUpdate,
  onOpenDelivery,
}: {
  sessionId: string;
  onUpdate: () => void;
  onOpenDelivery: (d: Delivery) => void;
}) {
  const [items, setItems] = useState<any[]>([]);
  const [requests, setRequests] = useState<NativeRequest[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [error, setError] = useState("");
  const [truncated, setTruncated] = useState(false);
  const [stopping, setStopping] = useState(false);
  const callback = useRef(onUpdate);
  callback.current = onUpdate;
  const signature = useRef("");
  async function load() {
    try {
      const r = await request<{
        items: any[];
        requests: NativeRequest[];
        deliveries: Delivery[];
        truncated: boolean;
        historyVersion: number;
      }>("sessions/" + sessionId + "/activity");
      setItems(r.items);
      setRequests(r.requests);
      setDeliveries(r.deliveries);
      setTruncated(r.truncated);
      setError("");
      const next = JSON.stringify([
        r.historyVersion,
        r.items.filter((i) => ["agentMessage", "userMessage"].includes(i.type)),
      ]);
      if (next !== signature.current) {
        signature.current = next;
        callback.current();
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    let alive = true;
    let running = false;
    const update = async () => {
      if (running || !alive) return;
      running = true;
      await load();
      running = false;
    };
    void update();
    const timer = setInterval(() => void update(), 1000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [sessionId]);
  const active = deliveries.find((d) =>
    ["running", "waiting_input", "waiting_approval"].includes(d.execution),
  );
  const current = active || deliveries.at(-1);
  const activity = items.filter(
    (i) =>
      ![
        "userMessage",
        "agentMessage",
        "reasoning",
        "diff",
        "fileChange",
      ].includes(i.type),
  );
  const changes = items.filter((i) => ["diff", "fileChange"].includes(i.type));
  if (!deliveries.length && !requests.length && !items.length)
    return error ? (
      <p role="alert" className="banner error">
        {error}
      </p>
    ) : null;
  return (
    <div className="conversation-activity">
      <div className="runtime-summary">
        <span className="state-badge" role="status">
          {stateName(current?.execution || "unknown")}
        </span>
        <span className="small muted">
          Relai-managed engine · external CLI activity unknown
        </span>
        {active && (
          <button
            className="secondary"
            disabled={stopping}
            onClick={async () => {
              setStopping(true);
              try {
                await request("sessions/" + sessionId + "/interrupt", "POST");
                await load();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setStopping(false);
              }
            }}
          >
            <StopCircle size={16} />
            Stop
          </button>
        )}
      </div>
      {error && (
        <p className="banner error" role="alert">
          {error}
        </p>
      )}
      {requests
        .filter((r) => ["pending", "answering"].includes(r.state))
        .map((r) => (
          <InteractionCard key={r.id} r={r} onChanged={() => void load()} />
        ))}
      {deliveries.some(
        (d) => d.status === "queued" || d.status === "uncertain" || d.error,
      ) && (
        <details
          className="activity-block"
          open={deliveries.some((d) => !!d.error)}
        >
          <summary>Delivery queue and recovery</summary>
          {deliveries
            .filter(
              (d) =>
                d.status === "queued" || d.status === "uncertain" || d.error,
            )
            .map((d) => (
              <button
                className="queue-entry"
                key={d.id}
                onClick={() => onOpenDelivery(d)}
              >
                <span>{d.draft.markdown.slice(0, 80)}</span>
                <span>
                  {stateName(d.status)}
                  {d.error ? " · " + d.error : ""}
                </span>
                <ChevronRight size={16} />
              </button>
            ))}
        </details>
      )}
      {activity.length > 0 && (
        <details className="activity-block">
          <summary>Activity · {activity.length}</summary>
          {activity.map((i, index) => (
            <article key={i.id || index}>
              <strong>
                {i.type === "commandExecution"
                  ? "Command"
                  : i.type === "plan"
                    ? "Plan"
                    : i.type}
              </strong>
              {i.command && <pre>{i.command}</pre>}
              {i.aggregatedOutput && <pre>{i.aggregatedOutput}</pre>}
              {i.plan && <pre>{JSON.stringify(i.plan, null, 2)}</pre>}
              {i.text && <p>{i.text}</p>}
              {i.status && <span className="small muted">{i.status}</span>}
            </article>
          ))}
        </details>
      )}
      {changes.length > 0 && (
        <details className="activity-block">
          <summary>Changes · {changes.length}</summary>
          {changes.map((i, index) => (
            <article key={i.id || index}>
              {i.diff && <pre>{i.diff}</pre>}
              {i.changes?.map((c: any) => (
                <div key={c.path}>
                  <strong>
                    {c.path} · {c.kind?.type || c.kind}
                  </strong>
                  <pre>{c.diff}</pre>
                </div>
              ))}
            </article>
          ))}
        </details>
      )}
      {truncated && (
        <p className="small muted">
          Showing the latest 300 activity items. Full conversation messages
          remain paginated.
        </p>
      )}
    </div>
  );
}
