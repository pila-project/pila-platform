<template>
  <div v-if="loading">
    ...
  </div>
  <div v-else-if="selectingContent">
    <v-btn
      prepend-icon="fa-solid fa-bolt"
      style="
        z-index: 1;
        position: fixed;
        bottom: 32px;
        right: 32px;
      "
      color="rgb(255, 196, 66)"
      size="x-large"
      :text="t('select')"
      @click="selectingContent = false"
      background="#FFC442"
    />
    <ContentLibrary
      selectable
      :selected="assignment.content"
      @select="selectContent"
    />
    <div style="height: 96px" />
  </div>
  <div style="margin: 16px;" v-else>
    <div>
      <h4>{{ t('give-your-assignment-a-name') }}</h4>
      <input
        v-model="assignment.name"
        class="rounded-grey"
      />
      <h4>{{ t('give-your-assignment-a-description') }}</h4>
      <textarea
        v-model="assignment.description"
        class="rounded-grey"
      />
    </div>
    <div style="display: flex; justify-content: center;">
      <div style="display: flex; flex-direction: column; align-items: center; margin-right: 64px;">
        <div style="margin: 8px;">
          <h4>{{ t('select-the-content-to-assign') }}*</h4>
        </div>
        <NameOrTranslatedNameFromItemId
          v-if="assignment.content"
          :itemId="assignment.content"
        />
        <IconButton
          icon="bolt"
          :text="t('select-new')"
          @click="selectingContent = true"
          background="#FFC442"
        />
      </div>
      <div style="margin: 8px;">
        <h4>{{ t('select-classes-for-the-assignment') }}*</h4>
        <GroupAssigner
          :id="id"
          :groups="$store.getters['groups/groups']('class', true)"
          assignment_type="teacher-to-student"
        />
      </div>
    </div>
  </div>
</template>

<script>
  import { assignmentXapiStatement } from '../../assignment-xapi.js'
  import GroupAssigner from '../../components/groups/assigner.vue'
  import ContentLibrary from '../../components/content-library.vue'
  import IconButton from '../../components/icon-button.vue'
  import NameOrTranslatedNameFromItemId from '../../components/name-or-translated-name-from-item-id.vue'

  export default {
    props: {
      id: String
    },
    components: {
      IconButton,
      GroupAssigner,
      ContentLibrary,
      NameOrTranslatedNameFromItemId
    },
    emits: ['setCloseButton'],
    data() {
      return {
        loading: true,
        assignment: null,
        user: null,
        selectingContent: false
      }
    },
    async created() {
      const [assignment, { auth: { user } }] = await Promise.all([
        Agent.state(this.id),
        Agent.environment()
      ])
      this.assignment = assignment
      this.user = user
      this.loading = false
    },
    computed: {
      assignedClassIds() {
        return this.$store.getters['assignments/assignedGroups'](
          this.id,
          'teacher-to-student',
          false
        )
      }
    },
    watch: {
      selectingContent(selecting) {
        this.$emit('setCloseButton', !selecting)
      }
    },
    methods: {
      t(slug) { return this.$store.getters.t(slug) },
      async selectContent(content) {
        if (content === this.assignment.content) return
        this.assignment.content = content

        const statement = assignmentXapiStatement(
          this.user,
          content,
          this.assignedClassIds
        )
        if (!statement) return

        this.assignment.xapi = statement
        try {
          await Agent.synced()
        }
        catch (error) {
          console.warn(`Unable to write assignment xAPI for ${this.id}.`, error)
        }
      }
    }
  }

</script>

<style scoped>
textarea,
input {
  width: 50%;
  margin: 2px 0 6px 0;
}

textarea {
  height: 44px;
}

</style>
