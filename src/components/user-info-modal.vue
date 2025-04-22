<script setup>
  const emit = defineEmits(['close'])
</script>

<template>
  <v-dialog
    max-width="500"
    @afterLeave="emit('close')"
  >
    <v-card>
      <v-card-title>
        <span class="text-h6">User Info</span>
      </v-card-title>

      <v-card-text>
        <v-text-field
          v-model="form.name"
          label="Name"
          :rules="[]"
          required
        />
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn text @click="dialog = false">Cancel</v-btn>
        <v-btn color="primary" @click="submitForm">Submit</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>