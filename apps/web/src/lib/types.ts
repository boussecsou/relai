export type Label = { id: string; name: string; color: string };
export type Annotations = {
  labels: string[];
  starred: boolean;
  archived: boolean;
  unread: boolean;
  ticket: string;
};
export type Session = {
  id: string;
  nativeId: string;
  tool: string;
  title: string;
  cwd: string;
  branch: string;
  modified: number;
  parentId: string;
  archivedNative: boolean;
  sourceAvailable: boolean;
  preview?: string;
  state?: string;
  managed?: boolean;
  capabilities?: { send: boolean; reason: string };
  annotations: Annotations;
};
export type Draft = {
  source?: string;
  branch?: string;
  id: string;
  sessionId: string | null;
  tool: string;
  cwd: string;
  title: string;
  markdown: string;
  labels: string[];
  ticket: string;
  revision: number;
  modified: number;
};
export type Message = {
  id: string;
  role: string;
  text: string;
  time: number;
  activity: boolean;
};
export type Coverage = {
  tool: string;
  root: string;
  installed: boolean;
  status: string;
  count: number;
  errors: number;
  detail: string;
  updated: number;
};
export type Page = {
  items: Session[];
  total: number;
  offset: number;
  limit: number;
};
export type Discovery = {
  scanning: boolean;
  sources: Coverage[];
  indexing: boolean;
  indexErrors: number;
};
