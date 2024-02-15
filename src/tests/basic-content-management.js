export default function basicContentManagementTests(store) {
  describe('Perform basic content management', function () {
    const testContentId1 = Agent.uuid()
    const testContentId2 = Agent.uuid()

    const activeRemoteTags = async () => (await Agent.query('pila_tags')).filter(t => !t.archived).map(t => t.content_id)
    const activeStoreTags = () => store.getters['pila_tags/withTag']('tracked')

    it('Can add content to personal library, add appears in remote fetch', async function () {
      await store.dispatch('pila_tags/tag', { tag_type: 'tracked', content_id: testContentId1 })
      expect(await activeRemoteTags()).to.include(testContentId1)
    })

    it('Can add content to personal library, add appears in local fetch', async function () {
      await store.dispatch('pila_tags/tag', { tag_type: 'tracked', content_id: testContentId2 })
      expect(activeStoreTags()).to.include(testContentId2)
    })

    it('Can remove content from personal library, and is removed from remote fetch', async function () {
      await store.dispatch('pila_tags/untag', { tag_type: 'tracked', content_id: testContentId1 })
      expect(await activeRemoteTags()).to.not.include(testContentId1)
    })

    it('Can remove content from personal library, and is removed from local fetch', async function () {
      await store.dispatch('pila_tags/untag', { tag_type: 'tracked', content_id: testContentId2 })
      expect(activeStoreTags()).to.not.include(testContentId2)
    })
  })
}