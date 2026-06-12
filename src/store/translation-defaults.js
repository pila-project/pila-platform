/**
 * English defaults when a slug is registered but CDN copy is not loaded yet.
 * Prefer adding entries here over showing humanized slug text in the UI.
 */
export default {
  'archive-student-confirm-title': 'Archive this student?',
  'archive-student-confirm-description':
    'This student will be hidden from your active list. They are not deleted and can still log in. They remain in their groups and may still see assignments until you remove them from groups or archive the assignment for all. Restore them anytime from archived students.',

  'archive-group-confirm-title': 'Archive group "{name}"?',
  'archive-group-confirm-description':
    'This group has {count} student(s). Archiving hides the group from your active list. Students remain in the group and can still see assignments published to it until you unassign the group. You can restore the group later from archived groups.',

  'bulk-archive-students-confirm-title': 'Archive {count} selected student(s)?',
  'bulk-archive-students-confirm-description':
    'Archived students are hidden from your active list. They are not deleted and remain in their groups. Students may still see assignments published to those groups. Restore them anytime from the archived students section.',

  'restore-student-confirm-title': 'Restore this student?',
  'restore-student-confirm-description':
    'The student will return to your active student list. Their groups and login code are unchanged.',

  'restore-group-confirm-title': 'Restore group "{name}"?',
  'restore-group-confirm-description':
    'The group will return to your active groups list. Students stay assigned to this group.',

  'archive-assignment-confirm-title': 'Archive this assignment?',
  'archive-assignment-confirm-intro':
    'Choose how to archive "{name}". Nothing is permanently deleted — you can restore it later from archived assignments.',
  'archive-assignment-one-group': '1 group',
  'archive-assignment-n-groups': '{count} groups',
  'archive-assignment-for-me-label': 'Archive for me',
  'archive-assignment-for-me-description':
    'Hides this assignment from your list only. Students in assigned groups ({groups}) will still see and can work on it until you remove those groups from the assignment.',
  'archive-assignment-for-me-description-draft':
    'Hides this assignment from your active list. It is not published to any groups, so students are not affected.',
  'archive-assignment-for-all-label': 'Archive for all',
  'archive-assignment-for-all-description':
    'Hides this assignment from your list and removes it from all assigned groups ({groups}). Students will no longer see this assignment.',
  'archive-assignment-for-all-description-draft':
    'Hides this assignment from your list. No groups are assigned, so this has the same effect as archiving for me.',
  'archive-assignment-archived-for-me-success':
    'Assignment archived for you. Students in assigned groups can still see it until you remove those groups. You can restore it from archived assignments.',
  'archive-assignment-archived-for-all-success':
    'Assignment archived for everyone. Students in assigned groups will no longer see it. You can restore it from archived assignments.',

  'delete-assignment-warning-archive':
    'This removes the assignment from your active list only. Students in assigned groups may still see it until you archive for all or remove those groups. You can restore it from archived assignments.',

  'duplicate-name-title': 'Name already exists',
  'duplicate-name-description': 'A student named',
  'already-exists-continue': 'already exists. Continue anyway?',
  'continue-anyway': 'Continue anyway',

  'bulk-duplicate-students-intro': '{count} duplicate name(s) found.',
  'bulk-duplicate-already-exists': 'Already exists:',
  'bulk-duplicate-repeated-in-upload': 'Repeated in upload:',
  'bulk-duplicate-students-summary':
    'Create {create} new student(s) and skip {skip} duplicate(s)?',
  'bulk-duplicate-skipped-reason': 'duplicate names',

  'publication-date': 'Publication date',
  'publication-time': 'Publication time',
  'set-publication-date': 'Set when this assignment will be published to students',
  'set-publication-date-to-save': 'Set a publication date to save.',
  'publishes-on': 'Publishes on',
}