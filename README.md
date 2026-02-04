# PILA Developer Guide

## Creating Importable and Assignable Content

Content created from any site may be imported into the PILA application.
Here is an example of the expected format for any content:

```js
{
  name: 'Display Name', // will be displayed on the card in the explore page
  picture: 'https://example.com/exaple_image_path', // will be displayed on the card in the explore page
  reference: {
    player: 'example.com', // The URL that will play this content.
                           // When embedded, the page example.com/THIS_CONTENT_UUID will be loaded
    dashboard: 'example.com/example_dashboard_path'  // The URL used to show a dashboard for teacher assignments for this content
                                        // When the URL is loaded as a dashboard, the dashboard can access relevant
                                        // information for the assignment as shown below
  }
}
```

## Implementing Dashboards

Once you have created some content with ```reference.dashboard``` set, you can
implement your dashboard using some useful facilities provided by the PILA application.

### Dashboard Environment Variables

On your dashboard page, you can request important environment variables to discover data about teacher assignments for content:

```js
  const {
    variables: {
      assignment, // the id of the teachers assignment
      users // array containing all ids of students assigned
    }
  } = await Agent.environment()
```

### Decrypted Student Information

The dashboard page is given special access to decrypted student names in order to display
information to teachers.

> **Important:** Do not save decrypted students name in any data source. That information is privileged and protected in the PILA system.

```js
const { auth: { info: { name } } } = await Agent.environment(STUDENT_ID) // STUDENT_IDs are provided by environment variables as seen above
```

### Watching Real Time Student State

#### Choose a Runstate Naming Convention

Within your running content, the first thing to do is to choose a naming convetion for what state to store
your content's "runstate" data in. A good approach is the following:

```js
// on application initialization, request a state to use for the runstate of your content
const runstate_name = 'runstate-' + CONTENT_ID
const runstate = await Agent.state(runstate_name)
```

#### Watch the Runstates

Your dashboard application can now watch runstates for any students assigned:

```js
const runstate_name = 'runstate-' + CONTENT_ID

Agent.watch(runstate_name, updateHandler, STUDENT_ID)

function updateHandler({ state, patch }) {
  // state: current state of the watched runstate and
  // patch: the JSONPatch that was applied to make the update
  console.log(
    'THE NEW STATE IS',
    state,
    'AFTER APPLYING',
    patch,
    'TO THE PREVIOUS STATE'
  )
}
```
