<script setup>
  import { encodeBase64 } from 'tweetnacl-util'
  import { generateKeyPair } from './encryption.js'
  import createUser from './create-user.js'
  import UserInfoModal from './components/user-info-modal.vue'

  // const { auth: { user } } = await Agent.environment()

  // const key = 'whatever'
  // localStorage.setItem(`zkek-${user}`, key)

  // const keys = await Agent.state('user-info-public-keys')
  // keys.public = await generateKeyPair(key).then(k => encodeBase64(k.publicKey))

  // const id = await createUser()

  // console.log('created user', id)
</script>

<template>
  <div>
    <UserInfoModal :id="id" />
  </div>
</template>
