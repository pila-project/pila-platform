export default function basicContentTaggingTests(store) {
  describe('Perform basic content management', function () {
    const testContentId = Agent.uuid()
    it('Can add content to personal library', async function () {
      await store.dispatch('pila_tags/tag', { tag_type: 'tracked', content_id: testContentId })
      const myTags = await Agent.query('pila_tags')
      expect(myTags.map(({ content_id }) => content_id))
        .to.include(testContentId)
      expect(store.getters['pila_tags/withTag']('tracked'))
        .to.include(testContentId)
    })
    it('Can remove content from personal library', async function () {
      await store.dispatch('pila_tags/untag', { tag_type: 'tracked', content_id: testContentId })
      const myUpdatedTags = await Agent.query('pila_tags')
      const activeTags = (
        myUpdatedTags
          .filter(({ archived }) => !archived)
          .map(({ content_id }) => content_id)
      )

      expect(activeTags).to.not.include(testContentId)
      expect(store.getters['pila_tags/withTag']('tracked'))
        .to.not.include(testContentId)
    })
  })
}