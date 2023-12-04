<template>
  <div class="card-icons-bar">
    
    <div class="left-side">
      <PilaExpertSvg v-if="isAdmin || isExpertTask"
        id="pila-logo"
        :selected="isExpertTask"
        :clickable="isAdmin"
        @click="toggleExpertStatus"
      />

      <div class="tags-wrapper">
        <div class="tag" v-for="tag in tags">{{ t(tag) }}</div>
      </div>
    </div>

    <div></div> <!-- placeholder if no PILA icon and no tags -->
  
    <div class="icons">
      <div class="icon-wrapper" v-if="showPlay" @click="$emit('play')">
        <i style="color: green;" class="fa fa-play"></i>
      </div>
      <div class="icon-wrapper" v-if="showPreview" @click="$emit('preview')">
        <i style="color: grey;" class="fa fa-eye"></i>
      </div>
      <div class="icon-wrapper" v-if="showRemove && !isExpertTask" @click="$emit('remove')">
        X
      </div>
      <div class="icon-wrapper" v-if="showEdit" @click="$emit('edit')">
        <i style="color: grey;" class="fa fa-pencil"></i>
      </div>

      <div class="icon-wrapper" v-if="showFavorite" @click="$emit('toggleFavorite')">
        <i v-if="isFavorite" style="color: red;" class="fa fa-heart"></i>
        <i v-else style="color: grey;" class="fa fa-heart"></i>
      </div>

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
    tags: {
      type: Array,
      required: false,
      default : () => ([])
    },
    showPlay: {
      type: Boolean,
      required: false,
      default: false
    },
    showPreview: {
      type: Boolean,
      required: false,
      default: false
    },
    showEdit: {
      type: Boolean,
      required: false,
      default: false
    },
    showRemove: {
      type: Boolean,
      required: false,
      default: false
    },
    showFavorite: {
      type: Boolean,
      required: false,
      default: false
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
    },
    isFavorite() {
      return false
    }
  },
  methods: {
    t(slug) { return this.$store.getters.t(slug) },
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
.left-side {
  display: flex;
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
.tags-wrapper {
  display: flex;
  align-items: center;
}
.tag {
  display: inline-block;
  color: white;
  background: #2E31DB;
  border-radius: 1000px;
  font-size: 0.7rem;
  padding: 2px 5px;
  margin: 1px;
}
</style>