<template>
  <div class="showcase">
    <header class="showcase-header">
      <h1>PILA Design System</h1>
      <p>Component showcase replicating the Figma design system specifications.</p>
    </header>

    <nav class="showcase-nav">
      <a
        v-for="section in sections"
        :key="section"
        :href="`#${section.toLowerCase().replace(/\s+/g, '-')}`"
        class="showcase-nav-link"
      >{{ section }}</a>
    </nav>

    <!-- ==================== BUTTONS ==================== -->
    <section id="button" class="showcase-section">
      <h2>Button</h2>

      <h3>Variants</h3>
      <div class="showcase-row">
        <PButton variant="primary" text="Button" icon="plus" />
        <PButton variant="secondary" text="Button" icon="plus" />
        <PButton variant="outline" text="Button" icon="plus" />
        <PButton variant="ghost" text="Button" icon="plus" />
        <PButton variant="danger" text="Button" icon="plus" />
        <PButton variant="link" text="Button" icon="plus" />
      </div>

      <h3>Sizes</h3>
      <div class="showcase-row">
        <PButton variant="primary" size="sm" text="Button" icon="plus" />
        <PButton variant="primary" size="md" text="Button" icon="plus" />
        <PButton variant="primary" size="lg" text="Button" icon="plus" />
      </div>
      <div class="showcase-row" style="margin-top: 8px;">
        <PButton variant="secondary" size="sm" text="Button" icon="plus" />
        <PButton variant="secondary" size="md" text="Button" icon="plus" />
        <PButton variant="secondary" size="lg" text="Button" icon="plus" />
      </div>
      <div class="showcase-row" style="margin-top: 8px;">
        <PButton variant="danger" size="sm" text="Button" icon="plus" />
        <PButton variant="danger" size="md" text="Button" icon="plus" />
        <PButton variant="danger" size="lg" text="Button" icon="plus" />
      </div>

      <h3>Icon Only</h3>
      <div class="showcase-row">
        <PButton variant="primary" icon="plus" iconOnly size="sm" />
        <PButton variant="primary" icon="plus" iconOnly size="md" />
        <PButton variant="primary" icon="xmark" iconOnly size="md" />
        <PButton variant="secondary" icon="plus" iconOnly size="md" />
        <PButton variant="outline" icon="plus" iconOnly size="md" />
        <PButton variant="ghost" icon="plus" iconOnly size="md" />
        <PButton variant="danger" icon="plus" iconOnly size="md" />
      </div>

      <h3>States</h3>
      <div class="showcase-row">
        <PButton variant="primary" text="Default" />
        <PButton variant="primary" text="Disabled" disabled />
        <PButton variant="secondary" text="Default" />
        <PButton variant="secondary" text="Disabled" disabled />
      </div>

      <h3>In Context</h3>
      <div class="showcase-row">
        <PButton variant="outline" icon="print" text="Print login Code" />
        <PButton variant="primary" icon="plus" text="Add student" />
        <PButton variant="primary" icon="plus" text="Add group" />
      </div>
    </section>

    <!-- ==================== BADGE ==================== -->
    <section id="badge" class="showcase-section">
      <h2>Badge</h2>

      <h3>Rounded: True</h3>
      <div class="showcase-row">
        <PBadge text="Badge" variant="info" />
        <PBadge text="Badge" variant="secondary" />
        <PBadge text="Badge" variant="outline" />
        <PBadge text="Badge" variant="destructive" />
        <PBadge text="Badge" variant="success" />
      </div>

      <h3>Rounded: False</h3>
      <div class="showcase-row">
        <PBadge text="Badge" variant="info" :rounded="false" />
        <PBadge text="Badge" variant="secondary" :rounded="false" />
        <PBadge text="Badge" variant="outline" :rounded="false" />
        <PBadge text="Badge" variant="destructive" :rounded="false" />
        <PBadge text="Badge" variant="success" :rounded="false" />
      </div>

      <h3>In Context</h3>
      <div class="showcase-row">
        <PBadge text="Active" variant="success" />
        <PBadge text="Not published" variant="warning" />
        <PBadge text="Linked" variant="info" :rounded="false" />
        <PBadge text="Preview" variant="outline" :rounded="false" />
      </div>
    </section>

    <!-- ==================== ALERT ==================== -->
    <section id="alert" class="showcase-section">
      <h2>Alert</h2>
      <div class="showcase-stack">
        <PAlert variant="info" title="Heads up!" />
        <PAlert variant="error" title="Error" />
        <PAlert variant="success" title="Success" />
        <PAlert variant="warning" title="Skipped" />
      </div>
      <h3>With Description</h3>
      <div class="showcase-stack">
        <PAlert variant="info">You can add components to your app using the cli.</PAlert>
        <PAlert variant="error">Your session has expired. Please log in again.</PAlert>
        <PAlert variant="success">Your answer has been submitted successfully</PAlert>
        <PAlert variant="warning">Your question has skipped.</PAlert>
      </div>
    </section>

    <!-- ==================== ALERT DIALOG ==================== -->
    <section id="alert-dialog" class="showcase-section">
      <h2>Alert Dialog</h2>
      <p class="showcase-desc">Confirmation dialogs for destructive or important actions.</p>

      <div class="showcase-row">
        <PButton text="Delete Confirmation" variant="danger" @click="showDeleteDialog = true" />
        <PButton text="Success Dialog" variant="primary" @click="showSuccessDialog = true" />
        <PButton text="Add Students" variant="secondary" @click="showAddStudentDialog = true" />
      </div>

      <!-- Delete confirmation -->
      <PAlertDialog
        v-if="showDeleteDialog"
        variant="error"
        title="Are you sure you want to delete 'Mathematics 5A'"
        description="This group contains 4 students. If you delete it, they will be unassigned from the group. Please note that this action cannot be reversed."
        confirmText="Delete Group"
        cancelText="Cancel"
        @confirm="showDeleteDialog = false"
        @cancel="showDeleteDialog = false"
      />

      <!-- Success dialog -->
      <PAlertDialog
        v-if="showSuccessDialog"
        variant="success"
        title="Students successfully added to the groups"
        confirmText="OK"
        :cancelText="null"
        @confirm="showSuccessDialog = false"
        @cancel="showSuccessDialog = false"
      />

      <!-- Add student modal -->
      <PModal
        v-if="showAddStudentDialog"
        @close="showAddStudentDialog = false"
        title="Add students"
        width="520px"
      >
        <template #title>
          <h2 class="text-lg font-semibold text-zinc-950"><LucideIcon name="users" :size="18" style="margin-right: 8px; display: inline;" />Add students</h2>
        </template>
        <template #body>
          <p style="color: #64748b; margin-bottom: 20px;">Choose how you would like to add students.</p>
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div class="action-tile" style="border-left: 4px solid #f59e0b;">
              <div class="action-tile-icon" style="background: #fef3c7;"><LucideIcon name="plus" :size="18" style="color: #f59e0b;" /></div>
              <div><div style="font-weight: 600;">Create individual account</div><div style="color: #64748b; font-size: 0.875rem;">Manually create a single student account</div></div>
            </div>
            <div style="text-align: center;"><a href="#" style="color: #3b82f6; font-size: 0.875rem;">Link student to you →</a></div>
            <div class="action-tile" style="border-left: 4px solid #22c55e;">
              <div class="action-tile-icon" style="background: #dcfce7;"><LucideIcon name="chevrons-up" :size="18" style="color: #22c55e;" /></div>
              <div><div style="font-weight: 600;">Create bulk accounts</div><div style="color: #64748b; font-size: 0.875rem;">Upload CSV or manually enter multiple students</div></div>
            </div>
            <div style="text-align: center;"><a href="#" style="color: #3b82f6; font-size: 0.875rem;">Link students to you →</a></div>
            <div class="action-tile" style="border-left: 4px solid #3b82f6;">
              <div class="action-tile-icon" style="background: #dbeafe;"><LucideIcon name="user-plus" :size="18" style="color: #3b82f6;" /></div>
              <div><div style="font-weight: 600;">Link via SSO</div><div style="color: #64748b; font-size: 0.875rem;">Connect existing accounts from Google or Microsoft</div></div>
            </div>
          </div>
        </template>
        <template #footer>
          <PButton variant="outline" text="Cancel" @click="showAddStudentDialog = false" style="color: #ef4444;" />
          <PButton variant="primary" text="Next" @click="showAddStudentDialog = false" />
        </template>
      </PModal>
    </section>

    <!-- ==================== PROGRESS ==================== -->
    <section id="progress" class="showcase-section">
      <h2>Progress</h2>

      <div class="progress-grid">
        <div>
          <h3>Size: lg</h3>
          <div v-for="p in [0,10,20,30,40,50,60,70,80,90,100]" :key="`lg-${p}`" class="progress-row">
            <span class="progress-label">Progress: {{ p }}%</span>
            <PProgress :value="p" size="lg" />
          </div>
        </div>
        <div>
          <h3>Size: md</h3>
          <div v-for="p in [0,10,20,30,40,50,60,70,80,90,100]" :key="`md-${p}`" class="progress-row">
            <PProgress :value="p" size="md" />
          </div>
        </div>
        <div>
          <h3>Size: sm</h3>
          <div v-for="p in [0,10,20,30,40,50,60,70,80,90,100]" :key="`sm-${p}`" class="progress-row">
            <PProgress :value="p" size="sm" />
          </div>
        </div>
        <div>
          <h3>Size: xs</h3>
          <div v-for="p in [0,10,20,30,40,50,60,70,80,90,100]" :key="`xs-${p}`" class="progress-row">
            <PProgress :value="p" size="xs" />
          </div>
        </div>
      </div>
    </section>

    <!-- ==================== TABS ==================== -->
    <section id="tabs" class="showcase-section">
      <h2>Tabs</h2>

      <div class="tabs-grid">
        <div>
          <h3>Default (Pill)</h3>
          <PTabs v-model="tabDefault" :tabs="tabLabels" type="pill" />
          <div style="height: 16px;" />
          <h4 style="color: #64748b; font-size: 0.8rem;">Stretch Labels: True</h4>
          <PTabs v-model="tabDefaultStretch" :tabs="tabLabels" type="pill" stretch />
        </div>
        <div>
          <h3>Line</h3>
          <PTabs v-model="tabLine" :tabs="tabLabels" type="line" />
          <div style="height: 16px;" />
          <h4 style="color: #64748b; font-size: 0.8rem;">Stretch Labels: True</h4>
          <PTabs v-model="tabLineStretch" :tabs="tabLabels" type="line" stretch />
        </div>
      </div>
    </section>

    <!-- ==================== DATA TABLE ==================== -->
    <section id="data-table" class="showcase-section">
      <h2>Data Table</h2>

      <h3>Student Table with Filters</h3>
      <div class="table-container">
        <div class="table-toolbar">
          <PSearchFilter v-model="studentSearch" placeholder="Search name/ email" type="search-only" />
          <div class="showcase-row">
            <PBadge text="Grade" variant="outline" :rounded="false" />
            <PBadge text="Status" variant="outline" :rounded="false" />
            <PBadge text="Group" variant="outline" :rounded="false" />
          </div>
        </div>
        <PTable
          :headers="[
            { key: 'name', title: 'Name/Email', sortable: true },
            { key: 'grade', title: 'Grade', sortable: true },
            { key: 'status', title: 'Status' },
            { key: 'groups', title: 'Groups' },
            { key: 'action', title: 'Action' }
          ]"
          :items="studentTableItems"
          itemKey="name"
          selectable
          v-model:selected="selectedStudents"
          :itemsPerPage="5"
        >
          <template #item.status="{ item }">
            <PBadge :text="item.status" :variant="item.status === 'Active' ? 'success' : item.status === 'Warning' ? 'warning' : 'secondary'" />
          </template>
          <template #item.action="{ item }">
            <div style="display: flex; gap: 8px;">
              <button class="icon-action"><LucideIcon name="ellipsis-vertical" :size="14" /></button>
              <button class="icon-action"><LucideIcon name="grip-vertical" :size="14" /></button>
            </div>
          </template>
        </PTable>
      </div>

      <h3>Assignment Table</h3>
      <PTable
        :headers="[
          { key: 'title', title: 'Assignment Title', sortable: true },
          { key: 'dueDate', title: 'Due Date', sortable: true },
          { key: 'status', title: 'Publication status' },
          { key: 'assignedTo', title: 'Assigned to' },
          { key: 'submissions', title: 'Assignment submissions' }
        ]"
        :items="assignmentTableItems"
        itemKey="title"
        selectable
        v-model:selected="selectedAssignments"
        :itemsPerPage="5"
      >
        <template #item.status="{ item }">
          <PBadge :text="item.status" :variant="item.status === 'Published' ? 'success' : item.status === 'Not published' ? 'warning' : 'secondary'" />
        </template>
        <template #item.submissions="{ item }">
          <PProgress :value="item.submissions" size="sm" style="width: 120px;" />
        </template>
      </PTable>
    </section>

    <!-- ==================== DATA CARD ==================== -->
    <section id="data-card" class="showcase-section">
      <h2>Data Card</h2>

      <h3>Student Detail Cards</h3>
      <div class="showcase-grid-cards">
        <PStudentCard name="Alice Johnson" email="alice@school.edu" variant="selection" :selected="false" />
        <PStudentCard name="Alice Johnson" variant="linked" />
        <PStudentCard name="Alice Johnson" email="5th grade" />
      </div>

      <h3>Group Cards</h3>
      <div class="showcase-grid-cards">
        <PDataCard title="Mathematics 5A" compact>
          <div style="font-size: 0.85rem; color: #64748b; display: flex; flex-direction: column; gap: 4px;">
            <div><strong>Grade</strong> &nbsp; 6th grade</div>
            <div><strong>Subject</strong> &nbsp; English</div>
            <div><strong>Students</strong> &nbsp; 42 &nbsp; <a href="#" style="color: #3b82f6; font-size: 0.8rem;">Add more students</a></div>
          </div>
        </PDataCard>
        <PDataCard title="Mathematics 5A" subtitle="0 Students" compact>
          <div style="font-size: 0.85rem; color: #64748b;">
            6th Grade | English
          </div>
        </PDataCard>
      </div>

      <h3>Action Tiles</h3>
      <div class="showcase-grid-cards">
        <div class="action-tile">
          <div class="action-tile-icon" style="background: #dbeafe;"><LucideIcon name="user-plus" :size="18" style="color: #3b82f6;" /></div>
          <div><div style="font-weight: 600;">Link via SSO</div><div style="color: #64748b; font-size: 0.85rem;">5th Grade</div></div>
        </div>
        <div class="action-tile">
          <div class="action-tile-icon" style="background: #fef3c7;"><LucideIcon name="plus" :size="18" style="color: #f59e0b;" /></div>
          <div><div style="font-weight: 600;">Create individual account</div><div style="color: #64748b; font-size: 0.85rem;">Manually create a single student account</div></div>
        </div>
        <div class="action-tile">
          <div class="action-tile-icon" style="background: #dcfce7;"><LucideIcon name="chevrons-up" :size="18" style="color: #22c55e;" /></div>
          <div><div style="font-weight: 600;">Create bulk accounts</div><div style="color: #64748b; font-size: 0.85rem;">Upload CSV or manually enter multiple students</div></div>
        </div>
      </div>
    </section>

    <!-- ==================== HEADERS ==================== -->
    <section id="headers" class="showcase-section">
      <h2>Headers</h2>

      <div class="showcase-stack">
        <div class="showcase-bordered">
          <PHeader title="Student (3)" subtitle="Manage student accounts" bordered>
            <template #actions>
              <PButton icon="print" text="Print login Code" variant="outline" />
              <PButton icon="plus" text="Add student" variant="primary" />
            </template>
          </PHeader>
        </div>

        <div class="showcase-bordered">
          <PHeader title="Student (3)" subtitle="Manage student accounts" bordered>
            <template #actions>
              <PButton icon="plus" text="Add student" variant="primary" />
            </template>
          </PHeader>
        </div>

        <div class="showcase-bordered">
          <PHeader title="Student (3)" subtitle="Manage Student Accounts" bordered>
            <template #actions>
              <PButton icon="upload" text="Bulk upload" variant="outline" />
              <PButton icon="plus" text="Add student" variant="primary" />
            </template>
          </PHeader>
        </div>
      </div>
    </section>

    <!-- ==================== SEARCH + FILTERS ==================== -->
    <section id="search-+-filters" class="showcase-section">
      <h2>Search + Filters</h2>

      <h3>Simple Search</h3>
      <PSearchFilter v-model="searchSimple" placeholder="Search name/ email" type="search-only" />

      <h3>With Filter Chips</h3>
      <PSearchFilter
        v-model="searchWithFilters"
        placeholder="Search content title"
        :filters="[
          { key: 'grade', label: 'Grade', options: ['5th', '6th', '7th'] },
          { key: 'subject', label: 'Subject', options: ['Math', 'Science', 'English'] },
          { key: 'competency', label: 'Competency', options: ['A', 'B', 'C'] },
          { key: 'pisa', label: 'PISA type', options: ['Type 1', 'Type 2'] },
          { key: 'format', label: 'Content format', options: ['Video', 'Text'] },
          { key: 'curriculum', label: 'Curriculum', options: ['Standard', 'Advanced'] }
        ]"
        :activeFilters="searchFilters"
        @update:activeFilters="searchFilters = $event"
      />
    </section>

    <!-- ==================== DROPDOWNS ==================== -->
    <section id="dropdowns" class="showcase-section">
      <h2>Dropdowns</h2>
      <p class="showcase-desc">Filter dropdowns with checkbox selection and count.</p>

      <div class="showcase-row">
        <PMenu>
          <template #activator="{ props }">
            <PButton text="Status" icon="lucide:circle-plus" variant="outline" @click="props.onClick" />
          </template>
          <PMenuItem title="Profile" prepend-icon="lucide:user" />
          <PMenuItem title="Settings" prepend-icon="lucide:settings" />
          <PMenuItem title="Active Item" prepend-icon="lucide:check" active />
          <PMenuItem title="With Submenu" prepend-icon="lucide:folder">
            <template #submenu>
              <PMenuItem title="Sub Item 1" />
              <PMenuItem title="Sub Item 2" />
            </template>
          </PMenuItem>
          <PMenuItem title="Delete" prepend-icon="lucide:trash-2" danger />
        </PMenu>

        <div class="showcase-row" style="gap: 4px;">
          <PBadge text="Status" variant="info" />
          <PBadge text="Label 1" variant="secondary" :rounded="false" />
          <PBadge text="Label 2" variant="secondary" :rounded="false" />
        </div>
      </div>
    </section>

    <!-- ==================== PAGINATION ==================== -->
    <section id="pagination" class="showcase-section">
      <h2>Pagination</h2>

      <div class="pagination-demo">
        <div style="display: flex; align-items: center; gap: 8px;">
          <PButton variant="outline" icon="arrow-left" text="Previous" size="sm" />
          <PButton variant="outline" icon="lucide:rotate-cw" text="Skip" size="sm" />
        </div>
        <div style="display: flex; align-items: center; gap: 4px;">
          <span class="page-num active">1</span>
          <span class="page-num">2</span>
          <span class="page-num">3</span>
          <span class="page-num">4</span>
          <span class="page-num">5</span>
          <span class="page-num">...</span>
          <span class="page-num">20</span>
        </div>
        <PBadge text="1/20 answered" variant="secondary" :rounded="true" />
        <PButton variant="primary" icon="arrow-right" text="Next" iconRight />
      </div>

      <h3>Table Pagination</h3>
      <PPagination
        :totalItems="95"
        v-model:currentPage="paginationPage"
        v-model:perPage="paginationPerPage"
      />
    </section>

    <!-- ==================== DATE PICKER ==================== -->
    <section id="date-picker" class="showcase-section">
      <h2>Date Picker</h2>

      <div class="datepicker-grid">
        <div>
          <h3>Default</h3>
          <PDatePicker v-model="singleDate" type="single" />
        </div>
        <div>
          <h3>Date Range</h3>
          <PDatePicker v-model="dateRange" type="range" />
        </div>
      </div>
    </section>

    <!-- ==================== MODAL ==================== -->
    <section id="modal" class="showcase-section">
      <h2>Modal</h2>
      <p class="showcase-desc">Modal dialogs for forms and content.</p>

      <div class="showcase-row">
        <PButton text="Add Student Form" @click="showStudentFormModal = true" />
        <PButton text="Basic Modal" variant="secondary" @click="showBasicModal = true" />
        <PButton text="Wide Modal" variant="outline" @click="showWideModal = true" />
      </div>

      <!-- Student form modal matching Figma -->
      <PModal
        v-if="showStudentFormModal"
        @close="showStudentFormModal = false"
        width="520px"
      >
        <template #title>
          <h2 class="text-lg font-semibold text-zinc-950"><LucideIcon name="users" :size="18" style="margin-right: 8px; display: inline;" />Add students</h2>
        </template>
        <template #body>
          <p style="color: #64748b; margin-bottom: 20px;">Enter individual students information</p>
          <div style="display: flex; flex-direction: column; gap: 16px;">
            <PInput label="First Name" placeholder="Enter first name" v-model="formFirstName" />
            <PSelect
              label="Grade Level"
              placeholder="Select grade"
              :items="['5th Grade', '6th Grade', '7th Grade', '8th Grade']"
              v-model="formGrade"
              required
            />
          </div>
        </template>
        <template #footer>
          <PButton variant="outline" text="Back" @click="showStudentFormModal = false" />
          <PButton variant="outline" text="Cancel" @click="showStudentFormModal = false" style="color: #ef4444;" />
          <PButton variant="primary" text="Create account" @click="showStudentFormModal = false" />
        </template>
      </PModal>

      <PModal v-if="showBasicModal" @close="showBasicModal = false" title="Basic Modal" showCloseButton closeButtonText="Done">
        <template #body><p>This is a basic modal with a title and body content.</p></template>
      </PModal>

      <PModal v-if="showWideModal" @close="showWideModal = false" title="Wide Modal" width="800px" showCloseButton closeButtonText="Done">
        <template #body><p>This is a wider modal at 800px.</p></template>
      </PModal>
    </section>

    <!-- ==================== EXTRAS ==================== -->
    <section id="extras" class="showcase-section">
      <h2>Extras</h2>
      <p class="showcase-desc">Additional design elements from the Figma spec.</p>

      <h3>Input Fields</h3>
      <div class="showcase-grid">
        <PInput label="First Name" placeholder="Enter first name" v-model="extraInput1" />
        <PInput label="Email" placeholder="Enter email" icon="lucide:mail" v-model="extraInput2" />
        <PInput label="With Error" placeholder="Required" error="This field is required" v-model="extraInput3" />
      </div>

      <h3>Select</h3>
      <div class="showcase-grid">
        <PSelect label="Grade Level" placeholder="Select grade" :items="['5th Grade', '6th Grade', '7th Grade']" v-model="extraSelect" required />
      </div>

      <h3>Checkbox</h3>
      <div class="showcase-row">
        <PCheckbox label="Default checkbox" v-model="extraCheck1" />
        <PCheckbox label="Checked" v-model="extraCheck2" />
        <PCheckbox label="Disabled" disabled :modelValue="false" />
      </div>

      <h3>Divider</h3>
      <div style="padding: 8px 0;">
        <PDivider />
      </div>

      <h3>Avatar</h3>
      <div class="showcase-row">
        <PAvatar name="Jennifer Smith" :size="40" />
        <PAvatar name="Alice Johnson" :size="40" />
        <PAvatar name="Bob Chen" :size="32" />
        <PAvatar :size="40" />
      </div>

      <h3>File Cards</h3>
      <div class="showcase-row">
        <div class="file-card">
          <LucideIcon name="file-spreadsheet" :size="24" style="color: #64748b;" />
          <div><div style="font-weight: 600;">CSV file</div><div style="color: #64748b; font-size: 0.8rem;">Spreadsheet format</div></div>
        </div>
        <div class="file-card">
          <LucideIcon name="file-text" :size="24" style="color: #64748b;" />
          <div><div style="font-weight: 600;">PDF report</div><div style="color: #64748b; font-size: 0.8rem;">Formatted document</div></div>
        </div>
      </div>
    </section>

  </div>
</template>

<script setup>
import { ref } from 'vue'
import {
  PButton, PBadge, PAlert, PAlertDialog, PProgress, PTabs,
  PTable, PDataCard, PStudentCard, PHeader, PSearchFilter,
  PMenu, PMenuItem, PPagination, PDatePicker,
  PInput, PSelect, PCheckbox, PDivider, PAvatar, PModal
} from '@/components/ui/index.js'
import LucideIcon from '@/components/ui/LucideIcon.vue'

// Tabs
const tabLabels = [
  { key: '1', label: 'Label' },
  { key: '2', label: 'Label' },
  { key: '3', label: 'Label' },
  { key: '4', label: 'Label' },
  { key: '5', label: 'Label' }
]
const tabDefault = ref('1')
const tabDefaultStretch = ref('1')
const tabLine = ref('1')
const tabLineStretch = ref('1')

// Tables
const studentSearch = ref('')
const studentTableItems = [
  { name: 'Full name', grade: '5th Grade', status: 'Active', groups: 'Mathematics 5th, Science basics...', email: 'ken99@yahoo.com' },
  { name: 'Full name', grade: '5th Grade', status: 'Active', groups: 'Science explorers, English', email: 'ken99@yahoo.com' },
  { name: 'Full name', grade: '5th Grade', status: 'Warning', groups: 'Mathematics 5th, Science basics...', email: 'ken99@yahoo.com' },
  { name: 'Full name', grade: '5th Grade', status: 'Active', groups: 'Mathematics 5th, Science basics...', email: 'ken99@yahoo.com' },
]
const selectedStudents = ref([])

const assignmentTableItems = [
  { title: 'Math Mid-Term Review - Assessment', dueDate: '08/09/2025', status: 'Published', assignedTo: 'Science Explorers', submissions: 75 },
  { title: 'Math Mid-Term Review - Assessment', dueDate: '08/09/2025', status: 'Published', assignedTo: 'Science explorers, English', submissions: 50 },
  { title: 'Explore Lab', dueDate: '08/09/2025', status: 'Not published', assignedTo: 'English Learners', submissions: 0 },
  { title: 'Science Lab', dueDate: '08/09/2025', status: 'Not published', assignedTo: 'Not assigned', submissions: 0 },
]
const selectedAssignments = ref([])

// Search
const searchSimple = ref('')
const searchWithFilters = ref('')
const searchFilters = ref({})

// Pagination
const paginationPage = ref(1)
const paginationPerPage = ref(10)

// Date picker
const singleDate = ref(null)
const dateRange = ref(null)

// Dialogs
const showDeleteDialog = ref(false)
const showSuccessDialog = ref(false)
const showAddStudentDialog = ref(false)

// Modals
const showStudentFormModal = ref(false)
const showBasicModal = ref(false)
const showWideModal = ref(false)
const formFirstName = ref('')
const formGrade = ref(null)

// Extras
const extraInput1 = ref('')
const extraInput2 = ref('')
const extraInput3 = ref('')
const extraSelect = ref(null)
const extraCheck1 = ref(false)
const extraCheck2 = ref(true)

// Nav sections
const sections = [
  'Button', 'Badge', 'Alert', 'Alert Dialog', 'Progress', 'Tabs',
  'Data Table', 'Data Card', 'Headers', 'Search + Filters',
  'Dropdowns', 'Pagination', 'Date Picker', 'Modal', 'Extras'
]
</script>

<style scoped>
.showcase {
  max-width: 1040px;
  margin: 0 auto;
  padding: 32px 24px 80px;
  font-family: system-ui, -apple-system, sans-serif;
}

.showcase-header {
  margin-bottom: 32px;
}
.showcase-header h1 {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-primary-600, #2563eb);
  margin: 0 0 4px;
}
.showcase-header p {
  color: #64748b;
  margin: 0;
}

.showcase-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 12px 0 24px;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 32px;
}
.showcase-nav-link {
  font-size: 0.8rem;
  padding: 4px 10px;
  border-radius: 6px;
  color: #475569;
  text-decoration: none;
  background: #f1f5f9;
  transition: background 150ms;
}
.showcase-nav-link:hover {
  background: #e2e8f0;
}

.showcase-section {
  margin-bottom: 56px;
}
.showcase-section h2 {
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 4px;
  padding-bottom: 8px;
  border-bottom: 2px solid var(--color-primary-600, #2563eb);
}
.showcase-section h3 {
  font-size: 0.9rem;
  font-weight: 600;
  color: #334155;
  margin: 20px 0 8px;
}
.showcase-desc {
  color: #64748b;
  font-size: 0.875rem;
  margin: 4px 0 16px;
}

.showcase-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.showcase-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.showcase-grid-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

.showcase-stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.showcase-bordered {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

/* Progress grid */
.progress-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}
.progress-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}
.progress-label {
  font-size: 0.75rem;
  color: #64748b;
  white-space: nowrap;
  width: 80px;
}

/* Tabs grid */
.tabs-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
}

/* Table */
.table-container {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}
.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  gap: 16px;
}
.icon-action {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
}
.icon-action:hover {
  color: #475569;
}

/* Action tiles */
.action-tile {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  cursor: pointer;
  transition: box-shadow 150ms;
}
.action-tile:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
.action-tile-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 1.1rem;
}

/* Pagination demo */
.pagination-demo {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}
.page-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  font-size: 0.875rem;
  color: #334155;
  cursor: pointer;
  border: 1px solid #e2e8f0;
}
.page-num.active {
  background: #f1f5f9;
  font-weight: 600;
  border-color: #cbd5e1;
}
.page-num:hover:not(.active) {
  background: #f8fafc;
}

/* Date picker grid */
.datepicker-grid {
  display: grid;
  grid-template-columns: auto auto;
  gap: 32px;
  justify-content: start;
}

/* File cards */
.file-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px 32px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  text-align: center;
  cursor: pointer;
  transition: box-shadow 150ms;
}
.file-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

@media (max-width: 768px) {
  .progress-grid { grid-template-columns: 1fr 1fr; }
  .tabs-grid { grid-template-columns: 1fr; }
  .datepicker-grid { grid-template-columns: 1fr; }
}
</style>
