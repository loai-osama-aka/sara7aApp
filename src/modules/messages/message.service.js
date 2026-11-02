import { BadRequestException, NotFoundException } from "../../common/index.js"
import { userModel } from "../../database/model/user.model.js"
import { countDocuments, findOneAndDelete, find, findOne } from "../../common/repository/base.repository.js";
import { messageModel } from './../../database/model/message.model.js';
import { removeStoredFiles, uploadedFileUrl } from "../../common/utils/file/storage.js";

export const createMessage = async ({ content, receiverId } = {}, files = [], user = undefined) => {
    const receiverExist = await userModel.findById(receiverId)
    if (!receiverExist) {
        throw BadRequestException({ message: "receiverId not exist" })
    }


    const message = await messageModel.create({
        content,
        receiverId,
        // file.path is OS-specific (backslashes on Windows), so build the url from the filename instead
        attachments: files.map(uploadedFileUrl),
        ...(user ? { senderId: user.sub } : {})
    })



    return message
}

export const getAllMessages = async ({ type, page, limit }, user) => {
    console.log(type, 'type');
    let filter = {}

    if (type == "0") {
        // messages that have been sent to me
        filter = { receiverId: user.sub }
    } else if (type == "1") {
        // messages that i sent
        filter = { senderId: user.sub }

    } else {
        // all messages i sent and received
        filter = {
            $or: [
                { receiverId: user.sub },
                { senderId: user.sub }
            ]
        }
    }

    const skip = (page - 1) * limit
    const count = await countDocuments({ model: messageModel, filter })
    const pages = Math.ceil(count / limit)
    const messages = await find({
        model: messageModel, filter, options: {
            limit,
            skip,
            sort: { createdAt: -1 }
        }
    })


    return { count, limit, pages, currentPage: page, messages }

}

export const deleteMessage = async ({ messageId }, user) => {

    const message = await findOneAndDelete({ model: messageModel, filter: { receiverId: user.sub, _id: messageId } })

    if (!message) {
        throw NotFoundException({ message: 'Invalid messageID' })
    }

    // the message is gone, so its attachments are unreachable, don't leave them on disk
    await removeStoredFiles(message.attachments)

    return message

}
export const getMessage = async ({ messageId }, user) => {

    const data = await findOne({
        model: messageModel, filter: {
            $or: [
                { receiverId: user.sub },
                { senderId: user.sub }
            ], _id: messageId
        }
    })
    console.log(data);

    if (!data) {
        NotFoundException({ message: 'no message found' })
    }
    return data

}