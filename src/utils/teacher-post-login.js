/**
 * Teacher sign-in opens Home. A saved /teacher URL is the last tab
 * (Explore, Academy, a class), not a page to restore.
 * Other saved paths, including /admin, stay with the caller.
 */
export function skipSavedTeacherShellPath(intent, returnPath) {
  return intent === 'teacher'
    && typeof returnPath === 'string'
    && returnPath.startsWith('/teacher')
}
