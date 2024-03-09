export default function adminContentManagementTests(store) {
  describe('Perform admin content management', function () {
    const testContentId = Agent.uuid()

    const activeRemoteExpertContent = async agent => (await agent.query('pila_tags')).filter(t => !t.archived).filter(t => t.tag_type === 'expert').map(t => t.content_id)
    const activeStoreTags = () => store.getters['pila_tags/withTag']('expert')

    it('Can make content expert recommended', async function () {
      await store.dispatch('pila_tags/tag', { tag_type: 'expert', content_id: testContentId })

      expect(await activeRemoteExpertContent(Agent)).to.include(testContentId)
      expect(activeStoreTags()).to.include(testContentId)
    })

    it('To surface admin created expert content to student users', async function () {
      expect(await activeRemoteExpertContent(TeacherAgent)).to.include(testContentId)
    })

    it('Can remove content from expert recommendations', async function () {
      await store.dispatch('pila_tags/untag', { tag_type: 'expert', content_id: testContentId })

      expect(await activeRemoteExpertContent(Agent)).to.not.include(testContentId)
      expect(activeStoreTags()).to.not.include(testContentId)
    })

    it('To not surface admin removed expert content to student users', async function () {
      expect(await activeRemoteExpertContent(TeacherAgent)).to.not.include(testContentId)
    })
  })
}