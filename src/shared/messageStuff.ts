import { encode } from "@msgpack/msgpack"
import { decode } from "@msgpack/msgpack"
import { prependUint8 } from "../shared/utils.js"

// maximum of 256 messageids
export enum MessageID {
    serverConnectionAck,
    clientEnterMatchFinder,
    serverFoundMatch,
    clientTimeRequest,
    serverTimeAnswer,
    serverOpponentDisconnected,
    clientSpawnUnit,
    serverSpawnUnitSelf,
    serverSpawnUnitOther,
}

export function getByteFromMessage(messageID: MessageID): Uint8Array {
    let bytes = new Uint8Array([messageID])
    return bytes
}

export function getBytesFromMessageAndObj(messageID: MessageID, object: any): Uint8Array {
    let encoded: Uint8Array = encode(object);
    let messagePrepended = prependUint8(messageID, encoded)
    return messagePrepended
}

export function getMessageIDFromBytes(bytes: Uint8Array): MessageID {
    return bytes[0]
}

export function getObjectFromBytes<Type>(bytes: Uint8Array): Type {
    // skip messageID byte
    let messageArray = bytes.slice(1, bytes.length)

    let object = decode(messageArray) as Type
    return object
}