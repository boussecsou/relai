import React, { useState, useEffect, useRef, useCallback } from "react";
import { createRoot } from "react-dom/client";
import {
  Send,
  FileText,
  Calendar,
  MessagesSquare,
  Star,
  Archive,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Sun,
  Moon,
  Menu,
  X,
  Folder,
  GitBranch,
  ArrowUpRight,
  Copy,
  Download,
  Check,
  Settings2,
  Trash2,
} from "lucide-react";
import "./style.css";
import "./workspace.css";
import { Sidebar, views } from "./components/Sidebar";
import { CommandPalette } from "./components/CommandPalette";
import { EmptyState } from "./components/EmptyState";
import { readLocation, writeLocation } from "./lib/navigation";
import { Command, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import {
  FolderPicker,
  ScheduleFields,
  DeliveryRows,
  DeliveryDetail,
  ConversationActivity,
  stateName,
} from "./Messaging";
import type { MailRow, Delivery } from "./Messaging";
const TerminalPanel = React.lazy(() =>
  import("./TerminalPanel").then((m) => ({ default: m.TerminalPanel })),
);
import { Maximize2, Minimize2 } from "lucide-react";
import type {
  Label,
  Annotations,
  Session,
  Draft,
  Message,
  Page,
  Discovery,
} from "./lib/types";
import { api, ApiError } from "./lib/api";
import { date, folder } from "./lib/format";
import { IconButton, MarkdownView } from "./components/primitives";
const RichEditor = React.lazy(() => import("./RichEditor"));
function App() {
  const initialLocation = useRef(readLocation()).current;
  const [hasLoadedMailbox, setHasLoadedMailbox] = useState(false);
  const [commandsOpen, setCommandsOpen] = useState(false);
  const [focusReader, setFocusReader] = useState(false);
  const [narrow, setNarrow] = useState(
    () => window.matchMedia("(max-width: 720px)").matches,
  );
  const sidebarRef = useRef<HTMLElement>(null);
  const locationView = useRef(initialLocation.view);

  const [mailRows, setMailRows] = useState<MailRow[]>([]),
    [scope, setScope] = useState(initialLocation.view);
  const [deliveryDetail, setDeliveryDetail] = useState<Delivery | null>(null);
  const [expanded, setExpanded] = useState(false),
    [submitting, setSubmitting] = useState(false),
    [scheduling, setScheduling] = useState(false);
  const [triage, setTriage] = useState("all");
  const [triageCounts, setTriageCounts] = useState<Record<string, number>>({});
  const [terminalView, setTerminalView] = useState(false);
  const composeRef = useRef<HTMLDialogElement>(null);
  const [replyContext, setReplyContext] = useState("");
  const [sourceRoots, setSourceRoots] = useState<
    { tool: string; path: string }[]
  >([]);
  const sendKey = useRef<{ draftId: string; key: string } | null>(null);
  const [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [toast, setToast] = useState("");
  const [view, setView] = useState(initialLocation.view),
    [labelFilter, setLabelFilter] = useState(initialLocation.label),
    [tool, setTool] = useState(initialLocation.tool),
    [q, setQ] = useState(initialLocation.q),
    [search, setSearch] = useState(initialLocation.q);
  const [page, setPage] = useState<Page>({
      items: [],
      total: 0,
      offset: 0,
      limit: 100,
    }),
    [offset, setOffset] = useState(0),
    [loading, setLoading] = useState(false);
  const [discovery, setDiscovery] = useState<Discovery>({
      scanning: true,
      sources: [],
      indexing: false,
      indexErrors: 0,
    }),
    [labels, setLabels] = useState<Label[]>([]),
    [drafts, setDrafts] = useState<Draft[]>([]);
  const [theme, setTheme] = useState("dark"),
    [compact, setCompact] = useState(false),
    [mobile, setMobile] = useState(false);
  const [session, setSession] = useState<Session | null>(null),
    [messages, setMessages] = useState<Message[]>([]),
    [before, setBefore] = useState(0),
    [historyLoading, setHistoryLoading] = useState(false),
    [historyError, setHistoryError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null),
    [mode, setMode] = useState("visual"),
    [saveState, setSaveState] = useState("Saved"),
    [saveError, setSaveError] = useState("");
  const [recipientOpen, setRecipientOpen] = useState(false),
    [recipientQ, setRecipientQ] = useState(""),
    [recipients, setRecipients] = useState<Session[]>([]);
  const [selection, setSelection] = useState<Set<string>>(new Set()),
    [reload, setReload] = useState(0);
  const [rootsEdit, setRootsEdit] = useState<{ tool: string; path: string }[]>(
      [],
    ),
    [rootsDirty, setRootsDirty] = useState(false),
    [dialog, setDialog] = useState(""),
    [labelEdit, setLabelEdit] = useState<Label>({
      id: "",
      name: "",
      color: "teal",
    });
  const annotationsQueue = useRef(new Map<string, Promise<unknown>>());
  const historyGeneration = useRef(0);
  const searchRef = useRef<HTMLInputElement>(null),
    dialogRef = useRef<HTMLDialogElement>(null),
    scrollRef = useRef<HTMLDivElement>(null),
    scrollPosition = useRef(0);
  const draftRef = useRef<Draft | null>(null),
    dirty = useRef(false),
    version = useRef(0),
    savePromise = useRef<Promise<boolean> | null>(null),
    conflict = useRef(false);
  const hasDraft = !!draft;
  useEffect(() => {
    const element = composeRef.current;
    if (hasDraft && element && !element.open) element.showModal();
    return () => {
      if (element?.open) element.close();
    };
  }, [hasDraft]);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 720px)");
    const update = () => {
      setNarrow(media.matches);
      if (!media.matches) setMobile(false);
    };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!mobile || !narrow) return;
    const trigger = document.querySelector<HTMLButtonElement>(
      '[aria-label="Open navigation"]',
    );
    sidebarRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => trigger?.focus();
  }, [mobile, narrow]);
  useEffect(() => {
    writeLocation(
      view,
      search,
      tool,
      labelFilter,
      locationView.current !== view,
    );
    locationView.current = view;
    document.title = `${session?.title || views.find(([key]) => key === view)?.[1] || "Workspace"} — Relai`;
  }, [view, search, tool, labelFilter, session?.title]);
  useEffect(() => {
    const restore = () => {
      void closeDraft().then((closed) => {
        if (!closed) {
          writeLocation(view, search, tool, labelFilter, false);
          return;
        }
        const next = readLocation();
        locationView.current = next.view;
        historyGeneration.current++;
        setView(next.view);
        setScope(next.view);
        setQ(next.q);
        setSearch(next.q);
        setTool(next.tool);
        setLabelFilter(next.label);
        setSession(null);
        setDeliveryDetail(null);
        setTerminalView(false);
        setOffset(0);
        setSelection(new Set());
        setTriage("all");
      });
    };
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  });
  const nativeCatalogue =
    ["sessions", "starred", "archived"].includes(scope) || !!labelFilter;
  const catalogue = nativeCatalogue || scope === "inbox";
  const alert = (e: unknown) =>
    setError(e instanceof Error ? e.message : "An error occurred.");
  const flash = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(""), 3500);
  };
  const loadMeta = useCallback(async () => {
    const results = await Promise.all([
      api<Discovery>("discovery"),
      api<Label[]>("labels"),
      api<Draft[]>("drafts"),
      api<{ tool: string; path: string }[]>("roots"),
    ]);
    setDiscovery(results[0]);
    setLabels(results[1]);
    setDrafts(results[2]);
    setSourceRoots(results[3]);
  }, []);
  useEffect(() => {
    let alive = true;
    api("bootstrap")
      .then(() =>
        Promise.all([
          loadMeta(),
          api<{ theme: string; compact: boolean }>("preferences"),
        ]),
      )
      .then(([, prefs]) => {
        if (alive) {
          setTheme(prefs.theme);
          setCompact(prefs.compact);
          setReady(true);
          setError("");
        }
      })
      .catch(alert);
    return () => {
      alive = false;
    };
  }, [loadMeta]);
  useEffect(() => {
    if (!ready) return;
    const events = new EventSource("/api/v1/events");
    let timer: ReturnType<typeof setTimeout>;
    events.onmessage = (event) => {
      try {
        if (JSON.parse(event.data).kind === "runtime") return;
      } catch {}
      clearTimeout(timer);
      timer = setTimeout(() => {
        loadMeta().catch(alert);
        setReload((n) => n + 1);
      }, 300);
    };
    events.onerror = () => setError("Connection lost. Reconnecting…");
    events.addEventListener("resync", () => {
      setReload((n) => n + 1);
      void loadMeta().catch(alert);
    });
    events.onopen = () => {
      setError("");
      setReload((n) => n + 1);
      void loadMeta().catch(alert);
    };
    return () => {
      clearTimeout(timer);
      events.close();
    };
  }, [ready, loadMeta]);
  useEffect(() => {
    if (!ready) return;
    const timer = setInterval(() => {
      loadMeta().catch(alert);
      setReload((n) => n + 1);
    }, 5000);
    return () => clearInterval(timer);
  }, [ready, loadMeta]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(q);
      setOffset(0);
    }, 170);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    if (!ready) return;
    let alive = true;
    setLoading(true);
    api<{
      items: MailRow[];
      total: number;
      offset: number;
      limit: number;
      scope: string;
    }>(
      "mailbox?" +
        new URLSearchParams({
          q: search,
          view: labelFilter ? "sessions" : view,
          tool,
          triage,
          label: labelFilter,
          offset: String(offset),
        }),
    )
      .then((p) => {
        if (alive) {
          setTriageCounts(
            (p as typeof p & { triageCounts?: Record<string, number> })
              .triageCounts || {},
          );
          setHasLoadedMailbox(true);
          setMailRows(p.items);
          setScope(p.scope);
          setPage({
            ...p,
            items: p.items
              .filter(
                (r): r is MailRow & { session: Session } =>
                  r.kind === "session" && !!r.session,
              )
              .map((r) => ({
                ...r.session,
                modified: r.modified,
                preview: r.preview,
              })),
          });
          setError("");
          setLoading(false);
        }
      })
      .catch((e) => {
        if (alive) {
          alert(e);
          setMailRows([]);
          setPage((p) => ({ ...p, items: [], total: 0 }));
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, [ready, search, view, tool, triage, labelFilter, offset, reload]);
  useEffect(() => {
    let live = true;
    setReplyContext("");
    if (draft?.sessionId)
      void api<{ items: Message[] }>(
        "sessions/" + draft.sessionId + "/messages",
      )
        .then((r) => {
          if (live)
            setReplyContext(
              r.items.filter((m) => !m.activity).at(-1)?.text || "",
            );
        })
        .catch(() => {});
    return () => {
      live = false;
    };
  }, [draft?.sessionId]);
  useEffect(() => {
    if (!recipientOpen) return;
    let alive = true;
    const t = setTimeout(() => {
      api<Page>("sessions?" + new URLSearchParams({ q: recipientQ }))
        .then((p) => {
          if (alive) setRecipients(p.items);
        })
        .catch(alert);
    }, 170);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [recipientOpen, recipientQ, reload]);
  useEffect(() => {
    if (dialog) dialogRef.current?.showModal();
    else dialogRef.current?.close();
    if (dialog === "sources") {
      api<{ tool: string; path: string }[]>("roots")
        .then((r) => {
          setRootsEdit(r);
          setRootsDirty(false);
        })
        .catch(alert);
    }
  }, [dialog]);
  const save = useCallback(async (): Promise<boolean> => {
    if (savePromise.current) {
      await savePromise.current;
      return dirty.current && !conflict.current ? save() : !dirty.current;
    }
    if (!dirty.current || !draftRef.current) return true;
    if (conflict.current) return false;
    const snapshot = { ...draftRef.current },
      v = version.current;
    setSaveState("Saving…");
    const promise = (async () => {
      try {
        const saved = await api<Draft>(
          "drafts/" + snapshot.id,
          "PUT",
          snapshot,
        );
        if (draftRef.current?.id === saved.id) {
          draftRef.current = {
            ...draftRef.current,
            revision: saved.revision,
            modified: saved.modified,
          };
          setDraft({ ...draftRef.current });
          if (version.current === v) {
            dirty.current = false;
            setSaveState("Saved");
            setSaveError("");
          } else setSaveState("Unsaved changes");
        }
        return true;
      } catch (e) {
        if (e instanceof ApiError && e.status === 409) conflict.current = true;
        setSaveError(
          e instanceof Error ? e.message : "Draft could not be saved.",
        );
        setSaveState("Not saved");
        return false;
      } finally {
        savePromise.current = null;
      }
    })();
    savePromise.current = promise;
    return promise;
  }, []);
  function edit(patch: Partial<Draft>) {
    if (!draftRef.current || submitting) return;
    draftRef.current = { ...draftRef.current, ...patch };
    version.current++;
    dirty.current = true;
    setDraft({ ...draftRef.current });
    setSaveState("Unsaved changes");
  }
  useEffect(() => {
    if (!draft || !dirty.current) return;
    const t = setTimeout(() => void save(), 500);
    return () => clearTimeout(t);
  }, [draft, save]);
  useEffect(() => {
    const unload = (e: BeforeUnloadEvent) => {
      if (dirty.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", unload);
    return () => window.removeEventListener("beforeunload", unload);
  }, []);
  async function closeDraft() {
    do {
      if (!(await save())) return false;
    } while (dirty.current);
    draftRef.current = null;
    dirty.current = false;
    setDraft(null);
    setRecipientOpen(false);
    setExpanded(false);
    setScheduling(false);
    setReload((n) => n + 1);
    loadMeta().catch(alert);
    return true;
  }
  async function submitDelivery(dueAt?: number, timezone?: string) {
    if (submitting) return;
    if (!(await save()) || dirty.current || !draftRef.current) return;
    const snapshot = { ...draftRef.current };
    const contentVersion = version.current;
    if (sendKey.current?.draftId !== snapshot.id)
      sendKey.current = { draftId: snapshot.id, key: crypto.randomUUID() };
    setSubmitting(true);
    setSaveError("");
    try {
      const result = await api<Delivery>("deliveries", "POST", {
        draftId: snapshot.id,
        revision: snapshot.revision,
        idempotencyKey: sendKey.current!.key,
        dueAt,
        timezone,
      });
      if (version.current !== contentVersion && draftRef.current) {
        await copyConflict();
      } else {
        draftRef.current = null;
        dirty.current = false;
        setDraft(null);
      }
      sendKey.current = null;
      setScheduling(false);
      setExpanded(false);
      setSession(null);
      setDeliveryDetail(result);
      setReload((n) => n + 1);
      await loadMeta();
      flash(dueAt ? "Relai scheduled." : "Relai saved for delivery.");
    } catch (e) {
      setSaveError(
        e instanceof Error
          ? e.message
          : "Submission failed. Your text is preserved.",
      );
    } finally {
      setSubmitting(false);
    }
  }
  async function navigate(next: string, label = "") {
    if (!(await closeDraft())) return;
    historyGeneration.current++;
    setView(next);
    setScope(next);
    setDeliveryDetail(null);
    setLabelFilter(label);
    setSession(null);
    setTerminalView(false);
    setTriage("all");
    setSelection(new Set());
    setOffset(0);
    setMobile(false);
    setQ("");
    scrollPosition.current = 0;
  }
  async function openDraft(d: Draft) {
    if (!(await closeDraft())) return;
    draftRef.current = { ...d };
    dirty.current = false;
    conflict.current = false;
    setDraft({ ...d });
    setDeliveryDetail(null);
    setSubmitting(false);
    setSaveState("Saved");
    setSaveError("");
    setMode(d.markdown ? "markdown" : "visual");
    setRecipientOpen(false);
    setMobile(false);
  }
  async function compose(target?: Session) {
    if (!(await closeDraft())) return;
    try {
      const d = await api<Draft>("drafts", "POST");
      await openDraft(d);
      if (target)
        edit({
          sessionId: target.id,
          tool: target.tool,
          cwd: target.cwd,
          branch: target.branch,
          title: target.title,
        });
    } catch (e) {
      alert(e);
    }
  }
  async function read(s: Session) {
    if (!(await closeDraft())) return;
    const generation = ++historyGeneration.current;
    scrollPosition.current = scrollRef.current?.scrollTop || 0;
    setSession(s);
    setTerminalView(false);
    if (s.annotations.unread) void annotate(s, { unread: false }).catch(alert);
    setMessages([]);
    setHistoryError("");
    setHistoryLoading(true);
    setBefore(0);
    setMobile(false);
    try {
      const result = await api<{ items: Message[]; before: number }>(
        "sessions/" + s.id + "/messages",
      );
      if (generation === historyGeneration.current) {
        setMessages(result.items);
        setBefore(result.before);
      }
    } catch (e) {
      if (generation === historyGeneration.current)
        setHistoryError(
          e instanceof Error ? e.message : "History could not be read.",
        );
    } finally {
      if (generation === historyGeneration.current) setHistoryLoading(false);
    }
  }
  async function older() {
    if (!session) return;
    setHistoryLoading(true);
    try {
      const r = await api<{ items: Message[]; before: number }>(
        "sessions/" + session.id + "/messages?before=" + before,
      );
      setMessages((m) => [...r.items, ...m]);
      setBefore(r.before);
    } catch (e) {
      alert(e);
    } finally {
      setHistoryLoading(false);
    }
  }
  function back() {
    historyGeneration.current++;
    setSession(null);
    requestAnimationFrame(() => {
      if (scrollRef.current)
        scrollRef.current.scrollTop = scrollPosition.current;
    });
  }
  async function annotate(s: Session, patch: Partial<Annotations>) {
    setPage((p) => ({
      ...p,
      items: p.items.map((x) =>
        x.id === s.id
          ? { ...x, annotations: { ...x.annotations, ...patch } }
          : x,
      ),
    }));
    setSession((current) =>
      current?.id === s.id
        ? { ...current, annotations: { ...current.annotations, ...patch } }
        : current,
    );
    const previous = annotationsQueue.current.get(s.id) || Promise.resolve();
    const request = previous
      .catch(() => {})
      .then(() => api<Annotations>("sessions/" + s.id, "PATCH", patch));
    annotationsQueue.current.set(s.id, request);
    try {
      await request;
      if (annotationsQueue.current.get(s.id) === request) {
        annotationsQueue.current.delete(s.id);
        setReload((n) => n + 1);
      }
    } catch (e) {
      alert(e);
      setReload((n) => n + 1);
    }
  }
  async function bulk(patch: Partial<Annotations>) {
    for (const s of page.items.filter((s) => selection.has(s.id)))
      await annotate(s, patch);
    setSelection(new Set());
    flash("Conversations updated.");
  }
  async function preferences(nextTheme = theme, nextCompact = compact) {
    try {
      await api("preferences", "PUT", {
        theme: nextTheme,
        compact: nextCompact,
      });
      setTheme(nextTheme);
      setCompact(nextCompact);
    } catch (e) {
      alert(e);
    }
  }
  async function copy() {
    if (!draftRef.current) return;
    try {
      await navigator.clipboard.writeText(draftRef.current.markdown);
      flash("Relai copied.");
    } catch {
      flash("Copy is unavailable. Use Export.");
    }
  }
  function download() {
    if (!draftRef.current) return;
    const d = draftRef.current;
    const url = URL.createObjectURL(
      new Blob([d.markdown], { type: "text/markdown;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download =
      (d.title || "relai").replace(/[^\p{L}\p{N}_-]/gu, "-").slice(0, 80) +
      ".md";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function copyConflict() {
    if (!draftRef.current) return;
    try {
      const copy = await api<Draft>("drafts", "POST");
      const saved = await api<Draft>("drafts/" + copy.id, "PUT", {
        ...draftRef.current,
        id: copy.id,
        revision: copy.revision,
      });
      dirty.current = false;
      conflict.current = false;
      draftRef.current = saved;
      setDraft(saved);
      setSaveError("");
      setSaveState("Copy saved");
      loadMeta().catch(alert);
    } catch (e) {
      alert(e);
    }
  }
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(".terminal-panel")) return;
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "p" &&
        !target.closest("dialog")
      ) {
        e.preventDefault();
        setCommandsOpen(true);
        return;
      }
      const editing = target.closest(
        "input,textarea,select,[contenteditable=true],dialog",
      );
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (editing || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Escape") {
        if (draft) void closeDraft();
        else if (session) back();
        else setMobile(false);
      }
      if (e.key === "?") setCommandsOpen(true);
      if (e.key.toLowerCase() === "c") void compose();
      if (e.key.toLowerCase() === "r" && session) void compose(session);
      if (session && ["j", "k"].includes(e.key)) {
        const i =
          page.items.findIndex((s) => s.id === session.id) +
          (e.key === "j" ? 1 : -1);
        if (page.items[i]) void read(page.items[i]);
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  });
  const title = labelFilter
    ? labels.find((l) => l.id === labelFilter)?.name || "Label"
    : views.find(([key]) => key === scope)?.[1] ||
      (view === "starred" ? "Starred" : "Archived");
  const labelChips = (ids: string[]) => (
    <span className="chips">
      {ids.map((id) => {
        const l = labels.find((l) => l.id === id);
        return l ? (
          <span key={id} className={"chip " + l.color}>
            {l.name}
          </span>
        ) : null;
      })}
    </span>
  );
  const chooseLabels = (ids: string[], change: (ids: string[]) => void) => (
    <div className="label-choices">
      {labels.length ? (
        labels.map((l) => (
          <label key={l.id} className={"chip " + l.color}>
            <input
              type="checkbox"
              checked={ids.includes(l.id)}
              onChange={(e) =>
                change(
                  e.target.checked
                    ? [...ids, l.id]
                    : ids.filter((id) => id !== l.id),
                )
              }
            />
            {l.name}
          </label>
        ))
      ) : (
        <span className="muted">No labels yet. Create one in the sidebar.</span>
      )}
    </div>
  );
  const listContent = (
    <section className="list-panel" aria-label={title}>
      <div className="list-heading">
        <h1>
          {title}
          <span>{page.total}</span>
        </h1>
        <div className="actions">
          <IconButton
            icon={RefreshCw}
            label="Refresh discovery"
            onClick={() =>
              void api("discovery", "POST")
                .then(() => loadMeta())
                .catch(alert)
            }
          />
          <IconButton
            icon={Settings2}
            label={compact ? "Comfortable density" : "Compact density"}
            pressed={compact}
            onClick={() => void preferences(theme, !compact)}
          />
        </div>
      </div>
      {
        <>
          <div className="filters">
            <span className="small muted">
              {scope === "inbox"
                ? "Received returns"
                : nativeCatalogue
                  ? "Detected histories"
                  : scope === "drafts"
                    ? "Saved drafts"
                    : "Deliveries"}
            </span>
            <label>
              Agent
              <select
                aria-label="Filter by agent"
                value={tool}
                onChange={(e) => {
                  setTool(e.target.value);
                  setOffset(0);
                }}
              >
                <option value="">All</option>
                {Array.from(
                  new Set([
                    "Codex",
                    "Claude Code",
                    "OpenCode",
                    "Pi",
                    ...discovery.sources.map((s) => s.tool),
                  ]),
                ).map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <span className="small muted">
              {discovery.scanning
                ? "Discovering…"
                : "External agent activity unknown"}
            </span>
          </div>
          {(tool || search) && (
            <div className="filter-chips">
              {tool && (
                <button
                  onClick={() => {
                    setTool("");
                    setOffset(0);
                  }}
                  aria-label="Remove agent filter"
                >
                  {tool}
                  <X size={14} />
                </button>
              )}
              {search && (
                <button onClick={() => setQ("")} aria-label="Clear search">
                  {search}
                  <X size={14} />
                </button>
              )}
              <button
                onClick={() => {
                  setTool("");
                  setQ("");
                  setOffset(0);
                }}
              >
                Clear filters
              </button>
            </div>
          )}
          {scope === "inbox" && (
            <div
              className="inbox-tabs"
              role="tablist"
              aria-label="Inbox categories"
            >
              {[
                ["all", "All"],
                ["attention", "Needs attention"],
                ["replies", "Replies"],
              ].map(([key, name]) => (
                <button
                  key={key}
                  role="tab"
                  tabIndex={triage === key ? 0 : -1}
                  onKeyDown={(e) => {
                    if (
                      !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                        e.key,
                      )
                    )
                      return;
                    e.preventDefault();
                    const tabs = ["all", "attention", "replies"];
                    const index =
                      e.key === "Home"
                        ? 0
                        : e.key === "End"
                          ? 2
                          : (tabs.indexOf(key) +
                              (e.key === "ArrowRight" ? 1 : 2)) %
                            3;
                    setTriage(tabs[index]);
                    setOffset(0);
                    e.currentTarget.parentElement
                      ?.querySelectorAll<HTMLButtonElement>("button")
                      [index]?.focus();
                  }}
                  aria-selected={triage === key}
                  onClick={() => {
                    setTriage(key);
                    setOffset(0);
                  }}
                >
                  {name}
                  <span>{triageCounts[key] ?? 0}</span>
                </button>
              ))}
            </div>
          )}
          <div className="list-tools">
            {catalogue && (
              <>
                <input
                  type="checkbox"
                  aria-label="Select this page"
                  checked={
                    page.items.length > 0 &&
                    page.items.every((s) => selection.has(s.id))
                  }
                  onChange={(e) =>
                    setSelection(
                      e.target.checked
                        ? new Set(page.items.map((s) => s.id))
                        : new Set(),
                    )
                  }
                />
                <IconButton
                  icon={Archive}
                  label={
                    view === "archived"
                      ? "Restore selected conversations"
                      : "Archive selected conversations"
                  }
                  disabled={!selection.size}
                  onClick={() => void bulk({ archived: view !== "archived" })}
                />
                <IconButton
                  icon={Star}
                  label="Star selected conversations"
                  disabled={!selection.size}
                  onClick={() => void bulk({ starred: true })}
                />
                {labels.length > 0 && (
                  <select
                    className="bulk-label"
                    aria-label="Label selected conversations"
                    value=""
                    disabled={!selection.size}
                    onChange={(e) => {
                      const id = e.target.value;
                      if (id) {
                        void (async () => {
                          for (const s of page.items.filter((s) =>
                            selection.has(s.id),
                          ))
                            await annotate(s, {
                              labels: Array.from(
                                new Set([...s.annotations.labels, id]),
                              ),
                            });
                          setSelection(new Set());
                        })();
                      }
                    }}
                  >
                    <option value="">Label</option>
                    {labels.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                )}
                <span className="small muted">
                  {selection.size ? selection.size + " selected" : "Select"}
                </span>
              </>
            )}
            <div className="pagination">
              <span>
                {page.total ? offset + 1 : 0}–
                {Math.min(offset + 100, page.total)} / {page.total}
              </span>
              <IconButton
                icon={ChevronLeft}
                label="Previous page"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - 100))}
              />
              <IconButton
                icon={ChevronRight}
                label="Next page"
                disabled={offset + 100 >= page.total}
                onClick={() => setOffset(offset + 100)}
              />
            </div>
          </div>
        </>
      }
      <div className="search-scope small muted">
        Search in {views.find((v) => v[0] === scope)?.[1] || scope}
        {discovery.indexing ? " · Indexing histories…" : ""}
      </div>
      <div className="list-scroll" ref={scrollRef} aria-busy={loading}>
        {catalogue && page.items.length > 0 ? (
          page.items.map((s) => (
            <div
              className={
                "session-row " +
                (session?.id === s.id ? "selected " : "") +
                (s.annotations.unread ? "unread" : "")
              }
              key={s.id}
            >
              <input
                type="checkbox"
                aria-label={"Select " + s.title}
                checked={selection.has(s.id)}
                onChange={(e) =>
                  setSelection((ids) => {
                    const copy = new Set(ids);
                    e.target.checked ? copy.add(s.id) : copy.delete(s.id);
                    return copy;
                  })
                }
              />
              <IconButton
                icon={Star}
                label={"Star: " + s.title}
                pressed={s.annotations.starred}
                onClick={() =>
                  void annotate(s, { starred: !s.annotations.starred })
                }
              />
              <button
                className="row-main"
                aria-current={session?.id === s.id ? "true" : undefined}
                onClick={() => void read(s)}
              >
                <span className="row-title">
                  {s.title}
                  {labelChips(s.annotations.labels)}
                </span>
                <span className="row-context">
                  <span className="tool-badge">{s.tool}</span>
                  <span title={s.cwd}>{folder(s.cwd)}</span>
                  {s.branch && (
                    <span>
                      <GitBranch size={12} />
                      {s.branch}
                    </span>
                  )}
                  {s.annotations.ticket && <span>{s.annotations.ticket}</span>}
                  <span className="activity-status">
                    {scope === "inbox"
                      ? stateName(s.state || "unknown")
                      : s.sourceAvailable
                        ? "History" + (s.archivedNative ? " archived" : "")
                        : "Source unavailable"}
                  </span>
                </span>
                {s.preview && (
                  <span className="row-preview">{s.preview.slice(0, 160)}</span>
                )}
              </button>
              <time>{date(s.modified)}</time>
              <ChevronRight size={16} className="muted" />
            </div>
          ))
        ) : scope === "drafts" && mailRows.length > 0 ? (
          mailRows
            .filter((r) => r.kind === "draft")
            .map((r) => {
              const d = r.data as Draft;
              return (
                <div className="draft-row" key={d.id}>
                  <FileText size={18} className="muted" />
                  <button
                    className="row-main"
                    onClick={() => void openDraft(d)}
                  >
                    <strong>{d.title || "Untitled Relai"}</strong>
                    <span className="row-context">
                      {d.tool && <span className="tool-badge">{d.tool}</span>}
                      <span>{folder(d.cwd)}</span>
                      <span>{d.markdown.slice(0, 70) || "Empty draft"}</span>
                      {labelChips(d.labels)}
                    </span>
                  </button>
                  <time>{date(d.modified)}</time>
                  <IconButton
                    icon={Trash2}
                    label={"Delete draft " + (d.title || "untitled")}
                    onClick={() => {
                      void api("drafts/" + d.id, "DELETE")
                        .then(() => loadMeta())
                        .catch(alert);
                    }}
                  />
                </div>
              );
            })
        ) : mailRows.some((r) => r.kind === "delivery") ? (
          <DeliveryRows
            rows={mailRows}
            onOpen={(d) => {
              setDeliveryDetail(d);
              setSession(null);
            }}
          />
        ) : (
          <EmptyState
            scope={scope}
            loading={loading && !hasLoadedMailbox}
            filtered={
              !!(
                search ||
                tool ||
                labelFilter ||
                (scope === "inbox" && triage !== "all")
              )
            }
            onCompose={() => void compose()}
            onSessions={() => void navigate("sessions")}
            onSources={() => setDialog("sources")}
            onClear={() => {
              setQ("");
              setTool("");
              setLabelFilter("");
              setTriage("all");
              setOffset(0);
            }}
          />
        )}
      </div>
      <div className="list-bottom">
        <span>
          {nativeCatalogue
            ? "Native sources · progressive search"
            : "A place for every conversation."}
        </span>
        <span>Local</span>
      </div>
    </section>
  );
  return (
    <div className={"shell " + (compact ? "compact" : "")}>
      <a className="skip-link" href="#workspace">
        Skip to workspace
      </a>
      <header className="topbar">
        <IconButton
          icon={Menu}
          label="Open navigation"
          onClick={() => setMobile(!mobile)}
        />
        <a
          className="brand"
          href="/"
          onClick={(e) => {
            e.preventDefault();
            void navigate("inbox");
          }}
        >
          <span className="brand-mark" aria-hidden="true">
            ↗
          </span>
          relai
          <span className="brand-sub">
            WORKSPACE <span>EXPERIMENTAL</span>
          </span>
        </a>
        <label className="search">
          <Search size={17} />
          <input
            ref={searchRef}
            aria-label="Search mailboxes and sessions"
            placeholder="Search conversations, prompts, folders…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
            }}
          />
          <kbd>⌘ K</kbd>
        </label>
        <IconButton
          icon={Command}
          label="Open commands"
          onClick={() => setCommandsOpen(true)}
        />
        <IconButton
          icon={theme === "dark" ? Sun : Moon}
          label={theme === "dark" ? "Light theme" : "Dark theme"}
          onClick={() => void preferences(theme === "dark" ? "light" : "dark")}
        />
        <button className="local-pill" onClick={() => setDialog("sources")}>
          <span className={"dot " + (error ? "offline" : "")} />
          {error ? "Check connection" : "Local engine"}
        </button>
      </header>
      {mobile && (
        <button
          className="scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside
        ref={sidebarRef}
        className={mobile ? "sidebar open" : "sidebar"}
        inert={narrow && !mobile}
        role={narrow && mobile ? "dialog" : undefined}
        aria-modal={narrow && mobile ? true : undefined}
        aria-label="Workspace navigation"
        onKeyDown={(event) => {
          if (!narrow || !mobile) return;
          if (event.key === "Escape") {
            setMobile(false);
            document
              .querySelector<HTMLButtonElement>(
                '[aria-label="Open navigation"]',
              )
              ?.focus();
          }
          if (event.key === "Tab") {
            const buttons = Array.from(
              event.currentTarget.querySelectorAll<HTMLButtonElement>(
                "button:not(:disabled)",
              ),
            );
            const first = buttons[0],
              last = buttons.at(-1);
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            }
            if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        {narrow && (
          <button className="nav" onClick={() => setMobile(false)}>
            <X size={18} />
            Close navigation
          </button>
        )}
        <Sidebar
          scope={scope}
          labelFilter={labelFilter}
          labels={labels}
          draftCount={drafts.length}
          discovery={discovery}
          onNavigate={(next, label) => void navigate(next, label)}
          onCompose={() => void compose()}
          onLabel={(label) => {
            setLabelEdit(label);
            setDialog("label");
          }}
          onSources={() => {
            setMobile(false);
            setDialog("sources");
          }}
          onCommands={() => {
            setMobile(false);
            setCommandsOpen(true);
          }}
        />
      </aside>
      <main className="workspace" id="workspace" tabIndex={-1}>
        {error && (
          <div className="banner error" role="alert">
            {error}
            <button
              onClick={() => {
                api("bootstrap")
                  .then(() =>
                    Promise.all([
                      loadMeta(),
                      api<{ theme: string; compact: boolean }>("preferences"),
                    ]),
                  )
                  .then(([, prefs]) => {
                    setTheme(prefs.theme);
                    setCompact(prefs.compact);
                    setReady(true);
                    setError("");
                  })
                  .catch(alert);
                setReload((n) => n + 1);
              }}
            >
              Retry
            </button>
          </div>
        )}
        {!ready ? (
          <div className="empty">
            <RefreshCw size={28} />
            <h1>Connecting to Relai</h1>
            <p>Loading your local workspace…</p>
          </div>
        ) : draft ? (
          <div className="compose-background">
            {listContent}
            <dialog
              ref={composeRef}
              className={"compose-modal " + (expanded ? "expanded" : "")}
              aria-label="Compose a Relai"
              onCancel={(e) => {
                e.preventDefault();
                void closeDraft();
              }}
            >
              <section className="composer" aria-label="Compose a Relai">
                <div className="pane-heading">
                  <button className="back" onClick={() => void closeDraft()}>
                    <ChevronLeft size={18} />
                    Back
                  </button>
                  <div className="actions">
                    <span className="small muted" role="status">
                      {saveState}
                    </span>
                    <IconButton
                      icon={expanded ? Minimize2 : Maximize2}
                      label={expanded ? "Restore composer" : "Expand composer"}
                      pressed={expanded}
                      onClick={() => setExpanded(!expanded)}
                    />
                  </div>
                </div>
                <div className="compose-fields compose-block destination-block">
                  <h2 className="block-title">Destination</h2>
                  <h1>{draft.sessionId ? "Reply" : "New Relai"}</h1>
                  <div className="recipient-line">
                    <span className="field-name">To</span>
                    <button
                      className="recipient-button"
                      aria-expanded={recipientOpen}
                      onClick={() => setRecipientOpen(!recipientOpen)}
                    >
                      {draft.sessionId ? (
                        <>
                          <span className="tool-badge">{draft.tool}</span>
                          <strong>{draft.title}</strong>
                          <span className="muted">{folder(draft.cwd)}</span>
                          {draft.branch && (
                            <span className="small muted">
                              <GitBranch size={12} />
                              {draft.branch}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="muted">
                          {draft.tool
                            ? draft.tool +
                              " · " +
                              (draft.cwd || "Choose a folder")
                            : "Choose a conversation or a destination…"}
                        </span>
                      )}
                      <ChevronRight size={16} />
                    </button>
                  </div>
                  {recipientOpen && (
                    <div className="recipient-picker">
                      <label className="search">
                        <Search size={17} />
                        <input
                          autoFocus
                          aria-label="Search recipients"
                          placeholder="Agent, folder or chat name…"
                          value={recipientQ}
                          onChange={(e) => setRecipientQ(e.target.value)}
                        />
                      </label>
                      <div className="recipient-results">
                        {recipients.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => {
                              edit({
                                sessionId: s.id,
                                tool: s.tool,
                                cwd: s.cwd,
                                branch: s.branch,
                                title: s.title,
                              });
                              setRecipientOpen(false);
                            }}
                          >
                            <span className="tool-badge">{s.tool}</span>
                            <span>
                              <strong>{s.title}</strong>
                              <small>
                                {s.cwd}
                                {s.branch ? " · " + s.branch : ""}
                              </small>
                            </span>
                          </button>
                        ))}
                        {!recipients.length && (
                          <p className="muted">No conversations found.</p>
                        )}
                      </div>
                      <button
                        className="text-button"
                        onClick={() => {
                          edit({
                            sessionId: null,
                            tool: "",
                            cwd: "",
                            title: "",
                          });
                          setRecipientOpen(false);
                        }}
                      >
                        <Plus size={16} />
                        New session in a working folder
                      </button>
                    </div>
                  )}
                  {!draft.sessionId && (
                    <>
                      <div className="destination-fields">
                        <label>
                          Agent
                          <select
                            aria-label="Agent"
                            value={draft.tool}
                            onChange={(e) =>
                              edit({
                                tool: e.target.value,
                                source: "",
                                branch: "",
                              })
                            }
                          >
                            <option value="">Choose an agent</option>
                            {Array.from(
                              new Set(
                                discovery.sources
                                  .filter((s) => s.installed || s.count > 0)
                                  .map((s) => s.tool),
                              ),
                            ).map((tool) => (
                              <option key={tool}>{tool}</option>
                            ))}
                          </select>
                        </label>
                        {sourceRoots.filter((r) => r.tool === draft.tool)
                          .length > 1 && (
                          <label>
                            Agent source
                            <select
                              aria-label="Agent source"
                              value={
                                draft.source ||
                                sourceRoots.find((r) => r.tool === draft.tool)
                                  ?.path ||
                                ""
                              }
                              onChange={(e) => edit({ source: e.target.value })}
                            >
                              {sourceRoots
                                .filter((r) => r.tool === draft.tool)
                                .map((r) => (
                                  <option key={r.path} value={r.path}>
                                    {r.path}
                                  </option>
                                ))}
                            </select>
                          </label>
                        )}
                        <FolderPicker
                          value={draft.cwd}
                          onChange={(cwd) => edit({ cwd })}
                        />
                      </div>
                      <label className="title-field">
                        Chat title
                        <input
                          value={draft.title}
                          onChange={(e) => edit({ title: e.target.value })}
                          placeholder="Chat name"
                        />
                      </label>
                    </>
                  )}
                  {draft.sessionId && (
                    <p className="recipient-detail">
                      <Folder size={14} />
                      {draft.cwd}
                      <span className="muted">
                        Continues this native chat in Relai · external CLI
                        activity unknown
                      </span>
                    </p>
                  )}
                  {draft.sessionId && replyContext && (
                    <details className="reply-context">
                      <summary>Conversation context</summary>
                      <MarkdownView text={replyContext} />
                    </details>
                  )}
                  <details className="compose-meta">
                    <summary>
                      Details{" "}
                      <span className="small muted">
                        Labels and optional ticket
                      </span>
                    </summary>
                    <div className="details-fields">
                      {chooseLabels(draft.labels, (labels) => edit({ labels }))}
                      <label className="ticket-field">
                        Ticket
                        <input
                          placeholder="Optional"
                          value={draft.ticket}
                          onChange={(e) => edit({ ticket: e.target.value })}
                        />
                      </label>
                    </div>
                  </details>
                </div>
                {saveError && (
                  <div className="banner error" role="alert">
                    {saveError}
                    <button onClick={() => void copyConflict()}>
                      Save a copy
                    </button>
                  </div>
                )}
                <div
                  className={
                    "compose-block message-block " +
                    (submitting ? "submitting" : "")
                  }
                >
                  <h2 className="block-title">Message</h2>
                  <div
                    className="editor-tabs"
                    role="tablist"
                    aria-label="Writing mode"
                  >
                    {[
                      ["visual", "Visual"],
                      ["markdown", "Markdown"],
                      ["preview", "Preview"],
                    ].map(([key, label]) => (
                      <button
                        key={key}
                        role="tab"
                        id={"editor-tab-" + key}
                        aria-controls="editor-panel"
                        tabIndex={mode === key ? 0 : -1}
                        onKeyDown={(e) => {
                          const keys = ["visual", "markdown", "preview"],
                            index = keys.indexOf(key);
                          let next = index;
                          if (e.key === "ArrowRight") next = (index + 1) % 3;
                          else if (e.key === "ArrowLeft")
                            next = (index + 2) % 3;
                          else if (e.key === "Home") next = 0;
                          else if (e.key === "End") next = 2;
                          else return;
                          e.preventDefault();
                          setMode(keys[next]);
                          document
                            .getElementById("editor-tab-" + keys[next])
                            ?.focus();
                        }}
                        aria-selected={mode === key}
                        className={mode === key ? "active" : ""}
                        onClick={() => setMode(key)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div
                    className="editor-body"
                    id="editor-panel"
                    role="tabpanel"
                    aria-labelledby={"editor-tab-" + mode}
                  >
                    {mode === "markdown" ? (
                      <textarea
                        className="markdown-editor"
                        aria-label="Markdown message"
                        value={draft.markdown}
                        placeholder="Describe the work and the expected result…"
                        onChange={(e) => edit({ markdown: e.target.value })}
                      />
                    ) : mode === "preview" ? (
                      <MarkdownView
                        text={
                          draft.markdown ||
                          "*Your Relai preview will appear here.*"
                        }
                      />
                    ) : (
                      <React.Suspense
                        fallback={<p className="muted">Loading editor…</p>}
                      >
                        <RichEditor
                          key={draft.id}
                          disabled={submitting}
                          markdown={draft.markdown}
                          onChange={(markdown) => edit({ markdown })}
                          onUnsafe={() => {
                            setMode("markdown");
                            flash(
                              "This content stays in Markdown to preserve its formatting.",
                            );
                          }}
                        />
                      </React.Suspense>
                    )}
                  </div>
                </div>
                <div className="compose-footer compose-block">
                  <span className="small muted">
                    {draft.tool && draft.tool !== "Codex"
                      ? "Read-only agent · copy or export your prompt"
                      : "Draft saved locally · sends only when requested"}
                  </span>
                  {scheduling && (
                    <ScheduleFields
                      busy={submitting}
                      onSchedule={(due, tz) => void submitDelivery(due, tz)}
                    />
                  )}
                  <div className="compose-actions">
                    <button
                      className="primary"
                      disabled={
                        submitting ||
                        draft.tool !== "Codex" ||
                        !draft.markdown.trim() ||
                        !draft.cwd ||
                        !draft.title.trim()
                      }
                      onClick={() => void submitDelivery()}
                    >
                      <Send size={16} />
                      {submitting ? "Submitting…" : "Send"}
                    </button>
                    <button
                      className="secondary"
                      disabled={submitting || draft.tool !== "Codex"}
                      onClick={() => setScheduling(!scheduling)}
                    >
                      <Calendar size={16} />
                      Schedule
                    </button>
                    <details className="more-actions">
                      <summary>More</summary>
                      <div>
                        <button
                          className="secondary"
                          onClick={() => void copy()}
                        >
                          <Copy size={16} />
                          Copy
                        </button>
                        <button className="secondary" onClick={download}>
                          <Download size={16} />
                          Export
                        </button>
                        <button className="primary" onClick={() => void save()}>
                          <Check size={16} />
                          Save
                        </button>
                      </div>
                    </details>
                  </div>
                </div>
              </section>
            </dialog>
          </div>
        ) : deliveryDetail ? (
          <DeliveryDetail
            key={deliveryDetail.id}
            delivery={deliveryDetail}
            onClose={() => setDeliveryDetail(null)}
            onChanged={(d) => {
              setDeliveryDetail(d);
              setReload((n) => n + 1);
              void loadMeta();
            }}
            onConversation={(sid) => {
              void api<Session>("sessions/" + sid)
                .then((s) => {
                  setDeliveryDetail(null);
                  return read(s);
                })
                .catch(alert);
            }}
          />
        ) : session ? (
          <div
            className={
              "reading-layout " +
              (focusReader || terminalView ? "reader-focused" : "")
            }
          >
            <div className="reading-list">{listContent}</div>
            <section className="reader" aria-label="Conversation history">
              <div className="pane-heading">
                <button className="back" onClick={back}>
                  <ChevronLeft size={18} />
                  Back to {title}
                </button>
                <div className="actions">
                  <IconButton
                    icon={focusReader ? PanelLeftOpen : PanelLeftClose}
                    label={
                      focusReader
                        ? "Show conversation list"
                        : "Focus conversation"
                    }
                    pressed={focusReader}
                    onClick={() => setFocusReader(!focusReader)}
                  />
                  <IconButton
                    icon={Star}
                    label={
                      session.annotations.starred
                        ? "Unstar conversation"
                        : "Star conversation"
                    }
                    pressed={session.annotations.starred}
                    onClick={() =>
                      void annotate(session, {
                        starred: !session.annotations.starred,
                      })
                    }
                  />
                  <IconButton
                    icon={Archive}
                    label={session.annotations.archived ? "Restore" : "Archive"}
                    onClick={() =>
                      void annotate(session, {
                        archived: !session.annotations.archived,
                      })
                    }
                  />
                </div>
              </div>
              {!session.sourceAvailable && (
                <div className="banner error">
                  The native file is unavailable. Its metadata is preserved.
                </div>
              )}
              <div className="reader-heading">
                <span className="eyebrow">Local history</span>
                <h1>{session.title}</h1>
                <div className="context">
                  <span className="tool-badge">{session.tool}</span>
                  <span title={session.cwd}>
                    <Folder size={14} />
                    {session.cwd || "Unknown folder"}
                  </span>
                  {session.branch && (
                    <span>
                      <GitBranch size={14} />
                      {session.branch}
                    </span>
                  )}
                  <span>
                    {session.managed
                      ? stateName(session.state || "unknown")
                      : "External activity unknown"}
                  </span>
                </div>
                <div className="reader-meta">
                  {chooseLabels(
                    session.annotations.labels,
                    (labels) => void annotate(session, { labels }),
                  )}
                  <label>
                    Ticket
                    <input
                      value={session.annotations.ticket}
                      placeholder="Optional"
                      onChange={(e) =>
                        setSession({
                          ...session,
                          annotations: {
                            ...session.annotations,
                            ticket: e.target.value,
                          },
                        })
                      }
                      onBlur={() =>
                        void annotate(session, {
                          ticket: session.annotations.ticket,
                        })
                      }
                    />
                  </label>
                </div>
                {session.parentId && (
                  <p className="small muted">
                    Related conversation / child agent
                  </p>
                )}
              </div>
              <ConversationActivity
                key={session.id}
                sessionId={session.id}
                onOpenDelivery={(d) => {
                  setDeliveryDetail(d);
                  setSession(null);
                }}
                onUpdate={() => {
                  const sid = session.id,
                    generation = historyGeneration.current;
                  void api<{ items: Message[]; before: number }>(
                    "sessions/" + sid + "/messages",
                  )
                    .then((r) => {
                      if (generation !== historyGeneration.current) return;
                      setMessages((previous) => {
                        const updates = new Map(r.items.map((m) => [m.id, m]));
                        const ids = new Set(previous.map((m) => m.id));
                        return [
                          ...previous.map((m) => updates.get(m.id) || m),
                          ...r.items.filter((m) => !ids.has(m.id)),
                        ];
                      });
                    })
                    .catch(() => {});
                }}
              />
              <div
                className="conversation-tabs"
                onKeyDown={(e) => {
                  if (
                    !["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)
                  )
                    return;
                  e.preventDefault();
                  const next =
                    e.key === "Home"
                      ? false
                      : e.key === "End"
                        ? true
                        : !terminalView;
                  setTerminalView(next);
                  e.currentTarget
                    .querySelectorAll<HTMLButtonElement>("button")
                    [next ? 1 : 0]?.focus();
                }}
                role="tablist"
                aria-label="Conversation view"
              >
                <button
                  role="tab"
                  tabIndex={!terminalView ? 0 : -1}
                  aria-selected={!terminalView}
                  onClick={() => setTerminalView(false)}
                >
                  Markdown
                </button>
                <button
                  role="tab"
                  tabIndex={terminalView ? 0 : -1}
                  aria-selected={terminalView}
                  onClick={() => setTerminalView(true)}
                >
                  Open terminal
                </button>
              </div>
              {terminalView && (
                <React.Suspense
                  fallback={<p role="status">Loading terminal…</p>}
                >
                  <TerminalPanel
                    key={session.id}
                    sessionId={session.id}
                    agent={session.tool}
                    onRelease={() => {
                      setTerminalView(false);
                      setReload((n) => n + 1);
                    }}
                  />
                </React.Suspense>
              )}
              <div className="history" hidden={terminalView}>
                {before > 0 && (
                  <button
                    className="secondary load-older"
                    onClick={() => void older()}
                    disabled={historyLoading}
                  >
                    Load older messages
                  </button>
                )}
                {historyLoading && <p className="muted">Loading history…</p>}
                {historyError && (
                  <div className="banner error" role="alert">
                    {historyError}
                    <button onClick={() => void read(session)}>Retry</button>
                  </div>
                )}
                {!historyLoading && !historyError && !messages.length && (
                  <div className="empty">
                    <MessagesSquare size={26} />
                    <h2>No readable messages</h2>
                    <p>Metadata remains available.</p>
                  </div>
                )}
                {messages.map((m) =>
                  m.activity ? (
                    <details className="activity" key={m.id}>
                      <summary>Agent activity</summary>
                      <pre>{m.text}</pre>
                    </details>
                  ) : (
                    <article className={"message " + m.role} key={m.id}>
                      <div className="message-meta">
                        <span>{m.role === "user" ? "You" : session.tool}</span>
                        <time>{date(m.time)}</time>
                      </div>
                      <MarkdownView text={m.text} />
                    </article>
                  ),
                )}
              </div>
              <div className="reader-footer">
                <span className="small muted">
                  {session.managed
                    ? "Native history · continued in Relai"
                    : "Native history · external activity unknown"}
                </span>
                <button
                  className="primary"
                  onClick={() => void compose(session)}
                >
                  <ArrowUpRight size={16} />
                  Reply
                </button>
              </div>
            </section>
          </div>
        ) : (
          listContent
        )}
      </main>
      <footer className="footer">
        <span>
          <span className="dot" />
          {error ? "Connection needs attention" : "Local workspace"}
          <span className="footer-divider">/</span>Experimental edition
        </span>
        <span>
          <kbd>C</kbd> compose <span className="footer-divider">·</span>
          <kbd>⌘ K</kbd> search <span className="footer-divider">·</span>
          <kbd>?</kbd> commands
        </span>
      </footer>
      <dialog
        ref={dialogRef}
        onCancel={() => setDialog("")}
        onClose={() => setDialog("")}
        aria-labelledby="dialog-title"
      >
        <div className="dialog-heading">
          <h2 id="dialog-title">
            {dialog === "label"
              ? labelEdit.id
                ? "Edit label"
                : "New label"
              : "Sources and discovery"}
          </h2>
          <IconButton icon={X} label="Close" onClick={() => setDialog("")} />
        </div>
        {dialog === "label" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void api<Label>("labels", "POST", labelEdit)
                .then(() => {
                  setDialog("");
                  return loadMeta();
                })
                .catch(alert);
            }}
          >
            <label className="field">
              Name
              <input
                autoFocus
                required
                maxLength={100}
                value={labelEdit.name}
                onChange={(e) =>
                  setLabelEdit({ ...labelEdit, name: e.target.value })
                }
              />
            </label>
            <label className="field">
              Color
              <select
                value={labelEdit.color}
                onChange={(e) =>
                  setLabelEdit({ ...labelEdit, color: e.target.value })
                }
              >
                <option value="teal">Teal</option>
                <option value="lavender">Lavender</option>
                <option value="peach">Peach</option>
                <option value="gray">Gray</option>
              </select>
            </label>
            <div className="dialog-actions">
              {labelEdit.id && (
                <button
                  type="button"
                  className="secondary danger"
                  onClick={() =>
                    void api("labels/" + labelEdit.id, "DELETE")
                      .then(() => {
                        setDialog("");
                        return loadMeta();
                      })
                      .catch(alert)
                  }
                >
                  Delete
                </button>
              )}
              <button className="primary" type="submit">
                Save
              </button>
            </div>
          </form>
        ) : (
          <div className="sources">
            <p className="muted">
              Native histories from this Linux / WSL environment. Discovery
              starts no agent and adds no mail to Inbox.
            </p>
            {discovery.sources.map((source, i) => (
              <article key={source.root + i}>
                <div>
                  <strong>{source.tool}</strong>
                  <span
                    className={
                      "source-status " +
                      (source.status === "partial" ? "warning" : "")
                    }
                  >
                    {source.status === "pending"
                      ? "Discovering"
                      : source.status === "absent"
                        ? "No histories"
                        : source.status === "partial"
                          ? "Partial discovery"
                          : "Discovered"}{" "}
                    · {source.count}
                  </span>
                </div>
                <code>{source.root}</code>
                <p className="small muted">
                  {source.installed
                    ? "Executable available"
                    : "Executable not found"}
                  {source.errors ? " · " + source.errors + " errors" : ""}
                </p>
                <p className="small muted">
                  {source.tool === "Codex"
                    ? source.installed
                      ? "Send / queue / schedule: Codex 0.159.x · checked on execution"
                      : "Sending unavailable: executable missing"
                    : "Read-only adapter · sending unavailable"}
                </p>
                {source.detail && (
                  <p className="small muted">{source.detail}</p>
                )}
              </article>
            ))}
            <details className="source-settings">
              <summary>Configure sources</summary>
              <p className="small muted">
                Native history stores in this environment. Other users, Windows
                installations and WSL distributions are not scanned.
              </p>
              {rootsEdit.map((root, i) => (
                <div className="source-edit" key={i}>
                  <select
                    aria-label={"Source agent " + (i + 1)}
                    value={root.tool}
                    onChange={(e) => {
                      setRootsEdit(
                        rootsEdit.map((r, j) =>
                          j === i ? { ...r, tool: e.target.value } : r,
                        ),
                      );
                      setRootsDirty(true);
                    }}
                  >
                    {["Codex", "Claude Code", "OpenCode", "Pi"].map((tool) => (
                      <option key={tool}>{tool}</option>
                    ))}
                  </select>
                  <input
                    aria-label={"Source folder " + (i + 1)}
                    value={root.path}
                    onChange={(e) => {
                      setRootsEdit(
                        rootsEdit.map((r, j) =>
                          j === i ? { ...r, path: e.target.value } : r,
                        ),
                      );
                      setRootsDirty(true);
                    }}
                  />
                  <IconButton
                    icon={X}
                    label={"Remove source " + (i + 1)}
                    onClick={() => {
                      setRootsEdit(rootsEdit.filter((_, j) => j !== i));
                      setRootsDirty(true);
                    }}
                  />
                </div>
              ))}
              <div className="source-actions">
                <button
                  className="secondary"
                  onClick={() => {
                    setRootsEdit([...rootsEdit, { tool: "Codex", path: "" }]);
                    setRootsDirty(true);
                  }}
                >
                  <Plus size={14} />
                  Add
                </button>
                <button
                  className="primary"
                  disabled={!rootsDirty}
                  onClick={() =>
                    void api("roots", "PUT", rootsEdit)
                      .then(() => {
                        setRootsDirty(false);
                        flash("Sources saved.");
                        return loadMeta();
                      })
                      .catch(alert)
                  }
                >
                  Save
                </button>
              </div>
            </details>
            <p className="small muted">
              {discovery.indexing
                ? "Message search: indexing in progress."
                : "Message index is up to date."}
              {discovery.indexErrors
                ? " " + discovery.indexErrors + " histories not indexed."
                : ""}
            </p>
            <p className="small muted">
              Sources are reconciled every 30 seconds and watched when
              available. External activity is never inferred from file
              dates.{" "}
            </p>
            <button
              className="secondary"
              onClick={() =>
                void api("discovery", "POST")
                  .then(() => loadMeta())
                  .catch(alert)
              }
            >
              <RefreshCw size={16} />
              Scan again
            </button>
          </div>
        )}
      </dialog>
      {commandsOpen && (
        <CommandPalette
          onClose={() => setCommandsOpen(false)}
          commands={[
            {
              id: "compose",
              label: "Compose a Relai",
              detail: "Start a conversation or continue existing work",
              icon: Plus,
              shortcut: "C",
              run: () => void compose(),
            },
            ...views.map(([id, label, icon]) => ({
              id,
              label,
              detail: "Go to " + label.toLowerCase(),
              icon,
              run: () => void navigate(id),
            })),
            {
              id: "search",
              label: "Search your workspace",
              detail: "Use agent:, folder:, in: or a phrase in quotes",
              icon: Search,
              shortcut: "⌘ K",
              run: () => searchRef.current?.focus(),
            },
            {
              id: "sources",
              label: "Sources and discovery",
              detail: "Connect and inspect your local agent histories",
              icon: Settings2,
              run: () => setDialog("sources"),
            },
            {
              id: "theme",
              label:
                theme === "dark"
                  ? "Switch to light theme"
                  : "Switch to dark theme",
              detail: "Set the workspace appearance",
              icon: theme === "dark" ? Sun : Moon,
              run: () => void preferences(theme === "dark" ? "light" : "dark"),
            },
          ]}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
