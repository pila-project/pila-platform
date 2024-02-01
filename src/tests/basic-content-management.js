export default function basicContentManagementTests(store) {
  describe('Perform basic content management', function () {
    const testContentId = Agent.uuid()

    const activeRemoteTags = async () => (await Agent.query('pila_tags')).filter(t => !t.archived).map(t => t.content_id)
    const activeStoreTags = () => store.getters['pila_tags/withTag']('tracked')

    it('Can add content to personal library', async function () {
      await store.dispatch('pila_tags/tag', { tag_type: 'tracked', content_id: testContentId })

      expect(await activeRemoteTags()).to.include(testContentId)
      expect(activeStoreTags()).to.include(testContentId)
    })

    it('Can remove content from personal library', async function () {
      await store.dispatch('pila_tags/untag', { tag_type: 'tracked', content_id: testContentId })

      expect(await activeRemoteTags()).to.not.include(testContentId)
      expect(activeStoreTags()).to.not.include(testContentId)
    })
  })
}