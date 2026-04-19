<template>
    <div class="manage-classes">

        <UserInfoModal
            v-if="userModalUser"
            :id="userModalUser"
            @close="userModalUser = null"
        />
        <Groups
            type="class"
            :possibleMembers="students"
            @createUser="createUserAndLaunchModal"
            @selectUser="id => userModalUser = id"
            :key="userModalUser || 'default' /* to ensure name load on change */"
        />
        <div class="p-6">
            <ShowArchivedToggle v-model="showArchived" />
            <TeacherStudentAgreementModal
              v-if="showAcceptStudentAgreementModal"
              @agreed="createUserAndLaunchModal()"
              @close="() => showAcceptStudentAgreementModal = false"
            />
        </div>
    </div>
</template>

<script setup>
import Groups from '@/components/groups/group-viewer.vue'
import UserInfoModal from '@/components/users/user-info-modal.vue'
import ShowArchivedToggle from '@/components/common/show-archived-toggle.vue'
import TeacherStudentAgreementModal from './teacher-student-agreement-modal.vue'

import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useStore } from 'vuex'
import { createUser } from '@/utils/user-utils.js'

const userModalUser = ref(null)
const users = reactive({})
const showArchived = ref(false)
const showAcceptStudentAgreementModal = ref(false)

let unwatchUsers

onMounted(() => {
    unwatchUsers = Agent.watch('users', ({ state }) => {
        Object
        .entries(state)
        .forEach(([key, value]) => users[key] = value)
    })
})

onBeforeUnmount(() => {
    if (unwatchUsers) unwatchUsers()
})

const store = useStore()
function t(slug) { return store.getters.t(slug) }


const myPILAUsers = computed(() => Object.keys(users))

const students = computed(() => [
    ...myPILAUsers.value.filter(id => showArchived.value || !users[id]?.archived),
    ...store
        .getters['groups/myStudents']()
        .filter(id => !myPILAUsers.value.includes(id))
])

const codeCharacterSet = 'abcdefghijklmnopqrstuvwxy'

function randomString(length, chars) {
    const arr = new Uint8Array(length)
    crypto.getRandomValues(arr)
    return [...arr].map(i => chars[i % chars.length]).join('')
}

async function createUserAndLaunchModal() {
    const { studentDataProtectionAgreement } = await Agent.state()
    if (studentDataProtectionAgreement) {
        const providerSecret = localStorage.getItem(`zkek-${store.state.user}`)
        const userSecret = randomString(8, codeCharacterSet)
        const info = { name: t('student') }
        const id = await createUser(userSecret, providerSecret, info)
        const users = await Agent.state('users')
        users[id] = {}
        userModalUser.value = id
    }
    else showAcceptStudentAgreementModal.value = true
}
</script>
