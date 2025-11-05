import {
  TREATMENT_TAG,
  CONTROL_TAG,
  OPT_OUT_TAG,
  HOST_TO_PARTITION,
  HOST_TO_FORCED_ASSIGNMENT_LANGUAGE
} from './constants.js'

const partition = HOST_TO_PARTITION[window.location.host]

export default async function () {
  const { auth: { user } } = await Agent.environment()

  const [ treatmentTagging, optOutTagging ] = await Promise.all([
    Agent.query('tagging-for-target', [partition, TREATMENT_TAG, user], 'tags.knowlearning.systems'),
    Agent.query('tagging-for-target', [partition, OPT_OUT_TAG, user], 'tags.knowlearning.systems')
  ])

  return async function addVariables(e) {
    const env = await Agent.environment(e)
    if (!env.variables) return env

    const variables = {
      ...env.variables,
      TREATMENT: treatmentTagging.length > 0 && optOutTagging.length === 0
    }
    const forcedLang = HOST_TO_FORCED_ASSIGNMENT_LANGUAGE[window.location.host]
    if (forcedLang) variables.FORCED_LANGUAGE = forcedLang

    return { ...env, variables }
  }
}