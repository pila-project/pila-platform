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
        <LucideIcon name="play" :size="14" style="color: green;" />
      </div>
      <div class="icon-wrapper" v-if="showPreview" @click="$emit('preview')">
        <LucideIcon name="eye" :size="14" style="color: grey;" />
      </div>
      <div class="icon-wrapper" v-if="showRemove && !isExpertTask" @click="$emit('remove')">
        <LucideIcon name="x" :size="14" />
      </div>
      <div class="icon-wrapper" v-if="showEdit" @click="$emit('edit')">
        <LucideIcon name="pencil" :size="14" style="color: grey;" />
      </div>

      <div class="icon-wrapper" v-if="showFavorite" @click="$emit('toggleFavorite')">
        <LucideIcon name="heart" :size="14" :style="{ color: isFavorite ? 'red' : 'grey' }" />
      </div>

    </div>
  </div>
</template>

<script>
import PilaExpertSvg from './pila-expert-svg.vue'
import LucideIcon from '@/components/ui/LucideIcon.vue'

export default {
	name: 'card-icons-bar',
  components: { PilaExpertSvg, LucideIcon },
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
  width: 100%;
}

.left-side {
  display: flex;
  overflow: hidden;
  margin-right: 10px;
}
.left-side #pila-logo {
  flex: 0 0 40px;
  height: 20px;
  padding: 5px;
  margin: 2px 4px;
}
.left-side .tags-wrapper {
  flex: 1 0 0;
  line-height: 1.0;
}
.left-side .tags-wrapper .tag {
  display: inline-block;
  color: white;
  background: #2E31DB;
  border-radius: 1000px;
  font-size: 0.6rem;
  padding: 1px 5px;
  margin: 0 1px;

  max-width: 95px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}


.icons {
  flex-grow: 0;
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