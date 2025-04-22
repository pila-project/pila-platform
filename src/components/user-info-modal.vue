<script setup>
  import { ref, reactive } from 'vue'

  const props = defineProps({ id: String })
  const emit = defineEmits(['close'])

  const open = ref(true)
  const userInfo = reactive(await Agent.state(props.id))

  const editUserInfo = reactive(JSON.parse(JSON.stringify(userInfo)))

  function cancel() {
    open.value = false
  }

  function save() {
    Object.assign(userInfo, editUserInfo)
    open.value = false
  }
</script>

<template>
  <v-dialog
    v-model="open"
    max-width="500"
    @afterLeave="emit('close')"
  >
    <v-card>
      <v-card-title>
        <span class="text-h6">User Info</span>
      </v-card-title>

      <v-card-text>
        <v-text-field
          v-model="editUserInfo.name"
          label="Name"
          required
        />
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" @click="cancel">Cancel</v-btn>
        <v-btn color="primary" @click="save">Save</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>