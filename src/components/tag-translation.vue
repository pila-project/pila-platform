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
        "35f68410-0d69-11ef-913a-ff0b6c1d82ea": {
            th: "ภาษาศาสตร์"
        },
        "532ed500-0d69-11ef-86c5-390aa37e3e5c": {
            th: "การเขียน"
        },
        "4ef941a0-0d69-11ef-86c5-390aa37e3e5c": {
            th: "กำลังพูด"
        },
        "516845d0-0d69-11ef-86c5-390aa37e3e5c": {
            th: "การอ่าน"
        },
        "4cda3230-0d69-11ef-86c5-390aa37e3e5c": {
            th: "การฟัง"
        },
        "f3ce7cb0-fbf1-11ee-a2b9-e3d60427f27d": {
            th: "การแก้ปัญหาที่อาศัยการคิดคำนวน"
        },
        "6e844a60-021f-11ef-bc7d-677157795d4f": {
            th: "เงื่อนไข"
        },
        "822d8e00-021f-11ef-bc7d-677157795d4f": {
            th: "การทำซ้ำ"
        },
        "8931d1c0-021f-11ef-bc7d-677157795d4f": {
            th: "การแยกเป็นโมดูล"
        },
        "76803490-021f-11ef-bc7d-677157795d4f": {
            th: "การสร้าง & การทำลาย"
        },
        "ad983590-021f-11ef-bc7d-677157795d4f": {
            th: "การสืบค้นทางวิทยาศาสตร์"
        },
        "19d47df0-063e-11ef-ab28-4700d1aee046": {
            th: "กรอบการประเมินทักษะการรู้คิด"
        },
        "332ef870-063e-11ef-81ec-37fd9b4e8a42": {
            th: "ทดสอบ"
        },
        "34fc6570-063e-11ef-81ec-37fd9b4e8a42": {
            th: "บันทึก"
        },
        "38dde560-063e-11ef-81ec-37fd9b4e8a42": {
            th: "สรุป"
        },
        "297ea780-063e-11ef-81ec-37fd9b4e8a42": {
            th: "ปรับปรุง"
        },
        "2cc03df0-063e-11ef-81ec-37fd9b4e8a42": {
            th: "ออกแบบ"
        },
        "4648ce60-056f-11ef-bf20-630d0d1295cb": {
            th: "ขอบเขตเนื้อหา"
        },
        "5c65f830-056f-11ef-b2b2-59abe0637bf3": {
            th: "สิ่งมีชีวิต"
        },
        "b0926ed0-0d0c-11ef-bdf5-877c72019f04": {
            th: "ลักษณะของโลก"
        },
        "64a246c0-056f-11ef-b2b2-59abe0637bf3": {
            th: "ระบบนิเวศ"
        },
        "6c9caa50-056f-11ef-b2b2-59abe0637bf3": {
            th: "แรงและการเคลื่อนที่"
        },
        "61b64a60-056f-11ef-b2b2-59abe0637bf3": {
            th: "ระบบพืชและสัตว์"
        },
        "6950dab0-056f-11ef-b2b2-59abe0637bf3": {
            th: "พลังงานและการถ่ายเท"
        },
        "5c54c260-06e9-11ef-99aa-eff1c1af8517": {
            th: "รอบชีวิต"
        },
        "b0790e60-021f-11ef-bc7d-677157795d4f": {
            th: "การให้เหตุผลทางคณิตศาสตร์"
        },
        "2f787590-063d-11ef-9fbc-0b6020446730": {
            th: "กรอบการประเมินทักษะการรู้คิด"
        },
        "a9f59370-063d-11ef-b6aa-875af7b6a0ed": {
            th: "คำนวณ"
        },
        "53269070-063e-11ef-81ec-37fd9b4e8a42": {
            th: "บวก"
        },
        "55114970-063e-11ef-81ec-37fd9b4e8a42": {
            th: "ลบ"
        },
        "5a2073f0-063e-11ef-81ec-37fd9b4e8a42": {
            th: "หาร"
        },
        "586de1f0-063e-11ef-81ec-37fd9b4e8a42": {
            th: "คูณ"
        },
        "5d5ade70-063e-11ef-81ec-37fd9b4e8a42": {
            th: "การแปลงหน่วยปริมาตร"
        },
        "5ff2ee70-063e-11ef-81ec-37fd9b4e8a42": {
            th: "การเปรียบเทียบ"
        },
        "f0100d60-056e-11ef-a8eb-014ed1e2a7c1": {
            th: "ขอบเขตเนื้อหา"
        },
        "174855e0-056f-11ef-9026-6bae35368e34": {
            th: "หน่วยการวัด"
        },
        "20d62ab0-056f-11ef-9026-6bae35368e34": {
            th: "พื้นที่, เส้นรอบวง และปริมาตร"
        },
        "0bdebc30-056f-11ef-9026-6bae35368e34": {
            th: "จำนวนเต็ม"
        },
        "0fb84ce0-056f-11ef-9026-6bae35368e34": {
            th: "นิพจน์และสมการ"
        },
        "13e49170-056f-11ef-9026-6bae35368e34": {
            th: "เศษส่วนและเลขทศนิยม"
        }
    }[id]?.[language]
}


</script>