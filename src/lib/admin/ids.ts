// An id for a record the admin creates: a prefix that says what it is, then a random part, so two saves in the same millisecond never clash.
export const newId = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
