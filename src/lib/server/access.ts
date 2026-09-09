import { error, redirect } from '@sveltejs/kit';
export function canManage(role?: string) {
  return role === 'admin' || role === 'author';
}
export function canReadChapter(
  bookStatus: string,
  chapterStatus: string,
  isFree: number,
  role?: string,
) {
  return (
    canManage(role) ||
    (bookStatus === 'published' &&
      chapterStatus === 'published' &&
      isFree === 1)
  );
}
export function requireAuthor(user: App.Locals['user']) {
  if (!user) redirect(303, '/login?next=/admin');
  if (!canManage(user.role))
    error(403, 'This page is reserved for the author.');
  return user;
}
export function safeNext(value: string | null) {
  return value &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !/[\\\r\n]/.test(value)
    ? value
    : '/account';
}
