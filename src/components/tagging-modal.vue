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
            {{ t('assign-relevant-competencies-to-make-this-content-discoverable') }}
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

      <!-- SCROLLABLE CONTENT -->
      <div class="modal-content">
        <!-- SELECTED COMPETENCIES -->
        <section class="selected-tags-section">
          <div class="section-label">
            <span class="tag-outline-icon">◇</span>
            {{ t('selected-competencies') }}:
          </div>

          <div class="selected-tags-box">
            <template v-if="selectedCompetencies.length">
              <button
                v-for="selection in selectedCompetencies"
                :key="`${selection.categoryId}-${selection.id}`"
                class="selected-tag"
                type="button"
                :disabled="
                  isCompetencyWorking(
                    selection.categoryId,
                    selection.id,
                  )
                "
                :style="{
                  '--category-color': selection.categoryColor,
                }"
                @click="
                  toggleCompetency(
                    selection.categoryId,
                    selection.id,
                  )
                "
              >
                <span class="tag-dot" />

                <span>
                  {{ t(selection.categoryId) }}
                  =
                  {{ t(selection.id) }}
                </span>

                <span
                  v-if="
                    isCompetencyWorking(
                      selection.categoryId,
                      selection.id,
                    )
                  "
                  class="small-spinner"
                  role="status"
                  :aria-label="t('working')"
                />

                <span
                  v-else
                  class="tag-remove"
                  aria-hidden="true"
                >
                  ×
                </span>
              </button>
            </template>

            <span
              v-else
              class="empty-selection"
            >
              {{ t('no-competencies-selected-yet') }}
            </span>
          </div>
        </section>

        <!-- COMPETENCY ACCORDIONS -->
        <section class="categories">
          <article
            v-for="category in competencyCategories"
            :key="category.id"
            class="category-card"
            :class="{
              'category-card--invalid':
                showValidation &&
                category.required &&
                !hasCategorySelection(category.id),
            }"
          >
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

                {{ t(category.id) }}

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
                    {{ t(competency.id) }}
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
        </section>

        <!-- FAVORITE -->
        <button
          class="favorite-row"
          type="button"
          :disabled="isFavoriteWorking"
          :aria-pressed="addToFavorites ? 'true' : 'false'"
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
              'heart--active': addToFavorites,
            }"
            aria-hidden="true"
          >
            {{ addToFavorites ? '♥' : '♡' }}
          </span>
        </button>
      </div>

      <!-- FOOTER -->
      <footer class="modal-footer">
        <div class="publishing-title">
          {{ t('publishing') }} “{{ contentTitle }}”
        </div>

        <div class="footer-actions">
          <button
            class="button button--cancel"
            type="button"
            @click="close"
          >
            {{ t('cancel') }}
          </button>

          <button
            class="button button--primary"
            type="button"
            :disabled="hasPendingChanges"
            @click="publish"
          >
            {{
              hasPendingChanges
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
/*
 * Temporary English translation map.
 *
 * Later, remove this map and import your real translation function:
 *
 * import { t } from 'wherever-your-translations-live'
 */
const placeholderTranslations = {
  /*
   * General interface text
   */
  'publish-to-explore':
    'Publish to Explore',

  'assign-relevant-competencies-to-make-this-content-discoverable':
    'Assign relevant competencies to make this content discoverable by other teachers.',

  close:
    'Close',

  'selected-competencies':
    'Selected Competencies',

  'no-competencies-selected-yet':
    'No competencies selected yet.',

  required:
    'Required',

  working:
    'Working',

  'select-at-least-one-competency-from-this-category':
    'Select at least one competency from this category.',

  'add-to-favorites':
    'Add to Favorites',

  'mark-this-content-as-a-favorite-for-quick-access':
    'Mark this content as a favorite for quick access.',

  publishing:
    'Publishing',

  cancel:
    'Cancel',

  'saving-changes':
    'Saving changes…',

  'publish-content':
    'Publish content',

  /*
   * Competency categories
   */
  'mathematical-practices':
    'Mathematical Practices',

  'number-and-operations':
    'Number and Operations',

  'communication-and-collaboration':
    'Communication and Collaboration',

  'self-directed-learning':
    'Self-Directed Learning',

  /*
   * Mathematical Practices
   */
  'reason-abstractly-and-quantitatively':
    'Reason abstractly and quantitatively',

  'construct-viable-arguments':
    'Construct viable arguments',

  'model-real-situations-with-mathematics':
    'Model real situations with mathematics',

  'use-mathematical-tools-strategically':
    'Use mathematical tools strategically',

  'attend-to-precision':
    'Attend to precision',

  'look-for-and-use-structure':
    'Look for and use structure',

  'persevere-in-problem-solving':
    'Persevere in problem solving',

  'recognize-repeated-reasoning':
    'Recognize repeated reasoning',

  /*
   * Number and Operations
   */
  'counting-and-cardinality':
    'Counting and cardinality',

  'place-value-understanding':
    'Place value understanding',

  'addition-and-subtraction':
    'Addition and subtraction',

  'multiplication-and-division':
    'Multiplication and division',

  'fraction-concepts':
    'Fraction concepts',

  'decimal-concepts':
    'Decimal concepts',

  'operations-with-integers':
    'Operations with integers',

  'ratios-and-proportional-reasoning':
    'Ratios and proportional reasoning',

  /*
   * Communication and Collaboration
   */
  'explain-mathematical-thinking':
    'Explain mathematical thinking',

  'use-mathematical-vocabulary':
    'Use mathematical vocabulary',

  'interpret-visual-representations':
    'Interpret visual representations',

  'compare-solution-strategies':
    'Compare solution strategies',

  'ask-clarifying-questions':
    'Ask clarifying questions',

  'give-constructive-peer-feedback':
    'Give constructive peer feedback',

  'solve-problems-collaboratively':
    'Solve problems collaboratively',

  'justify-conclusions-clearly':
    'Justify conclusions clearly',

  /*
   * Self-Directed Learning
   */
  'set-learning-goals':
    'Set learning goals',

  'monitor-personal-progress':
    'Monitor personal progress',

  'revise-work-after-feedback':
    'Revise work after feedback',

  'choose-an-appropriate-strategy':
    'Choose an appropriate strategy',

  'manage-productive-frustration':
    'Manage productive frustration',

  'reflect-on-errors':
    'Reflect on errors',

  'work-independently':
    'Work independently',

  'seek-help-when-appropriate':
    'Seek help when appropriate',
}

/*
 * This plain object represents the data that will eventually be fetched.
 *
 * Both the category keys and the competency values are translation slugs.
 * That means the fetched data can be displayed using t(slug) directly.
 */
const competencySourceData = {
  'mathematical-practices': [
    'reason-abstractly-and-quantitatively',
    'construct-viable-arguments',
    'model-real-situations-with-mathematics',
    'use-mathematical-tools-strategically',
    'attend-to-precision',
    'look-for-and-use-structure',
    'persevere-in-problem-solving',
    'recognize-repeated-reasoning',
  ],

  'number-and-operations': [
    'counting-and-cardinality',
    'place-value-understanding',
    'addition-and-subtraction',
    'multiplication-and-division',
    'fraction-concepts',
    'decimal-concepts',
    'operations-with-integers',
    'ratios-and-proportional-reasoning',
  ],

  'communication-and-collaboration': [
    'explain-mathematical-thinking',
    'use-mathematical-vocabulary',
    'interpret-visual-representations',
    'compare-solution-strategies',
    'ask-clarifying-questions',
    'give-constructive-peer-feedback',
    'solve-problems-collaboratively',
    'justify-conclusions-clearly',
  ],

  'self-directed-learning': [
    'set-learning-goals',
    'monitor-personal-progress',
    'revise-work-after-feedback',
    'choose-an-appropriate-strategy',
    'manage-productive-frustration',
    'reflect-on-errors',
    'work-independently',
    'seek-help-when-appropriate',
  ],
}

/*
 * This remains the only category-specific hard-coded addition.
 */
const requiredCategoryIds = [
  'mathematical-practices',
]

/*
 * Category colors are assigned by their order in the fetched object.
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

export default {
  name: 'PublishToExploreModal',

  props: {
  	id: {
  		type: String,
  		required: true
  	},
    contentTitle: {
      type: String,
      default: 'Untitled Sequence',
    },
  },

  data() {
    return {
      /*
       * This will eventually be populated by an async fetch.
       */
      competencyData: {
        ...competencySourceData,
      },

      /*
       * An empty array means every category starts closed.
       */
      openCategoryIds: [],

      /*
       * The selected IDs now match the translation slugs directly.
       */
      selectedIds: {
        'mathematical-practices': [
          'model-real-situations-with-mathematics',
        ],

        'number-and-operations': [
          'multiplication-and-division',
        ],

        'communication-and-collaboration': [
          'explain-mathematical-thinking',
        ],

        'self-directed-learning': [],
      },

      /*
       * Each pending competency gets its own working state.
       */
      workingCompetencyIds: {},

      addToFavorites: false,
      isFavoriteWorking: false,
      showValidation: false,
    }
  },

  computed: {
    categoryDisplayConfig() {
      return Object.keys(this.competencyData).reduce(
        (config, categoryId, categoryIndex) => {
          config[categoryId] = {
            color:
              categoryColors[
                categoryIndex % categoryColors.length
              ],

            open:
              this.openCategoryIds.includes(categoryId),

            required:
              requiredCategoryIds.includes(categoryId),
          }

          return config
        },
        {},
      )
    },

    competencyCategories() {
      return Object.keys(this.competencyData).map(
        (categoryId) => {
          const display =
            this.categoryDisplayConfig[categoryId]

          const competencyIds =
            this.competencyData[categoryId] || []

          return {
            id: categoryId,
            color: display.color,
            open: display.open,
            required: display.required,

            competencies: competencyIds.map(
              (competencyId) => {
                return {
                  id: competencyId,
                }
              },
            ),
          }
        },
      )
    },

    selectedCompetencies() {
      return this.competencyCategories.reduce(
        (selections, category) => {
          const selectedCategoryIds =
            this.selectedIds[category.id] || []

          const categorySelections =
            category.competencies
              .filter((competency) => {
                return selectedCategoryIds.includes(
                  competency.id,
                )
              })
              .map((competency) => {
                return {
                  ...competency,
                  categoryId: category.id,
                  categoryColor: category.color,
                }
              })

          return selections.concat(categorySelections)
        },
        [],
      )
    },

    isValid() {
      return this.competencyCategories
        .filter((category) => category.required)
        .every((category) => {
          return this.hasCategorySelection(category.id)
        })
    },

    hasPendingCompetencies() {
      return Object.keys(this.workingCompetencyIds).length > 0
    },

    hasPendingChanges() {
      return (
        this.hasPendingCompetencies ||
        this.isFavoriteWorking
      )
    },
  },

  methods: {
    /*
     * Temporary placeholder translation function.
     *
     * Later, replace this method with your imported t() function.
     */
    t(slug) {
      return placeholderTranslations[slug] || slug
    },

    close() {
      this.$emit('close')
    },

    getCompetencyWorkingId(categoryId, competencyId) {
      return `${categoryId}::${competencyId}`
    },

    isCompetencyWorking(categoryId, competencyId) {
      const workingId =
        this.getCompetencyWorkingId(
          categoryId,
          competencyId,
        )

      return this.workingCompetencyIds[workingId] === true
    },

    toggleCategory(categoryId) {
      const categoryIndex =
        this.openCategoryIds.indexOf(categoryId)

      if (categoryIndex >= 0) {
        this.openCategoryIds.splice(categoryIndex, 1)
      } else {
        this.openCategoryIds.push(categoryId)
      }
    },

    openCategory(categoryId) {
      if (!this.openCategoryIds.includes(categoryId)) {
        this.openCategoryIds.push(categoryId)
      }
    },

    isCompetencySelected(categoryId, competencyId) {
      const categorySelections =
        this.selectedIds[categoryId] || []

      return categorySelections.includes(competencyId)
    },

    hasCategorySelection(categoryId) {
      const categorySelections =
        this.selectedIds[categoryId] || []

      return categorySelections.length > 0
    },

    wait(milliseconds) {
      return new Promise((resolve) => {
        window.setTimeout(resolve, milliseconds)
      })
    },

    async toggleCompetency(categoryId, competencyId) {
      const workingId =
        this.getCompetencyWorkingId(
          categoryId,
          competencyId,
        )

      if (this.workingCompetencyIds[workingId]) {
        return
      }

      this.$set(
        this.workingCompetencyIds,
        workingId,
        true,
      )

      try {
        /*
         * Placeholder for the future non-optimistic system request.
         */
        await this.wait(1000)

        const categorySelections =
          this.selectedIds[categoryId]

        if (!categorySelections) {
          this.$set(
            this.selectedIds,
            categoryId,
            [competencyId],
          )

          return
        }

        const selectedIndex =
          categorySelections.indexOf(competencyId)

        if (selectedIndex >= 0) {
          categorySelections.splice(selectedIndex, 1)
        } else {
          categorySelections.push(competencyId)
        }
      } catch (error) {
        console.error(
          'Unable to update competency selection:',
          error,
        )
      } finally {
        this.$delete(
          this.workingCompetencyIds,
          workingId,
        )
      }
    },

    async toggleFavorite() {
      if (this.isFavoriteWorking) {
        return
      }

      this.isFavoriteWorking = true

      try {
        /*
         * The favorite uses the same placeholder request pattern.
         */
        await this.wait(1000)

        this.addToFavorites = !this.addToFavorites
      } catch (error) {
        console.error(
          'Unable to update favorite status:',
          error,
        )
      } finally {
        this.isFavoriteWorking = false
      }
    },

    buildPayload() {
      return {
        contentTitle: this.contentTitle,

        /*
         * Category and competency values are their stable slugs.
         * Translated display text is not included in the saved payload.
         */
        competencies: this.selectedCompetencies.map(
          (selection) => {
            return {
              categoryId: selection.categoryId,
              competencyId: selection.id,
            }
          },
        ),

        addToFavorites: this.addToFavorites,
      }
    },

    publish() {
      if (this.hasPendingChanges) {
        return
      }

      this.showValidation = true

      if (!this.isValid) {
        const firstInvalidCategory =
          this.competencyCategories.find((category) => {
            return (
              category.required &&
              !this.hasCategorySelection(category.id)
            )
          })

        if (firstInvalidCategory) {
          this.openCategory(firstInvalidCategory.id)
        }

        return
      }

      this.$emit(
        'publish',
        this.buildPayload(),
      )
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

.selected-tags-section {
  margin-bottom: 16px;
}

.section-label {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 600;
}

.tag-outline-icon {
  font-size: 14px;
}

.selected-tags-box {
  display: flex;
  min-height: 47px;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
  padding: 10px 12px;
  background: #f6f8fc;
  border-radius: 8px;
}

.selected-tag {
  --category-color: #6c7c97;

  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 100%;
  padding: 5px 8px;
  color: #465064;
  background: #ffffff;
  border: 1px solid #edf0f5;
  border-radius: 6px;
  box-shadow: 0 1px 2px rgba(24, 35, 58, 0.04);
  cursor: pointer;
  font-size: 11px;
  white-space: nowrap;
}

.selected-tag:hover:not(:disabled) {
  border-color: #cfd7e5;
}

.selected-tag:disabled {
  cursor: wait;
  opacity: 0.7;
}

.tag-dot {
  width: 6px;
  height: 6px;
  flex: 0 0 auto;
  background: var(--category-color);
  border-radius: 50%;
}

.tag-remove {
  color: #8792a5;
  font-size: 14px;
  line-height: 1;
}

.small-spinner {
  width: 12px;
  height: 12px;
  flex: 0 0 auto;
  border: 2px solid #d5deeb;
  border-top-color: #3979ef;
  border-radius: 50%;
  animation: working-spin 650ms linear infinite;
}

.empty-selection {
  color: #8a94a6;
  font-size: 12px;
}

.categories {
  display: grid;
  gap: 10px;
}

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

.button--cancel {
  color: #e34d55;
  background: #ffffff;
  border: 1px solid #f0b9bd;
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