export type CursorPage<T> = {
  data: T[];
  nextCursor?: string | null;
  hasMore?: boolean;
  /** Optional total count of all matching rows (not just this page), when the backend provides it. */
  total?: number | null;
};

export type CursorListParams = {
  limit?: number;
  cursor?: string;
  q?: string;
};
