<template>
  <div
    class="publish-overlay"
    @click.self="close"
  >
    <section
      class="publish-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="publish-modal-title"
    >
      <!-- HEADER -->
      <header class="modal-header">
        <div>
          <h2 id="publish-modal-title">
            <span class="header-icon">◎</span>
            {{ t('publish-to-explore') }}
          </h2>

          <p>
            {{ t('assign-relevant-competencies-to-make-this-conten') }}
          </p>
        </div>

        <button
          class="icon-button close-button"
          type="button"
          :aria-label="t('close')"
          @click="close"
        >
          ×
        </button>
      </header>

      <div class="modal-divider" />

      <div class="modal-content">
        <div
          v-if="isLoading"
          class="modal-state"
          role="status"
        >
          <span class="favorite-spinner" aria-hidden="true" />
          {{ t('loading-tags') }}
        </div>

        <div
          v-else-if="loadError"
          class="modal-state modal-state--error"
          role="alert"
        >
          <span>{{ t('unable-to-load-tags') }}</span>

          <button
            class="button button--retry"
            type="button"
            @click="loadCompetencies"
          >
            {{ t('try-again') }}
          </button>
        </div>

        <template v-else>
          <TagViewer
            :selected-competencies="selectedCompetencies"
            :working-competency-ids="workingCompetencyIds"
            :update-error="updateError"
            enable-remove
            @remove="toggleCompetency"
          />

          <!-- ROOT GROUPS: one separate accordion per roots[] UUID -->
          <section
            v-if="rootGroups.length"
            class="root-groups"
          >
            <article
              v-for="root in rootGroups"
              :key="root.id"
              class="root-card"
            >
              <!-- TOP LEVEL: expandable, but NO color marker and NOT taggable -->
              <button
                class="root-header"
                type="button"
                :aria-expanded="root.open ? 'true' : 'false'"
                @click="toggleRoot(root.id)"
              >
                <span class="root-title">
                  <TagTranslation :id="root.id" />
                </span>

                <span
                  class="chevron"
                  :class="{
                    'chevron--open': root.open,
                  }"
                  aria-hidden="true"
                >
                  ⌄
                </span>
              </button>

              <div
                v-show="root.open"
                class="root-body"
              >
                <!-- MIDDLE LEVEL: separate expandable categories -->
                <article
                  v-for="category in root.categories"
                  :key="category.id"
                  class="category-card"
                  :class="{
                    'category-card--invalid':
                      showValidation &&
                      category.required &&
                      !hasCategorySelection(category.id),
                  }"
                >
                  <!-- NOT taggable: no checkbox here -->
                  <button
                    class="category-header"
                    type="button"
                    :aria-expanded="category.open ? 'true' : 'false'"
                    @click="toggleCategory(category.id)"
                  >
                    <span class="category-title">
                      <span
                        class="category-dot"
                        :style="{
                          backgroundColor: category.color,
                        }"
                      />

                      <TagTranslation :id="category.id" />

                      <span
                        v-if="category.required"
                        class="required-label"
                      >
                        *{{ t('required') }}
                      </span>
                    </span>

                    <span
                      class="chevron"
                      :class="{
                        'chevron--open': category.open,
                      }"
                      aria-hidden="true"
                    >
                      ⌄
                    </span>
                  </button>

                  <div
                    v-show="category.open"
                    class="category-body"
                  >
                    <!-- LEAVES: the only taggable level -->
                    <div class="competency-grid">
                      <label
                        v-for="competency in category.competencies"
                        :key="competency.id"
                        class="competency-option"
                        :class="{
                          'competency-option--working':
                            isCompetencyWorking(
                              category.id,
                              competency.id,
                            ),
                        }"
                      >
                        <input
                          type="checkbox"
                          :checked="
                            isCompetencySelected(
                              category.id,
                              competency.id,
                            )
                          "
                          :disabled="
                            isCompetencyWorking(
                              category.id,
                              competency.id,
                            )
                          "
                          @change="
                            toggleCompetency(
                              category.id,
                              competency.id,
                            )
                          "
                        />

                        <span
                          v-if="
                            isCompetencyWorking(
                              category.id,
                              competency.id,
                            )
                          "
                          class="checkbox-spinner"
                          role="status"
                          :aria-label="t('working')"
                        />

                        <span
                          v-else
                          class="custom-checkbox"
                        >
                          <span class="checkmark">✓</span>
                        </span>

                        <span>
                          <TagTranslation :id="competency.id" />
                        </span>
                      </label>
                    </div>

                    <p
                      v-if="
                        showValidation &&
                        category.required &&
                        !hasCategorySelection(category.id)
                      "
                      class="validation-message"
                    >
                      {{ t('select-at-least-one-competency-from-this-category') }}
                    </p>
                  </div>
                </article>
              </div>
            </article>
          </section>

          <p
            v-else
            class="modal-state"
          >
            {{ t('no-tags-available') }}
          </p>

          <button
            class="favorite-row"
            type="button"
            :disabled="isFavoriteWorking"
            :aria-pressed="isFavorite ? 'true' : 'false'"
            @click="toggleFavorite"
          >
            <span>
              <strong>
                {{ t('add-to-favorites') }}
              </strong>

              <small>
                {{ t('mark-this-content-as-a-favorite-for-quick-access') }}
              </small>
            </span>

            <span
              v-if="isFavoriteWorking"
              class="favorite-spinner"
              role="status"
              :aria-label="t('working')"
            />

            <span
              v-else
              class="heart"
              :class="{
                'heart--active': isFavorite,
              }"
              aria-hidden="true"
            >
              {{ isFavorite ? '♥' : '♡' }}
            </span>
          </button>
        </template>
      </div>

      <!-- FOOTER -->
      <footer class="modal-footer">
        <div class="publishing-title">
          {{ t('publishing') }} “{{ contentTitle }}”
        </div>

        <div class="footer-actions">
          <button
            class="button button--primary"
            type="button"
            :disabled="
              hasPendingChanges ||
              isLoading ||
              !!loadError
            "
            @click="publish"
          >
            {{
              isLoading
                ? t('loading-tags')
                : hasPendingChanges
                ? t('saving-changes')
                : t('publish-content')
            }}
          </button>
        </div>
      </footer>
    </section>
  </div>
</template>

<script>
import TagTranslation from './tag-translation.vue'
import TagViewer from './tag-viewer.vue'
import setTagging from '../set-tagging.js'

const TAGS_DOMAIN = 'tags.knowlearning.systems'
const TAG_HIERARCHY_PARTITION = 'PILA Tag Hierarchy'
const FAVORITE_TAG = '59d4b400-8d2e-11f1-8178-475d87d411d7'

function uniqueTargets(taggings) {
  if (!Array.isArray(taggings)) {
    throw new TypeError('Expected an array of taggings')
  }

  if (
    taggings.some(
      (tagging) => typeof tagging?.target !== 'string',
    )
  ) {
    throw new TypeError('Expected every tagging to have a target')
  }

  return [
    ...new Set(
      taggings.map((tagging) => tagging.target),
    ),
  ]
}

const requiredCategoryIds = []

/*
 * Colors belong ONLY to middle-level categories.
 */
const categoryColors = [
  '#e84d5b',
  '#3979ef',
  '#9b64e8',
  '#e7ad20',
  '#2fa68c',
  '#eb7d3c',
  '#6675d8',
  '#cc5d9b',
]

async function hasTag(partition, tag, target) {
  const tagging = await Agent.query(
    'tagging-for-target',
    [partition, tag, target],
    TAGS_DOMAIN
  )

  return !!tagging?.[0]
}

export default {
  name: 'PublishToExploreModal',

  components: { TagTranslation, TagViewer },

  emits: [ 'close' ],

  props: {
    id: {
      type: String,
      required: true,
    },

    roots: {
      type: Array,
      required: true,
    },

    contentTitle: {
      type: String,
      default: 'Untitled Sequence',
    },
  },

  data() {
    return {
      /*
       * IMPORTANT:
       * This preserves each root as a separate group.
       *
       * [
       *   {
       *     id: rootId,
       *     categories: [
       *       {
       *         id: middleCategoryId,
       *         competencies: [leafId, leafId]
       *       }
       *     ]
       *   }
       * ]
       */
      competencyData: [],

      /*
       * Root accordions and middle-category accordions
       * are tracked independently.
       */
      openRootIds: [],
      openCategoryIds: [],

      /*
       * Only leaf IDs can appear here.
       */
      selectedIds: [],

      workingCompetencyIds: {},

      isFavorite: false,
      isFavoriteWorking: true,
      showValidation: false,
      isLoading: true,
      loadError: false,
      updateError: false,
      loadRequestId: 0,
    }
  },

  async created() {
    const { auth: { user } } = await Agent.environment()

    this.isFavorite = await hasTag(
      user,
      FAVORITE_TAG,
      this.id,
    )

    this.isFavoriteWorking = false
  },

  watch: {
    id: {
      immediate: true,
      handler: 'loadCompetencies',
    },

    roots: {
      deep: true,
      handler: 'loadCompetencies',
    },
  },

  computed: {
    taggingPartition() {
      return TAG_HIERARCHY_PARTITION
    },

    rootGroups() {
      let categoryIndex = 0

      return this.competencyData.map((root) => ({
        id: root.id,

        open:
          this.openRootIds.includes(root.id),

        categories:
          root.categories.map((category) => {
            const display = {
              color:
                categoryColors[
                  categoryIndex % categoryColors.length
                ],

              open:
                this.openCategoryIds.includes(category.id),

              required:
                requiredCategoryIds.includes(category.id),
            }

            categoryIndex += 1

            return {
              id: category.id,
              color: display.color,
              open: display.open,
              required: display.required,

              competencies:
                category.competencies.map(
                  (competencyId) => ({
                    id: competencyId,
                  }),
                ),
            }
          }),
      }))
    },

    allCategories() {
      return this.rootGroups.flatMap(
        (root) => root.categories,
      )
    },

    selectedCompetencies() {
      return this.allCategories.reduce(
        (selections, category) => {
          const categorySelections =
            category.competencies
              .filter((competency) =>
                this.selectedIds.includes(
                  competency.id,
                ),
              )
              .map((competency) => ({
                ...competency,
                categoryId: category.id,
                categoryColor: category.color,
              }))

          return selections.concat(
            categorySelections,
          )
        },
        [],
      )
    },

    isValid() {
      return this.allCategories
        .filter((category) => category.required)
        .every((category) => {
          return this.hasCategorySelection(
            category.id,
          )
        })
    },

    hasPendingCompetencies() {
      return Object.keys(
        this.workingCompetencyIds,
      ).length > 0
    },

    hasPendingChanges() {
      return (
        this.hasPendingCompetencies ||
        this.isFavoriteWorking
      )
    },
  },

  methods: {
    t(slug) {
      return store.getters.t(slug)
    },

    async loadCompetencies() {
      const requestId = ++this.loadRequestId

      this.isLoading = true
      this.loadError = false
      this.updateError = false

      try {
        if (!this.taggingPartition) {
          throw new Error(
            'No tag partition is configured for this host',
          )
        }

        /*
         * NO FLATTENING HERE.
         *
         * Each root is fetched independently and returned
         * as its own object with its own categories.
         */
        const [rootEntries, contentTaggings] =
          await Promise.all([
            Promise.all(
              this.roots.map(async (rootId) => {
                /*
                 * root -> middle categories
                 */
                const categoryTaggings =
                  await Agent.query(
                    'targets-for-tag',
                    [
                      TAG_HIERARCHY_PARTITION,
                      rootId,
                    ],
                    TAGS_DOMAIN,
                  )

                const categoryIds =
                  uniqueTargets(categoryTaggings)

                /*
                 * each middle category -> leaf tags
                 */
                const categories =
                  await Promise.all(
                    categoryIds.map(
                      async (categoryId) => {
                        const competencyTaggings =
                          await Agent.query(
                            'targets-for-tag',
                            [
                              TAG_HIERARCHY_PARTITION,
                              categoryId,
                            ],
                            TAGS_DOMAIN,
                          )

                        return {
                          id: categoryId,
                          competencies:
                            uniqueTargets(
                              competencyTaggings,
                            ),
                        }
                      },
                    ),
                  )

                return {
                  id: rootId,
                  categories,
                }
              }),
            ),

            Agent.query(
              'taggings-for-target',
              [
                this.taggingPartition,
                this.id,
              ],
              TAGS_DOMAIN,
            ),
          ])

        if (!Array.isArray(contentTaggings)) {
          throw new TypeError(
            'Expected an array of content taggings',
          )
        }

        if (
          contentTaggings.some(
            (tagging) =>
              typeof tagging?.tag !== 'string',
          )
        ) {
          throw new TypeError(
            'Expected every content tagging to have a tag',
          )
        }

        const selectedTagIds = new Set(
          contentTaggings.map(
            (tagging) => tagging.tag,
          ),
        )

        if (requestId !== this.loadRequestId) {
          return
        }

        /*
         * Preserve root boundaries exactly.
         */
        this.competencyData = rootEntries

        /*
         * Only leaf IDs are selectable.
         * Root IDs and middle-category IDs are excluded.
         */
        const leafIds = new Set(
          rootEntries.flatMap(
            (root) =>
              root.categories.flatMap(
                (category) =>
                  category.competencies,
              ),
          ),
        )

        this.selectedIds = [
          ...selectedTagIds,
        ].filter((id) => leafIds.has(id))

        /*
         * Match original behavior: everything starts closed.
         */
        this.openRootIds = []
        this.openCategoryIds = []
      } catch (error) {
        if (requestId !== this.loadRequestId) {
          return
        }

        this.competencyData = []
        this.selectedIds = []
        this.openRootIds = []
        this.openCategoryIds = []
        this.loadError = true

        console.error(
          'Unable to load tag hierarchy:',
          error,
        )
      } finally {
        if (requestId === this.loadRequestId) {
          this.isLoading = false
        }
      }
    },

    close() {
      this.$emit('close')
    },

    getCompetencyWorkingId(
      _categoryId,
      competencyId,
    ) {
      return competencyId
    },

    isCompetencyWorking(
      categoryId,
      competencyId,
    ) {
      const workingId =
        this.getCompetencyWorkingId(
          categoryId,
          competencyId,
        )

      return (
        this.workingCompetencyIds[
          workingId
        ] === true
      )
    },

    toggleRoot(rootId) {
      const rootIndex =
        this.openRootIds.indexOf(rootId)

      if (rootIndex >= 0) {
        this.openRootIds.splice(rootIndex, 1)
      } else {
        this.openRootIds.push(rootId)
      }
    },

    openRoot(rootId) {
      if (!this.openRootIds.includes(rootId)) {
        this.openRootIds.push(rootId)
      }
    },

    toggleCategory(categoryId) {
      const categoryIndex =
        this.openCategoryIds.indexOf(categoryId)

      if (categoryIndex >= 0) {
        this.openCategoryIds.splice(
          categoryIndex,
          1,
        )
      } else {
        this.openCategoryIds.push(categoryId)
      }
    },

    openCategory(categoryId) {
      if (
        !this.openCategoryIds.includes(categoryId)
      ) {
        this.openCategoryIds.push(categoryId)
      }
    },

    isCompetencySelected(
      _categoryId,
      competencyId,
    ) {
      return this.selectedIds.includes(
        competencyId,
      )
    },

    hasCategorySelection(categoryId) {
      const category =
        this.allCategories.find(
          (candidate) =>
            candidate.id === categoryId,
        )

      if (!category) {
        return false
      }

      return category.competencies.some(
        (competency) =>
          this.selectedIds.includes(
            competency.id,
          ),
      )
    },

    findRootForCategory(categoryId) {
      return this.rootGroups.find(
        (root) =>
          root.categories.some(
            (category) =>
              category.id === categoryId,
          ),
      )
    },

    async toggleCompetency(
      categoryId,
      competencyId,
    ) {
      const workingId =
        this.getCompetencyWorkingId(
          categoryId,
          competencyId,
        )

      if (this.workingCompetencyIds[workingId]) {
        return
      }

      const isSelected =
        this.isCompetencySelected(
          categoryId,
          competencyId,
        )

      this.workingCompetencyIds[workingId] = true
      this.updateError = false

      try {
        if (!this.taggingPartition) {
          throw new Error(
            'No tag partition is configured for this host',
          )
        }

        /*
         * Only this leaf competencyId is ever passed
         * to setTagging().
         */
        await setTagging(
          {
            tag: competencyId,
            target: this.id,
            value: isSelected ? null : true,
          },
          this.taggingPartition,
        )

        if (isSelected) {
          this.selectedIds =
            this.selectedIds.filter(
              (id) => id !== competencyId,
            )
        } else if (
          !this.selectedIds.includes(
            competencyId,
          )
        ) {
          this.selectedIds.push(
            competencyId,
          )
        }
      } catch (error) {
        this.updateError = true

        console.error(
          'Unable to update competency selection:',
          error,
        )
      } finally {
        delete this.workingCompetencyIds[
          workingId
        ]
      }
    },

    async toggleFavorite() {
      if (this.isFavoriteWorking) {
        return
      }

      this.isFavoriteWorking = true

      try {
        const { auth: { user } } =
          await Agent.environment()

        await setTagging(
          {
            tag: FAVORITE_TAG,
            target: this.id,
            value:
              !this.isFavorite
                ? true
                : null,
          },
          user,
        )

        this.isFavorite = !this.isFavorite
      } catch (error) {
        console.error(
          'Unable to update favorite status:',
          error,
        )
      } finally {
        this.isFavoriteWorking = false
      }
    },

    publish() {
      if (
        this.hasPendingChanges ||
        this.isLoading ||
        this.loadError
      ) {
        return
      }

      this.showValidation = true

      if (!this.isValid) {
        const firstInvalidCategory =
          this.allCategories.find(
            (category) =>
              category.required &&
              !this.hasCategorySelection(
                category.id,
              ),
          )

        if (firstInvalidCategory) {
          const root =
            this.findRootForCategory(
              firstInvalidCategory.id,
            )

          if (root) {
            this.openRoot(root.id)
          }

          this.openCategory(
            firstInvalidCategory.id,
          )
        }

        return
      }

      this.$emit('close')
    },
  },
}
</script>

<style scoped>
* {
  box-sizing: border-box;
}

button,
input {
  font: inherit;
}

.publish-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(20, 25, 35, 0.55);
}

.publish-modal {
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(780px, 100%);
  max-height: calc(100vh - 48px);
  overflow: hidden;
  color: #202737;
  background: #ffffff;
  border: 1px solid #e0e5ee;
  border-radius: 16px;
  box-shadow:
    0 24px 80px rgba(22, 32, 54, 0.24),
    0 4px 16px rgba(22, 32, 54, 0.1);
}

.modal-header {
  display: flex;
  flex: 0 0 auto;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: 20px 22px 16px;
}

.modal-header h2 {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.2;
}

.modal-header p {
  margin: 5px 0 0;
  color: #6f7889;
  font-size: 12px;
}

.header-icon {
  display: inline-grid;
  width: 18px;
  height: 18px;
  place-items: center;
  color: #394964;
  font-size: 16px;
}

.icon-button {
  display: inline-grid;
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  place-items: center;
  padding: 0;
  color: #7193c7;
  background: #f2f6fc;
  border: 0;
  border-radius: 7px;
  cursor: pointer;
}

.icon-button:hover {
  color: #3569bc;
  background: #e8f0fb;
}

.close-button {
  font-size: 20px;
  line-height: 1;
}

.modal-divider {
  flex: 0 0 auto;
  height: 1px;
  background: #e6eaf0;
}

.modal-content {
  flex: 1 1 auto;
  min-height: 0;
  padding: 18px 22px 20px;
  overflow-y: auto;
}

.modal-state {
  display: flex;
  min-height: 180px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 0;
  color: #6f7889;
  font-size: 12px;
  text-align: center;
}

.modal-state--error {
  flex-direction: column;
  color: #d9414e;
}

.button--retry {
  min-height: 32px;
  color: #3979ef;
  background: #ffffff;
  border: 1px solid #9bbaf3;
}

/* TOP LEVEL ROOT GROUPS */
.root-groups {
  display: grid;
  gap: 12px;
}

.root-card {
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #cfd7e3;
  border-radius: 10px;
}

.root-header {
  display: flex;
  width: 100%;
  min-height: 46px;
  align-items: center;
  justify-content: space-between;
  padding: 11px 14px;
  color: #202737;
  text-align: left;
  background: #eef2f7;
  border: 0;
  cursor: pointer;
}

/*
 * No colored circle at the root level.
 */
.root-title {
  font-size: 13px;
  font-weight: 700;
}

.root-body {
  display: grid;
  gap: 10px;
  padding: 10px;
  border-top: 1px solid #dde3ec;
}

/* MIDDLE LEVEL CATEGORY ACCORDIONS */
.category-card {
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #dce3ed;
  border-radius: 9px;
  transition:
    border-color 150ms ease,
    box-shadow 150ms ease;
}

.category-card--invalid {
  border-color: #e35d68;
  box-shadow: 0 0 0 2px rgba(227, 93, 104, 0.1);
}

.category-header {
  display: flex;
  width: 100%;
  min-height: 43px;
  align-items: center;
  justify-content: space-between;
  padding: 10px 13px;
  color: #202737;
  text-align: left;
  background: #f7f9fc;
  border: 0;
  cursor: pointer;
}

.category-title {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 600;
}

/*
 * Color marker appears ONLY on the middle category.
 */
.category-dot {
  width: 6px;
  height: 6px;
  flex: 0 0 auto;
  border-radius: 50%;
}

.required-label {
  color: #e6424e;
  font-size: 11px;
  font-weight: 600;
}

.chevron {
  display: inline-block;
  color: #68758a;
  font-size: 16px;
  transform: rotate(0deg);
  transition: transform 150ms ease;
}

.chevron--open {
  transform: rotate(180deg);
}

.category-body {
  padding: 15px 14px 16px;
  border-top: 1px solid #eef1f5;
}

/* LEAF TAGS */
.competency-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 48px;
  row-gap: 13px;
}

.competency-option {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  gap: 8px;
  color: #343d4e;
  cursor: pointer;
  font-size: 12px;
  line-height: 1.35;
}

.competency-option--working {
  cursor: wait;
  opacity: 0.7;
}

.competency-option input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}

.custom-checkbox,
.checkbox-spinner {
  width: 17px;
  height: 17px;
  flex: 0 0 auto;
  margin-top: -1px;
}

.custom-checkbox {
  display: inline-grid;
  place-items: center;
  color: transparent;
  background: #ffffff;
  border: 1px solid #9aa9bd;
  border-radius: 4px;
  transition:
    background-color 120ms ease,
    border-color 120ms ease;
}

.checkbox-spinner {
  border: 2px solid #d5deeb;
  border-top-color: #3979ef;
  border-radius: 50%;
  animation: working-spin 650ms linear infinite;
}

.checkmark {
  font-size: 11px;
  font-weight: 800;
}

.competency-option input:checked + .custom-checkbox {
  color: #ffffff;
  background: #3979ef;
  border-color: #3979ef;
}

.competency-option input:focus + .custom-checkbox {
  outline: 3px solid rgba(57, 121, 239, 0.2);
  outline-offset: 2px;
}

@keyframes working-spin {
  to {
    transform: rotate(360deg);
  }
}

.validation-message {
  margin: 13px 0 0;
  color: #d9414e;
  font-size: 11px;
}

.favorite-row {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-top: 10px;
  padding: 14px 13px;
  color: #293244;
  text-align: left;
  background: #f8f9fb;
  border: 0;
  border-radius: 8px;
  cursor: pointer;
}

.favorite-row:disabled {
  color: #293244;
  cursor: wait;
  opacity: 0.7;
}

.favorite-row strong,
.favorite-row small {
  display: block;
}

.favorite-row strong {
  margin-bottom: 4px;
  font-size: 12px;
}

.favorite-row small {
  color: #818b9c;
  font-size: 10px;
}

.heart {
  color: #536076;
  font-size: 22px;
}

.heart--active {
  color: #e34f61;
}

.favorite-spinner {
  width: 20px;
  height: 20px;
  flex: 0 0 auto;
  margin-right: 1px;
  border: 2px solid #d5deeb;
  border-top-color: #3979ef;
  border-radius: 50%;
  animation: working-spin 650ms linear infinite;
}

.modal-footer {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 22px 18px;
  background: #ffffff;
  border-top: 1px solid #e6eaf0;
}

.publishing-title {
  max-width: 40%;
  overflow: hidden;
  color: #8a94a5;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.footer-actions {
  display: flex;
  align-items: center;
  gap: 9px;
}

.button {
  min-height: 36px;
  padding: 8px 14px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
}

.button:disabled {
  cursor: wait;
  opacity: 0.6;
}

.button--primary {
  color: #ffffff;
  background: #3979ef;
  border: 1px solid #3979ef;
}

.button:hover:not(:disabled) {
  filter: brightness(0.98);
}

@media (max-width: 700px) {
  .publish-overlay {
    padding: 0;
  }

  .publish-modal {
    width: 100%;
    height: 100%;
    max-height: none;
    border: 0;
    border-radius: 0;
  }

  .competency-grid {
    grid-template-columns: 1fr;
    row-gap: 12px;
  }

  .modal-footer {
    align-items: stretch;
    flex-direction: column;
  }

  .publishing-title {
    max-width: none;
  }

  .footer-actions {
    display: flex;
    justify-content: flex-end;
  }
}
</style>
