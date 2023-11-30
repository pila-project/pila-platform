<template>
	<div class="create-edit-group-modal">
		<h3>{{ GET_TEXT.RENAME_LABEL }}</h3>
		<input
			v-if="classData"
			class="working-class-name rounded-grey"
			v-model="classData.name"
		/>
		<input
		  v-else
		  class="working-class-name"
		  disabled
		 />

		<h3>{{ GET_TEXT.MODAL_SELECT_TABLE_HEADER }}</h3>
		<div class="filters">
			<IconButton class="filter-button"
				@click="filter = 'all'"
				:text="GET_TEXT.ALL_FILTER_TEXT"
				:background="filter === 'all' ? '#1b1b83' : undefined"
				:textColor="filter === 'all' ? 'white' : '#1b1b83'"
			/>
			<IconButton class="filter-button"
				@click="filter = 'members'"
				:text="t('members')"
				:background="filter === 'members' ? '#1b1b83' : undefined"
				:textColor="filter === 'members' ? 'white' : '#1b1b83'"
			/>
			<IconButton class="filter-button"
				@click="filter = 'non-members'"
				:text="t('non-members')"
				:background="filter === 'non-members' ? '#1b1b83' : undefined"
				:textColor="filter === 'non-members' ? 'white' : '#1b1b83'"
			/>
		</div>

		<div class="add-remove-all-buttons-wrapper">
			<IconButton class="add-all-button"
				@click="addAll"
				:text="t('add-all')"
				icon="plus-circle"
				background="green"
				textColor="white"
			/>
			<IconButton class="remove-all-button"
				@click="removeAll"
				:text="t('remove-all')"
				icon="minus-circle"
				background="lightsalmon"
				textColor="white"
			/>
		</div>

    <table style="width: 100%;">
      <thead>
        <tr>
          <th style="text-align: center;">{{ GET_TEXT.IN_GROUP_TEXT }}</th>
          <th style="text-align: left;">{{ GET_TEXT.MEMBER_NAME_HEADER }}</th>
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
          v-for="n in Math.max(0, 6 - filteredStudentList.length)"
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
export default {
	name: 'create-edit-group-modal',
	components: {
		IconButton,
		LinkStudentModal,
		UserInfo
	},
	props: {
		type: {
			type: String,
			required: true
		},
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
	  GET_TEXT() {
      if (this.type === 'class') {
        return {
          RENAME_LABEL: this.t('give-your-class-a-name'),
          MODAL_SELECT_TABLE_HEADER: this.t('select-students-in-the-class'),
          ALL_FILTER_TEXT: this.t('all-students'),
          IN_GROUP_TEXT: this.t('in-class'),
          MEMBER_NAME_HEADER : this.t('student-name')
        }
      } else if (this.type === 'teachers') {
        return {
          RENAME_LABEL: this.t('give-your-group-a-name'),
          MODAL_SELECT_TABLE_HEADER: this.t('select-teachers-in-the-group'),
          ALL_FILTER_TEXT: this.t('all-teachers'),
          IN_GROUP_TEXT: this.t('in-group'),
          MEMBER_NAME_HEADER : this.t('teacher-name')
        }
      } else {
        return {}
      }
    },
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
    	t(slug) { return this.$store.getters.t(slug) },
    	handleAddRemove(e, user_id) {
    		(e.target.checked) ? this.addMember(user_id) : this.removeMember(user_id)
    	},
    	userInClass(user_id) {
    		return this.currentGroupMembers.includes(user_id)
    	},
    	addAll() {
    		this.possibleMembers.forEach(this.addMember)
    	},
    	removeAll() {
    		this.possibleMembers.forEach(this.removeMember)
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
.create-edit-group-modal {
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
.add-remove-all-buttons-wrapper {
	margin-bottom: 6px;
}
</style>