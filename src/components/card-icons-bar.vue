<template>
  <div class="card-icons-bar">
    

    <PilaExpertSvg v-if="isAdmin || isExpertTask"
      id="pila-logo"
      :selected="isExpertTask"
      :clickable="isAdmin"
      @click="toggleExpertStatus"
    />
    <div v-else></div> <!-- placeholder -->

    <div class="icons">
      <div class="icon-wrapper" v-if="showPreview" @click="preview">
        <svg fill="grey" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
        </svg>
      </div>
      <div class="icon-wrapper" v-if="showEdit" @click="edit">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="grey">
          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
        </svg>
      </div>

      <!-- UNUSED "FAVORITE" BUTTONS
      <div class="icon-wrapper" @click="toggleFavorite">
        <svg v-if="favorite" fill="red" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
        <svg v-else fill="grey" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z"/>
        </svg>
      </div>
      -->
    </div>
  </div>
</template>

<script>
import PilaExpertSvg from './pila-expert-svg.vue'
export default {
	name: 'card-icons-bar',
  components: { PilaExpertSvg },
	props: {
    id: {
      type: String,
      required: true,
    },
    showPreview: {
      type: Boolean,
      required: false,
      default: true
    },
    showEdit: {
      type: Boolean,
      required: false,
      default: true
    }
	},
  computed: {
    isExpertTask() {
      return this.$store.getters['pila_tags/hasTag'](this.id, 'expert')
    },
    isAdmin() {
      const user = this.$store.getters.user()
      const role = this.$store.getters['roles/role'](user)
      return role === 'admin'
    }
  },
  methods: {
    toggleExpertStatus() {
      const tag = {
        content_id : this.id,
        tag_type: 'expert'
      }
      if (this.isExpertTask) this.$store.dispatch('pila_tags/untag', tag)
      else this.$store.dispatch('pila_tags/tag', tag)
    }
  }
}
</script>


<style scoped>
.card-icons-bar {
  display: flex;
  justify-content: space-between;
}
#pila-logo {
  height: 20px;
  padding: 5px;
  margin: 2px 4px;
}
.icons {
  display: flex;
  justify-content: flex-end;
  align-items: flex-end;
}
.icon-wrapper,
.inactive-icon-wrapper
{
  width: 28px;
  height: 28px;
  margin: 2px;
  border-radius: 20px;
  border: 1px solid lightgrey;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
}
.inactive-icon-wrapper {
  border: none;
  cursor: auto;
}
.icon-wrapper:hover {
  background: #ffdada;
}

.icon-wrapper > svg {
  width: 75%;
  height: 75%;
}
</style>