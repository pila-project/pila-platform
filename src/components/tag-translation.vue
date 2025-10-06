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
    const translations = await Agent.query('translate-item', [ props.id, [ language ] ], 'translations.pilaproject.org')

    //  Use any name translation that's not a fallback
    const nameTranslation = translations.find(t => !t.is_fallback && t.path.length === 2 && t.path[1] === 'name')

    if (nameTranslation) displayString = nameTranslation.value
    else {
      const { name } = await Agent.state(props.id)
      displayString = name || props.id
    }
}

function getTranslation(id, language) {
    return {
        "8188b820-15cb-11ef-bc70-79185abca486": {
            th: "เกรดขั้นต่ำ" // Minimum Grade
        },
        "35f68410-0d69-11ef-913a-ff0b6c1d82ea": {
            th: "ภาษาศาสตร์" // Linguistics
        },
        "532ed500-0d69-11ef-86c5-390aa37e3e5c": {
            th: "การเขียน" // Writing
        },
        "4ef941a0-0d69-11ef-86c5-390aa37e3e5c": {
            th: "กำลังพูด" // Speaking
        },
        "516845d0-0d69-11ef-86c5-390aa37e3e5c": {
            th: "การอ่าน" // Reading
        },
        "4cda3230-0d69-11ef-86c5-390aa37e3e5c": {
            th: "การฟัง" // Listening
        },
        "f3ce7cb0-fbf1-11ee-a2b9-e3d60427f27d": {
            th: "การแก้ปัญหาที่อาศัยการคิดคำนวน" // Computational Thinking
        },
        "6e844a60-021f-11ef-bc7d-677157795d4f": {
            th: "เงื่อนไข" // Conditionals
        },
        "822d8e00-021f-11ef-bc7d-677157795d4f": {
            th: "การทำซ้ำ" // Repetition
        },
        "8931d1c0-021f-11ef-bc7d-677157795d4f": {
            th: "การแยกเป็นโมดูล" // Modularity
        },
        "76803490-021f-11ef-bc7d-677157795d4f": {
            th: "การสร้าง & การทำลาย" // Creation & Destruction
        },
        "ad983590-021f-11ef-bc7d-677157795d4f": {
            th: "การสืบค้นทางวิทยาศาสตร์" // Scientific Inquiry
        },
        "19d47df0-063e-11ef-ab28-4700d1aee046": {
            th: "กรอบการประเมินทักษะการรู้คิด" // Processes
        },
        "332ef870-063e-11ef-81ec-37fd9b4e8a42": {
            th: "ทดสอบ" // Controlled Test
        },
        "34fc6570-063e-11ef-81ec-37fd9b4e8a42": {
            th: "บันทึก" // Record
        },
        "38dde560-063e-11ef-81ec-37fd9b4e8a42": {
            th: "สรุป" // Conclude
        },
        "297ea780-063e-11ef-81ec-37fd9b4e8a42": {
            th: "ปรับปรุง" // Tinker
        },
        "2cc03df0-063e-11ef-81ec-37fd9b4e8a42": {
            th: "ออกแบบ" // Design
        },
        "4648ce60-056f-11ef-bf20-630d0d1295cb": {
            th: "ขอบเขตเนื้อหา" // Content Areas
        },
        "5c65f830-056f-11ef-b2b2-59abe0637bf3": {
            th: "สิ่งมีชีวิต" // Organisms
        },
        "b0926ed0-0d0c-11ef-bdf5-877c72019f04": {
            th: "ลักษณะของโลก" // Earth's Characteristics
        },
        "64a246c0-056f-11ef-b2b2-59abe0637bf3": {
            th: "ระบบนิเวศ" // Ecosystems
        },
        "6c9caa50-056f-11ef-b2b2-59abe0637bf3": {
            th: "แรงและการเคลื่อนที่" // Forces & Motion
        },
        "61b64a60-056f-11ef-b2b2-59abe0637bf3": {
            th: "ระบบพืชและสัตว์" // Plant & Animal Systems
        },
        "6950dab0-056f-11ef-b2b2-59abe0637bf3": {
            th: "พลังงานและการถ่ายเท" // Energy & Transfer
        },
        "5c54c260-06e9-11ef-99aa-eff1c1af8517": {
            th: "รอบชีวิต" // Life Cycles
        },
        "b0790e60-021f-11ef-bc7d-677157795d4f": {
            th: "การให้เหตุผลทางคณิตศาสตร์" // Math Reasoning
        },
        "2f787590-063d-11ef-9fbc-0b6020446730": {
            th: "กรอบการประเมินทักษะการรู้คิด" // Processes
        },
        "a9f59370-063d-11ef-b6aa-875af7b6a0ed": {
            th: "คำนวณ" // Compute
        },
        "53269070-063e-11ef-81ec-37fd9b4e8a42": {
            th: "บวก" // Addition
        },
        "55114970-063e-11ef-81ec-37fd9b4e8a42": {
            th: "ลบ" // Subtraction
        },
        "5a2073f0-063e-11ef-81ec-37fd9b4e8a42": {
            th: "หาร" // Division
        },
        "586de1f0-063e-11ef-81ec-37fd9b4e8a42": {
            th: "คูณ" // Multiplication
        },
        "5d5ade70-063e-11ef-81ec-37fd9b4e8a42": {
            th: "การแปลงหน่วยปริมาตร" // Conversion of Volume
        },
        "5ff2ee70-063e-11ef-81ec-37fd9b4e8a42": {
            th: "การเปรียบเทียบ" // Comparison
        },
        "f0100d60-056e-11ef-a8eb-014ed1e2a7c1": {
            th: "ขอบเขตเนื้อหา" // Content Areas
        },
        "174855e0-056f-11ef-9026-6bae35368e34": {
            th: "หน่วยการวัด" // Units of Measurement
        },
        "20d62ab0-056f-11ef-9026-6bae35368e34": {
            th: "พื้นที่, เส้นรอบวง และปริมาตร" // Area, Perimeter & Volume
        },
        "0bdebc30-056f-11ef-9026-6bae35368e34": {
            th: "จำนวนเต็ม" // Whole Numbers
        },
        "0fb84ce0-056f-11ef-9026-6bae35368e34": {
            th: "นิพจน์และสมการ" // Expressions & Equations
        },
        "13e49170-056f-11ef-9026-6bae35368e34": {
            th: "เศษส่วนและเลขทศนิยม" // Fractions & Decimals
        },
        "65d74000-021c-11ef-bc7d-677157795d4f": {
            th: "ระดับความยาก" // Difficulty
        },
        "68d9aa90-021c-11ef-bc7d-677157795d4f": {
            th: "ระดับง่าย" // Easy
        },
        "6a897d70-021c-11ef-bc7d-677157795d4f": {
            th: "ระดับกลาง" // Intermediate
        },
        "6c0cc210-021c-11ef-bc7d-677157795d4f": {
            th: "ระดับยาก" // Difficult
        },
        "1a53db50-e248-11ee-ab5f-07f4a7408770": {
            th: "เนื้อหา PILA" // PILA Content
        }
    }[id]?.[language]
}


</script>