<template>
	<div class="create-edit-class-modal">
		<h3>Give your class a name</h3>
		<input
			v-if="classData"
			class="working-class-name"
			v-model="classData.name"
		/>
		<input v-else class="working-class-name" disabled />

		<h3>Select students in the class</h3>
		<div class="filters">
			<IconButton class="filter-button"
				@click="filter = 'all'"
				text="All Students"
				:background="filter === 'all' ? '#1b1b83' : undefined"
				:textColor="filter === 'all' ? 'white' : '#1b1b83'"
			/>
			<IconButton class="filter-button"
				@click="filter = 'members'"
				text="Members"
				:background="filter === 'members' ? '#1b1b83' : undefined"
				:textColor="filter === 'members' ? 'white' : '#1b1b83'"
			/>
			<IconButton class="filter-button"
				@click="filter = 'non-members'"
				text="Non-Members"
				:background="filter === 'non-members' ? '#1b1b83' : undefined"
				:textColor="filter === 'non-members' ? 'white' : '#1b1b83'"
			/>
		</div>

        <table style="width: 100%;">
          <thead>
            <tr>
              <th style="text-align: center;">In Class</th>
              <th style="text-align: left;">Student Name</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="member in filteredStudentList"
              :key="member"
            >
            	<td style="width: 30px; text-align: center; cursor: pointer;"
            		@click="handleAddRemove(member)"
            	>
            		<input
            			type="checkbox"
            			:checked="userInClass(member)"
            			@change="handleAddRemove($event, member)"
            		/>
            	</td>
             	<td style="text-align: left;"><UserInfo :user="member" name /></td>
            </tr>
            <tr
              v-if="filteredStudentList.length < 6"
              v-for="n in 6 - filteredStudentList.length"
              :key="`blank-row-${n}`"
            >
              <td></td>
              <td style="width: 250px;"></td>
            </tr>
          </tbody>
        </table>


	</div>
</template>

<script>
import IconButton from '../icon-button.vue'
import LinkStudentModal from './LinkStudentModal.vue'
import UserInfo from '../user-info.vue'
import { vueScopeComponent } from '@knowlearning/agents/vue.js'
export default {
	name: 'create-edit-class-modal',
	components: {
		IconButton,
		LinkStudentModal,
		UserInfo,
		vueScopeComponent
	},
	props: {
		possibleMembers: {
			type: Array,
			required: true
		},
		id: {
			type: String,
			required: true
		}
	},
	async created() {
		this.classData = await Agent.state(this.id)
	},
	data() {
		return {
			showLinkStudentModal: false,
			classData: null,
			filter: 'all'
		}
	},
	computed: {
		filteredStudentList() {
			if (this.filter === 'all') {
				return this.possibleMembers
			} else if (this.filter === 'members') {
				return this.possibleMembers.filter(this.userInClass)
			} else if (this.filter === 'non-members') {
				return this.possibleMembers.filter(m => !this.userInClass(m))
			} else {
				console.warn('unhandled filter parameter', this.filter)
			}
		},
	    currentGroupMembers() {
        	return this.$store.getters['groups/members'](this.id)
    	}
    },
    methods: {
    	handleAddRemove(e, user_id) {
    		(e.target.checked) ? this.addMember(user_id) : this.removeMember(user_id)
    	},
    	userInClass(user_id) {
    		return this.currentGroupMembers.includes(user_id)
    	},
     	addMember(user_id) {
    		this.$store.dispatch('groups/addMember', { user_id, group_id: this.id })
    	},
    	removeMember(user_id) {
    		this.$store.dispatch('groups/removeMember', { user_id, group_id: this.id })
    	}
    }
}
</script>

<style scoped>
.create-edit-class-modal {
	padding: 20px 60px;
}
h3 {
	color: #1b1b83;
}
.top-line {
	display: flex;
	width: 400px;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 10px;
}
input.working-class-name {
	width: 500px;
	margin-bottom: 16px;
}
.filter-button {
	border: 1px solid #1b1b83;
}
.filters {
	margin-bottom: 20px;
}
.active {
	background: chartreuse;
}
</style>