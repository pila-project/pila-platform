<template>
    <button
        class="icon-button"
        :style="{
            background,
            border: `1px solid ${background === 'none' ? '#ccc' : background }`,
            color: textColor,
            margin: '2px',
            'user-select': 'none'
        }"
    >
        <LucideIcon
            v-if="icon"
            :name="icon"
            :size="14"
            :style="{
              'margin-right': text ? undefined : 0
            }"
        />
        <span>{{ text }}</span>
    </button>
</template>

<script>
import LucideIcon from '@/components/ui/LucideIcon.vue'
export default {
    components: { LucideIcon },
    props: {
        text: {
            type: String,
            required: true,
        },
        textColor: {
            type: String,
            required: false,
            default: 'black'
        },
        icon: {
            type: String,
            required: false
        },
        background: {
            type: String,
            required: false,
            default: 'none'
        }
    }
}
</script>

<style scoped>
/* FONT-AWESOME IMPORT IN MAIN STYLES.CSS */
/* BUTTON STYLES ALSO in STYLES.CSS  */
</style>