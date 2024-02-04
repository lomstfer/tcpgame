import { encode } from "@msgpack/msgpack"
import { decode } from "@msgpack/msgpack"
import { prependUint8 } from "../shared/utils.js"

// maximum of 256 messageids
export enum MessageId {
    serverConnectionAck,
    clientTimeRequest,
    serverTimeAnswer,
    serverPing,
    clientPong,
    clientEnterMatchFinder,
    serverFoundMatch,
    serverOpponentDisconnected,
    clientMatchSpawnUnit,
    serverSpawnUnitSelf,
    serverSpawnUnitOther,
    clientMatchMoveUnits,
    serverUnitsUpdate,
    serverKillUnit,
    clientGameStateRequest,
    serverGameStateResponse
}

export function getByteFromMessage(messageID: MessageId): Uint8Array {
    let bytes = new Uint8Array([messageID])
    return bytes
}

export function getBytesFromMessageAndObj(messageID: MessageId, object: any): Uint8Array {
    let encoded: Uint8Array = encode(object);
    let messagePrepended = prependUint8(messageID, encoded)
    return messagePrepended
}

export function getMessageIdFromBytes(bytes: Uint8Array): MessageId {
    return bytes[0]
}

export function getObjectFromBytes<Type>(bytes: Uint8Array): Type {
    // skip messageId byte
    let messageArray = bytes.slice(1, bytes.length)

    let object = decode(messageArray) as Type
    return object
}