// An id for a record the admin creates: a prefix that says what it is, then a full random UUID, so two records never clash (a clash overwrites).
export const newId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
