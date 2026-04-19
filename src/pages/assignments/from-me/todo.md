# Create New Assignment Modal — TODO Tracker

Tracks visual-only elements, assumptions, and placeholder logic that need real state/backend wiring later.

## Step 1: Title and Instructions

| Element | Status | Notes |
|---|---|---|
| Assignment Title input | **Real** | Bound to `assignment.name` via `Agent.state()` |
| Instructions textarea | **Real** | Bound to `assignment.description` via `Agent.state()` |
| Assignment type dropdown | **Visual only** | Hardcoded options ("Assignment", "Quiz", "Project"). Not persisted. |
| Due date input | **Visual only** | Renders date picker, value stored in local ref only. Not persisted to backend. |
| Due time input | **Visual only** | Renders time picker, value stored in local ref only. Not persisted to backend. |
| Character counter "0/100" | **Visual only** | Displays count but no max-length enforcement. |

## Step 2: Add Content

| Element | Status | Notes |
|---|---|---|
| Content selection | **Real** | Uses existing `ContentLibrary` component and `assignment.content` binding |
| "Add content item/sequence" CTA | **Visual** | Styled CTA area matching Figma |
| Wide-mode content table | **Assumption** | Reuses existing `ContentLibrary` card grid (not the Figma table layout). Table layout is aspirational. |
| "Current item/sequence (N)" counter | **Real** | Shows count of selected content |
| Preview button | **Real** | Opens existing `PreviewModal` |
| Drag-and-drop from explore page | **Not implemented** | Figma mentions drag-and-drop; not wired up |

## Step 3: Assignment Details

| Element | Status | Notes |
|---|---|---|
| "Allow late submissions" toggle | **Visual only** | Local ref, not persisted |
| "Maximum attempts" dropdown | **Visual only** | Hardcoded options ("1 attempt", "2 attempts", "3 attempts", "Unlimited"). Local ref only. |
| "Feedback timing" dropdown | **Visual only** | Hardcoded options ("At the end", "After each question", "Never"). Local ref only. |
| "Shuffle questions" toggle | **Visual only** | Local ref, not persisted |
| "Show correct answers" toggle | **Visual only** | Local ref, not persisted |
| "Teacher notes (private)" textarea | **Visual only** | Local ref, not persisted |

## Step 4: Assign and Publish

| Element | Status | Notes |
|---|---|---|
| Group list | **Real** | Uses `store.getters['groups/groups']('class', true)` |
| Group names | **Real** | Uses `vueScopeComponent` to display group names |
| Group assignment toggle | **Real** | Uses existing `assignments/assign` and `assignments/unassign` dispatch |
| Group search input | **Visual only** | Filters displayed groups locally, no backend search |
| Group student counts | **Visual only** | Placeholder "25 students", not fetched from real data |
| Group icon colors (green/blue) | **Visual only** | Alternating colors, not based on data |
| "Publish immediately" radio | **Visual only** | Local ref, no backend action |
| "Schedule for later" radio | **Visual only** | Local ref, no backend action. No date/time picker shown. |
| "Save as draft" radio | **Visual only** | Local ref, no backend action |
| "Create assignment" button | **Partial** | Closes modal. Group assignments happen in real-time via toggle (Step 4). No publish/schedule/draft logic. |

## General Assumptions

- The modal width transitions (480px → 984px for Step 2 browse mode) use CSS transition on PModal
- The 5th stepper circle (visible in Figma with "05" text) is ignored — only 4 steps implemented
- `ResearcherToTeacherAssignment` branch in the modal wrapper is preserved but untouched
- Edit mode (editing existing assignment) loads data from `Agent.state(id)` — same as current behavior
