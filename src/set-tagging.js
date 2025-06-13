export default async function setTagging({ tag, target, value }, partition) {
  const myTags  = await Agent.state('tags')
  if (!myTags[tag]) myTags[tag] = {}
  myTags[tag][target] = { value, partition }
  await Agent.synced()
}