export default function basicContentManagementTests(store) {
  describe('Students Joining Teachers', function () {

    it('Ensure main agent is admin', async function () {
      const mainAgentRole = store.getters['roles/role'](store.state.user)
      expect(mainAgentRole).to.equal('admin')
    })

    //  TODO: use one of the student user accounts instead of admin
    //        will require creating a completely separate store for a given agent
    it('Ensure student agent can request to join teacher', async function () {
      const { auth: { user: adminUser } } = await Agent.environment()
      await store.dispatch(
        'groups/addMember',
        {
          user_id: adminUser,
          group_id: store.getters['groups/specialGroupId']('my-teachers')
        }
      )
      await store.dispatch('groups/encryptMyUserInfo')
    })

  })
}