export type CursorPage<T> = {
  data: T[];
  nextCursor?: string | null;
  hasMore?: boolean;
};

export type CursorListParams = {
  limit?: number;
  cursor?: string;
  q?: string;
};
