# UIUX-28 — Archive vs delete matrix

Platform policy for teacher-facing entities. **Restore** is always available via archived sections or `ShowArchivedToggle`.

| Entity | Archive | Effect | Delete | Effect | Restore |
|--------|---------|--------|--------|--------|---------|
| **Student** | Yes | `users[id].archived = true`; hidden from active list | Remove | Same as archive today (soft) | Clear `archived` flag |
| **Group** | Yes | `groups/archive` dispatch | Delete | Soft-delete via store | `groups/unarchive` |
| **Assignment** | Yes | `pila_tags/untag` + `Agent.state(id).archived = true` | Menu kept | Same soft-archive as archive (copy differs) | `pila_tags/tag` + `archived = false` |
| **Group↔assignment link** | Via unassign | `assignments/unassign` sets link `archived` | — | — | Re-assign on wizard Save |
| **Sequence (Explore)** | Yes | `Agent.state(id).archived = true` | — (removed) | — | Inline archived card + Restore; excluded from content grid and pickers |

## Copy rules

- **Archive:** “Removed from active lists; data preserved; restore later.”
- **Delete (assignments):** Same mechanism as archive; dialog explains soft removal, not permanent wipe.
- **Delete (students/groups):** Destructive tone; student delete removes from groups.

## Backend-dependent (UIUX-26)

- Last login column (UIUX-30)
- Nickname field (UIUX-46)
- SSO consent + real submission counts (UIUX-41, UIUX-29)