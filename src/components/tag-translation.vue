<template>
	<span>{{ displayString }}</span>
</template>

<script setup>
import { useStore } from 'vuex'
const language = useStore().getters.language()

const props = defineProps(['id'])

let displayString
const translation = getTranslation(props.id, language)
if (translation) {
	displayString = translation
} else {
	const { name } = await Agent.state(props.id)
	displayString = name || props.id
}

function getTranslation(id, language) {
	return {
		'ad983590-021f-11ef-bc7d-677157795d4f' : { // Scientific Inquiry
			th: 'การสืบค้นทางวิทยาศาสตร์'
		},
		'19d47df0-063e-11ef-ab28-4700d1aee046' : { // Processes
			th: 'กรอบการประเมินทักษะการรู้คิด'
		},
		'2f787590-063d-11ef-9fbc-0b6020446730' : { // Processes Duplicate Tag
			th: 'กรอบการประเมินทักษะการรู้คิด'
		},
		'f0100d60-056e-11ef-a8eb-014ed1e2a7c1' : { // Content Areas
			th: 'ขอบเขตเนื้อหา'
		},
		'4648ce60-056f-11ef-bf20-630d0d1295cb' : { // Content Areas Duplicate Tag
			th: 'ขอบเขตเนื้อหา'
		},
		'297ea780-063e-11ef-81ec-37fd9b4e8a42' : { // Tinker
			th: 'ปรับปรุง'
		},
		'332ef870-063e-11ef-81ec-37fd9b4e8a42' : { // Controlled Test
			th: 'ทดสอบ'
		},
		'2cc03df0-063e-11ef-81ec-37fd9b4e8a42' : { // Design
			th: 'ออกแบบ'
		},
		'34fc6570-063e-11ef-81ec-37fd9b4e8a42' : { // Record
			th: 'บันทึก'
		},
		'38dde560-063e-11ef-81ec-37fd9b4e8a42' : { // Conclude
			th: 'สรุป'
		},
		'b0790e60-021f-11ef-bc7d-677157795d4f' : { // Math Reasoning
			th: 'การให้เหตุผลทางคณิตศาสตร์'
		},
		'a9f59370-063d-11ef-b6aa-875af7b6a0ed' : { // Compute
			th: 'คำนวณ'
		},
		'53269070-063e-11ef-81ec-37fd9b4e8a42' : { // Addition
			th: 'บวก'
		},
		'55114970-063e-11ef-81ec-37fd9b4e8a42' : { // Subtraction
			th: 'ลบ'
		},
		'586de1f0-063e-11ef-81ec-37fd9b4e8a42' : { // Multiplication
			th: 'คูณ'
		},
		'5a2073f0-063e-11ef-81ec-37fd9b4e8a42' : { // Division
			th: 'หาร'
		},
		'5ff2ee70-063e-11ef-81ec-37fd9b4e8a42' : { // Comparison
			th: 'การเปรียบเทียบ'
		},
		'5d5ade70-063e-11ef-81ec-37fd9b4e8a42' : { // Conversion of Volume
			th: 'การแปลงหน่วยปริมาตร'
		}
	}[id]?.[language]
}


</script>