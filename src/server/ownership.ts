export function ownedRecordWhere(userId: string, recordId?: string) {
  return recordId === undefined ? { userId } : { id: recordId, userId };
}

export function ownedRecordData<T extends Record<string, unknown>>(userId: string, data: T) {
  return { ...data, userId };
}
