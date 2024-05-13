import { validate as isUUID } from 'uuid'

export default async function getImageFromContent(content) {
    if (content.includes('bettysbrain')) {
        return '/betty.png'
    }
    else if (content.includes('karel')) {
        return '/karelSide'
    }
    else if (isUUID(content)) {
        // attempt get image ref from state
        const { image, id: innerContentId } = await Agent.state(content)
        if (image) {
            return isUUID(image) ? (await Agent.download(image).url()) : image
        } else if (innerContentId?.includes('betty')) { // for some reason betty stuff has "url" as ids nested
            return 'betty.png'
        }

        // attempt get image ref from type
        const { active_type } = await Agent.metadata(content)
        if (active_type?.startsWith('application/json;type=sequence')) {
            return '/pila_sequence.png'
        }
        else if (active_type?.startsWith('application/json;type=karel-map')) {
            return '/karelSide.png'
        }
    }
    return '/logo-green.svg'
}