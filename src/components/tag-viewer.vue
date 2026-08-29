<template>
  <section class="selected-tags-section">
    <div class="section-label">
      <span class="tag-outline-icon">◇</span>
      {{ t('selected-competencies') }}:
    </div>

    <div class="selected-tags-box">
      <span
        v-if="isLoading"
        class="loading-selection"
        role="status"
      >
        <span
          class="small-spinner"
          aria-hidden="true"
        />

        {{ t('loading-tags') }}
      </span>

      <template v-else-if="displayedCompetencies.length">
        <div
          v-for="selection in displayedCompetencies"
          :key="`${selection.categoryId || 'tag'}-${selection.id}`"
          class="selected-tag"
          :class="{
            'selected-tag--working':
              isCompetencyWorking(selection.id),
          }"
          :style="{
            '--category-color': selection.categoryColor,
          }"
        >
          <span class="tag-dot" />

          <span>
            <template v-if="selection.categoryId">
              <TagTranslation :id="selection.categoryId" />
              =
            </template>

            <TagTranslation :id="selection.id" />
          </span>

          <span
            v-if="isCompetencyWorking(selection.id)"
            class="small-spinner"
            role="status"
            :aria-label="t('working')"
          />

          <button
            v-else-if="enableRemove"
            class="tag-remove"
            type="button"
            :aria-label="t('remove')"
            @click="remove(selection)"
          >
            ×
          </button>
        </div>
      </template>

      <span
        v-else
        class="empty-selection"
      >
        {{ t('no-competencies-selected-yet') }}
      </span>
    </div>

    <p
      v-if="loadError"
      class="update-error"
      role="alert"
    >
      {{ t('unable-to-load-tags') }}
    </p>

    <p
      v-else-if="updateError"
      class="update-error"
      role="alert"
    >
      {{ t('unable-to-update-tag') }}
    </p>
  </section>
</template>

<script>
import TagTranslation from '@/components/tags/tag-translation.vue'

const TAGS_DOMAIN = 'tags.knowlearning.systems'

export default {
  name: 'TagViewer',

  components: {
    TagTranslation,
  },

  emits: [ 'remove' ],

  props: {
    /*
     * When supplied, TagViewer displays this data
     * without performing its own query.
     *
     * null means TagViewer should load the tags.
     */
    selectedCompetencies: {
      type: Array,
      default: null,
    },

    /*
     * Used when selectedCompetencies is not supplied.
     */
    target: {
      type: String,
      default: null,
    },

    /*
     * Used when selectedCompetencies is not supplied.
     *
     * This partition is used both to load the target's
     * tags and to resolve each tag's parent category.
     */
    partition: {
      type: String,
      default: null,
    },

    workingCompetencyIds: {
      type: Object,
      default: () => ({}),
    },

    updateError: {
      type: Boolean,
      default: false,
    },

    enableRemove: {
      type: Boolean,
      default: false,
    },
  },

  data() {
    return {
      loadedCompetencies: [],
      isLoading: false,
      loadError: false,
      loadRequestId: 0,
    }
  },

  computed: {
    displayedCompetencies() {
      return (
        this.selectedCompetencies ??
        this.loadedCompetencies
      )
    },
  },

  watch: {
    target: {
      immediate: true,
      handler: 'loadCompetencies',
    },

    partition: {
      handler: 'loadCompetencies',
    },

    selectedCompetencies(value) {
      if (value !== null) {
        /*
         * Invalidate any self-loading request that may
         * still be in progress.
         */
        this.loadRequestId += 1
        this.isLoading = false
        this.loadError = false
      } else {
        this.loadCompetencies()
      }
    },
  },

  methods: {
    t(slug) {
      return this.$store.getters.t(slug)
    },

    isCompetencyWorking(competencyId) {
      return (
        this.workingCompetencyIds[
          competencyId
        ] === true
      )
    },

    remove(selection) {
      this.$emit(
        'remove',
        selection.categoryId,
        selection.id,
      )
    },

    async loadCompetencies() {
      /*
       * The parent supplied the display data, so there
       * is nothing for TagViewer to load.
       */
      if (this.selectedCompetencies !== null) {
        return
      }

      const requestId =
        ++this.loadRequestId

      this.loadError = false

      if (!this.target || !this.partition) {
        this.loadedCompetencies = []
        this.isLoading = false
        return
      }

      this.isLoading = true

      try {
        /*
         * First, load all tags applied to the target.
         */
        const taggings = await Agent.query(
          'taggings-for-target',
          [
            this.partition,
            this.target,
          ],
          TAGS_DOMAIN,
        )

        if (!Array.isArray(taggings)) {
          throw new TypeError(
            'Expected an array of taggings',
          )
        }

        if (
          taggings.some(
            (tagging) =>
              typeof tagging?.tag !== 'string',
          )
        ) {
          throw new TypeError(
            'Expected every tagging to have a tag',
          )
        }

        const tagIds = [
          ...new Set(
            taggings.map(
              (tagging) => tagging.tag,
            ),
          ),
        ]

        /*
         * Then resolve the parent category of every tag.
         */
        const loadedCompetencies =
          await Promise.all(
            tagIds.map(async (id) => {
              const categoryTaggings =
                await Agent.query(
                  'taggings-for-target',
                  [
                    this.partition,
                    id,
                  ],
                  TAGS_DOMAIN,
                )

              if (
                !Array.isArray(categoryTaggings)
              ) {
                throw new TypeError(
                  'Expected an array of category taggings',
                )
              }

              const categoryTagging =
                categoryTaggings.find(
                  (tagging) =>
                    typeof tagging?.tag === 'string',
                )

              return {
                id,
                categoryId:
                  categoryTagging?.tag,
              }
            }),
          )

        if (
          requestId !== this.loadRequestId
        ) {
          return
        }

        this.loadedCompetencies =
          loadedCompetencies
      } catch (error) {
        if (
          requestId !== this.loadRequestId
        ) {
          return
        }

        this.loadedCompetencies = []
        this.loadError = true

        console.error(
          'Unable to load tags:',
          error,
        )
      } finally {
        if (
          requestId === this.loadRequestId
        ) {
          this.isLoading = false
        }
      }
    },
  },
}
</script>

<style scoped>
* {
  box-sizing: border-box;
}

button {
  font: inherit;
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
  font-size: 11px;
  white-space: nowrap;
}

.selected-tag--working {
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
  padding: 0;
  color: #8792a5;
  background: transparent;
  border: 0;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
}

.tag-remove:hover {
  color: #d9414e;
}

.tag-remove:focus-visible {
  outline: 2px solid #3979ef;
  outline-offset: 2px;
  border-radius: 2px;
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

.loading-selection {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #8a94a6;
  font-size: 12px;
}

.empty-selection {
  color: #8a94a6;
  font-size: 12px;
}

.update-error {
  margin: 8px 0 0;
  color: #d9414e;
  font-size: 11px;
}

@keyframes working-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>