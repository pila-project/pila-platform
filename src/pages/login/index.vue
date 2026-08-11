<template>
  <div class="login-shell">
    <!-- Left illustration (desktop) — Figma hero node family 1:13050 -->
    <aside class="login-hero" aria-hidden="true">
      <div class="login-hero-card">
        <img class="login-hero-img" src="/login/hero.png" alt="">
      </div>
    </aside>

    <!-- Right panel -->
    <main class="login-panel">
      <div
        class="login-panel-inner"
        :class="{ 'login-panel-inner--compact': view === 'code' || view === 'scanner' }"
      >
        <button
          v-if="view !== 'hub'"
          type="button"
          class="login-back"
          @click="view = 'hub'"
        >
          <LucideIcon name="arrow-left" :size="16" />
          {{ t('back') }}
        </button>

        <div class="login-brand">
          <img src="/login/logo-figma.png" alt="OECD PILA" class="login-logo">
        </div>

        <h1 class="login-title">{{ t('welcome-back') }}</h1>
        <p class="login-subtitle">{{ t('sign-in-to-access-your-account') }}</p>

        <div v-if="view === 'hub'" class="login-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            class="login-tab"
            :class="{ 'login-tab-active': role === 'student' }"
            :aria-selected="role === 'student'"
            @click="role = 'student'"
          >
            {{ t('student-login') }}
          </button>
          <button
            type="button"
            role="tab"
            class="login-tab"
            :class="{ 'login-tab-active': role === 'teacher' }"
            :aria-selected="role === 'teacher'"
            @click="role = 'teacher'"
          >
            {{ t('teacher-login') }}
          </button>
        </div>

        <div v-if="view === 'hub'" class="login-methods">
          <template v-if="role === 'teacher'">
            <button
              v-for="p in teacherProviders"
              :key="p.id"
              type="button"
              class="login-method-btn"
              :disabled="signingIn"
              @click="loginSso(p)"
            >
              <img class="login-method-icon" :src="p.icon" alt="">
              <span>{{ signInWithLabel(p) }}</span>
            </button>

            <template v-if="showTeacherCodeMethods">
              <div class="login-or">
                <span class="login-or-line" />
                <span class="login-or-text">{{ t('or') }}</span>
                <span class="login-or-line" />
              </div>
              <button
                type="button"
                class="login-method-btn"
                :disabled="signingIn"
                @click="view = 'scanner'"
              >
                <img class="login-method-icon" src="/login/icons/iconixto_solid_qr-code.png" alt="">
                <span>{{ t('start-scanner') }}</span>
              </button>
              <button
                type="button"
                class="login-method-btn"
                :disabled="signingIn"
                @click="openCodePad"
              >
                <img class="login-method-icon" src="/login/icons/password.png" alt="">
                <span>{{ t('sign-in-with-code') }}</span>
              </button>
            </template>
          </template>

          <template v-else>
            <button
              type="button"
              class="login-method-btn"
              :disabled="signingIn"
              @click="view = 'scanner'"
            >
              <img class="login-method-icon" src="/login/icons/iconixto_solid_qr-code.png" alt="">
              <span>{{ t('start-scanner') }}</span>
            </button>
            <button
              type="button"
              class="login-method-btn"
              :disabled="signingIn"
              @click="openCodePad"
            >
              <img class="login-method-icon" src="/login/icons/password.png" alt="">
              <span>{{ t('sign-in-with-code') }}</span>
            </button>
          </template>
        </div>

        <LoginCodePad
          v-else-if="view === 'code'"
          v-model="codeValue"
          :signing-in="signingIn"
          @submit="loginWithCode"
        />

        <LoginQrScanner
          v-else-if="view === 'scanner'"
          :signing-in="signingIn"
          @back="view = 'hub'"
          @detected="onQrDetected"
        />

        <p v-if="error" class="login-error" role="alert">{{ error }}</p>

        <!-- Directly under method buttons (no min-height spacer on methods) -->
        <p v-if="view === 'hub'" class="login-footer">
          <span>{{ t('dont-have-an-account') }}</span>
          <a class="login-footer-link" href="mailto:edu.pila@oecd.org">{{ t('contact-your-administrator') }}</a>
        </p>
      </div>
    </main>
  </div>
</template>

<script>
import LucideIcon from '@/components/ui/LucideIcon.vue'
import LoginCodePad from './login-code-pad.vue'
import LoginQrScanner from './login-qr-scanner.vue'
import {
  teacherSsoProvidersForHost,
  teacherCodeLoginEnabled,
  SSO_PROVIDER_META,
} from '@/utils/constants.js'
import {
  normalizeLoginCodeInput,
  isCompleteLoginCode,
} from '@/utils/login-code-symbols.js'

export default {
  name: 'LoginMenu',
  components: { LucideIcon, LoginCodePad, LoginQrScanner },
  data() {
    const path = typeof window !== 'undefined' ? window.location.pathname : '/'
    return {
      role: path.startsWith('/teacher') ? 'teacher' : 'student',
      view: 'hub',
      codeValue: '',
      signingIn: false,
      error: null,
    }
  },
  computed: {
    host() {
      return typeof window !== 'undefined' ? window.location.host : ''
    },
    teacherProviders() {
      return teacherSsoProvidersForHost(this.host)
        .map((id) => {
          const meta = SSO_PROVIDER_META[id]
          if (!meta) return null
          return { id, ...meta }
        })
        .filter(Boolean)
    },
    showTeacherCodeMethods() {
      return teacherCodeLoginEnabled(this.host)
    },
  },
  methods: {
    t(slug) {
      return this.$store.getters.t(slug)
    },
    signInWithLabel(provider) {
      return this.t(`sign-in-with-${provider.id}`)
    },
    rememberLoginIntent() {
      try {
        sessionStorage.setItem('pila-login-intent', this.role)
      } catch { /* private mode */ }
    },
    openCodePad() {
      this.codeValue = ''
      this.error = null
      this.view = 'code'
    },
    async loginSso(provider) {
      this.error = null
      this.signingIn = true
      this.rememberLoginIntent()
      this.$emit('signingIn')
      try {
        await Agent.login(provider.agentProvider)
      } catch (e) {
        console.error('[login] SSO error', e)
        this.error = this.t('something-went-wrong')
        this.signingIn = false
      }
    },
    async loginWithCode() {
      const code = normalizeLoginCodeInput(this.codeValue)
      if (!isCompleteLoginCode(code)) {
        this.error = this.t('invalid-login-code')
        return
      }
      this.error = null
      this.signingIn = true
      this.rememberLoginIntent()
      this.$emit('signingIn')
      try {
        await Agent.login('code', code)
      } catch (e) {
        console.error('[login] code error', e)
        this.error = this.t('invalid-login-code')
        this.signingIn = false
      }
    },
    onQrDetected(code) {
      this.codeValue = code
      this.loginWithCode()
    },
  },
}
</script>

<style scoped>
/*
  Figma tokens (1:13049 desktop hub, 1:14583 mobile hub).
  Asserted by scripts/check-login-figma-tokens.mjs
*/
.login-shell {
  --login-shell-bg: #ffffff;
  --login-title-size: 30px;
  --login-title-size-mobile: 24px;
  --login-title-color: #020617;
  --login-title-weight: 600;
  --login-title-letter-spacing: -0.75px;
  --login-title-letter-spacing-mobile: -0.6px;
  --login-title-line-height: 30px;
  --login-title-line-height-mobile: 24px;
  --login-subtitle-size: 16px;
  --login-subtitle-color: #334155;
  --login-stack-gap: 24px;
  --login-method-height: 52px;
  --login-method-radius: 8px;
  --login-method-border: 1px solid #e2e8f0;
  --login-method-bg: #ffffff;
  --login-method-icon: 24px;
  --login-method-gap: 12px;
  --login-tabs-bg: #f4f4f5;
  --login-tabs-radius: 6px;
  --login-tabs-height: 50px;
  --login-tab-height: 42px;
  /* Match track radius so selected pill sits flush with the bar */
  --login-tab-radius: 6px;
  --login-tab-active-bg: #2563eb;
  --login-tab-active-color: #f8fafc;
  --login-tab-color: #020617;
  --login-or-size: 14px;
  --login-or-color: #334155;
  --login-footer-size: 14px;
  --login-footer-color: #020617;
  --login-footer-link-color: #2563eb;
  --login-back-color: #2563eb;
  --login-panel-max: 423px;
  --login-hero-radius: 24px;
  /*
    Fairly central on the right half, but FIXED (not content-height-centered).
    Uses half-viewport minus ~half of a tall hub block so tabs don’t jump when
    method rows change; min keeps mobile/short viewports comfortable.
  */
  --login-panel-pad-top: max(72px, calc(50vh - 300px));

  display: flex;
  min-height: 100vh;
  min-height: calc(var(--vh, 1vh) * 100);
  width: 100%;
  background: var(--login-shell-bg);
}

.login-hero {
  flex: 1 1 50%;
  max-width: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 36px;
  box-sizing: border-box;
  background: var(--login-shell-bg);
}

.login-hero-card {
  width: 100%;
  height: 100%;
  max-width: 663px;
  max-height: 843px;
  /* No grey plate — illustration sits on white and fades toward the top */
  border-radius: var(--login-hero-radius);
  overflow: hidden;
  background: transparent;
}

.login-hero-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  /* Soft fade as the graphic goes up (Figma treatment) */
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(0, 0, 0, 0.35) 8%,
    #000 22%,
    #000 100%
  );
  mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(0, 0, 0, 0.35) 8%,
    #000 22%,
    #000 100%
  );
}

.login-panel {
  flex: 1 1 50%;
  display: flex;
  /* Top-align + fixed pad-top: looks centered, grows downward only */
  align-items: flex-start;
  justify-content: center;
  padding: var(--login-panel-pad-top) 24px 48px;
  box-sizing: border-box;
  background: var(--login-shell-bg);
  overflow-y: auto;
}

.login-panel-inner {
  width: 100%;
  max-width: var(--login-panel-max);
  display: flex;
  flex-direction: column;
  gap: var(--login-stack-gap);
}

/* Code / scanner: less top chrome + fill panel height so keypad fits without scroll */
.login-panel:has(.login-panel-inner--compact) {
  /* Free vertical space for the pad; hub keeps the larger centered pad-top */
  --login-panel-pad-top: max(28px, calc(8vh - 12px));
  padding-bottom: 20px;
  /* Stretch inner to panel height so the pad can flex into leftover space */
  align-items: stretch;
  overflow-y: hidden;
}

.login-panel-inner--compact {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  max-width: var(--login-panel-max);
  margin-inline: auto;
  gap: 10px;
}

.login-panel-inner--compact .login-brand .login-logo {
  height: 36px;
}

.login-panel-inner--compact .login-title {
  font-size: 20px;
  line-height: 24px;
  letter-spacing: -0.5px;
}

.login-panel-inner--compact .login-subtitle {
  margin-top: 0;
  font-size: 13px;
  line-height: 1.35;
}

.login-panel-inner--compact .login-back {
  margin-bottom: 0;
}

@media (max-height: 640px) {
  .login-panel:has(.login-panel-inner--compact) {
    --login-panel-pad-top: 16px;
    padding-bottom: 12px;
  }

  .login-panel-inner--compact {
    gap: 8px;
  }

  .login-panel-inner--compact .login-brand .login-logo {
    height: 32px;
  }

  .login-panel-inner--compact .login-title {
    font-size: 18px;
    line-height: 22px;
  }

  .login-panel-inner--compact .login-subtitle {
    font-size: 12px;
  }
}

.login-back {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  background: transparent;
  color: var(--login-back-color);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  padding: 0;
  margin-bottom: calc(-1 * (var(--login-stack-gap) - 12px));
}

.login-brand {
  display: flex;
  align-items: center;
}

/* Figma Logo frame ~138×69; height 48 matches in-panel scale used in design */
.login-logo {
  height: 48px;
  width: auto;
  max-width: 180px;
  object-fit: contain;
}

.login-title {
  margin: 0;
  font-size: var(--login-title-size);
  font-weight: var(--login-title-weight);
  /* Figma Geist: lineHeightPx 30 @ 30px, letterSpacing -0.75 */
  line-height: var(--login-title-line-height);
  color: var(--login-title-color);
  letter-spacing: var(--login-title-letter-spacing);
}

.login-subtitle {
  margin: calc(-1 * (var(--login-stack-gap) - 8px)) 0 0;
  font-size: var(--login-subtitle-size);
  line-height: 1.5;
  color: var(--login-subtitle-color);
}

.login-tabs {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: var(--login-tabs-bg);
  border-radius: var(--login-tabs-radius);
  width: 100%;
  box-sizing: border-box;
  min-height: var(--login-tabs-height);
  align-items: center;
}

.login-tab {
  flex: 1;
  height: var(--login-tab-height);
  border: none;
  border-radius: var(--login-tab-radius);
  background: transparent;
  color: var(--login-tab-color);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 150ms, color 150ms;
}

.login-tab-active {
  background: var(--login-tab-active-bg);
  color: var(--login-tab-active-color);
}

.login-methods {
  display: flex;
  flex-direction: column;
  gap: var(--login-method-gap);
  width: 100%;
  box-sizing: border-box;
}

.login-method-btn {
  /* Figma LEFT Aligned-EN: SPACE_BETWEEN — icon fixed left, label centered in remainder */
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  height: var(--login-method-height);
  padding: 0 24px;
  box-sizing: border-box;
  border: var(--login-method-border);
  border-radius: var(--login-method-radius);
  background: var(--login-method-bg);
  color: var(--login-title-color);
  font-size: 16px;
  font-weight: 500;
  text-align: center;
  cursor: pointer;
  transition: background 150ms, border-color 150ms;
}

.login-method-btn > span {
  flex: 1;
  text-align: center;
  min-width: 0;
}

.login-method-btn:hover:not(:disabled) {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.login-method-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.login-method-icon {
  width: var(--login-method-icon);
  height: var(--login-method-icon);
  object-fit: contain;
  flex-shrink: 0;
}

.login-or {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  margin: 0;
}

.login-or-line {
  flex: 1;
  height: 1px;
  background: #e2e8f0;
}

.login-or-text {
  font-size: var(--login-or-size);
  color: var(--login-or-color);
}

.login-error {
  margin: 0;
  padding: 10px 12px;
  border-radius: 8px;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 13px;
}

.login-footer {
  /* Under last method button — slightly more than tight, not a full stack gap */
  margin: calc(-1 * (var(--login-stack-gap) - 20px)) 0 0;
  font-size: var(--login-footer-size);
  color: var(--login-footer-color);
  text-align: center;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
}

.login-footer-link {
  color: var(--login-footer-link-color);
  text-decoration: none;
  font-weight: 500;
}

.login-footer-link:hover {
  text-decoration: underline;
}

/* Mobile: Figma 1:14583 — form only, ~395 width, title 24px */
@media (max-width: 900px) {
  .login-shell {
    flex-direction: column;
  }

  .login-hero {
    display: none;
  }

  .login-panel {
    flex: 1 1 auto;
    max-width: none;
    /* Mobile: light top inset, still not true center so tabs stay fixed */
    --login-panel-pad-top: max(24px, calc(12vh - 20px));
    padding: var(--login-panel-pad-top) 14px 40px;
    align-items: flex-start;
  }

  .login-panel-inner {
    max-width: 100%;
  }

  .login-panel-inner--compact {
    max-width: 100%;
  }

  .login-title {
    font-size: var(--login-title-size-mobile);
    letter-spacing: var(--login-title-letter-spacing-mobile);
    line-height: var(--login-title-line-height-mobile);
  }
}
</style>
