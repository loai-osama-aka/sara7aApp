import { BadRequestException, NotFoundException, StatusEnum } from "../../common/index.js"
import { userModel } from "../../database/model/user.model.js"
import { countDocuments, findOneAndDelete, find, findOne, updateOne, create } from "../../common/repository/base.repository.js";
import { messageModel } from './../../database/model/message.model.js';
import { removeStoredFiles, uploadedFileUrl } from "../../common/utils/file/storage.js";
import { randomBytes, createHash } from "node:crypto";
import { ConflictException } from "../../common/index.js";
import mongoose from "mongoose";
import { conversationModel } from "../../database/model/conversation.model.js";
import { conversationMessageModel } from "../../database/model/conversationMessage.model.js";

export const createMessage = async (
    { content, receiverId, uniqueName, isAnonymous = true } = {},
    files = [],
    user = undefined
) => {
    let receiver = null;

    if (receiverId) {
        receiver = await userModel.findById(receiverId).select("_id");
    } else if (uniqueName) {
        receiver = await userModel
            .findOne({
                uniqueName: String(uniqueName).trim().toLowerCase()
            })
            .select("_id");
    }

    if (!receiver) {
        throw BadRequestException({
            message: receiverId
                ? "receiverId not exist"
                : "no account uses that uniqueName"
        });
    }

    const messageData = {
        content,
        receiverId: receiver._id,
        attachments: files.map(uploadedFileUrl),
        isAnonymous: user ? isAnonymous : true,
        ...(user ? { senderId: user.sub } : {})
    };

    const message = await messageModel.create(messageData);

    return message;
};



export const getAllMessages = async ({ type, page, limit }, user) => {
    let filter = {};

    if (type == "0") {
        filter = { receiverId: user.sub };
    } else if (type == "1") {
        // الuser هو الي باعت الرسايل
        filter = { senderId: user.sub };
    } else {
        filter = {
            $or: [
                { receiverId: user.sub },
                { senderId: user.sub }
            ]
        };
    }

    const skip = (page - 1) * limit;

    const count = await countDocuments({
        model: messageModel,
        filter
    });

    const pages = Math.ceil(count / limit);

    const messages = await find({
        model: messageModel,
        filter,
        options: {
            limit,
            skip,
            sort: { createdAt: -1 },
            populate: [
                {
                    path: "senderId",
                    select: "userName uniqueName"
                },
                {
                    path: "receiverId",
                    select: "userName uniqueName"
                }
            ]
        }
    });


    // بنمسح id الي بيرسل لوالرساله مبعوته كمجهول
    const safeMessages = messages.map(message => {
        const isReceiver = message.receiverId._id.toString() === user.sub;

        if (isReceiver && message.isAnonymous) {
            const safeMessage = message.toObject();
            delete safeMessage.senderId;
            return safeMessage;
        }

        return message;
    });

    return {
        count,
        limit,
        pages,
        currentPage: page,
        messages: safeMessages
    };
};

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
        model: messageModel,
        filter: {
            $or: [
                { receiverId: user.sub },
                { senderId: user.sub }
            ],
            _id: messageId
        },
        options: {
            populate: [
                {
                    path: "senderId",
                    select: "userName uniqueName"
                },
                {
                    path: "receiverId",
                    select: "userName uniqueName"
                }
            ]
        }
    });

    if (!data) {
        throw NotFoundException({
            message: "no message found"
        });
    }

    const isReceiver = data.receiverId._id.toString() === user.sub;

    if (isReceiver && data.isAnonymous) {
        const safeMessage = data.toObject();
        delete safeMessage.senderId;
        return safeMessage;
    }

    return data;
};


// createRequestIdentity
export const createRequestIdentity = async (messageId, userId) => {
    const updateMessage = await updateOne({
        model: messageModel, filter: {
            _id: messageId,
            receiverId: userId,
            isAnonymous: true,
            senderId: { $exists: true },
            identityRequestStatus: null
        }, update: {
            $set: {
                identityRequestStatus: StatusEnum.Pending
            }
        }
    })

    if (updateMessage) {
        return updateMessage
    }
    const message = await findOne({ model: messageModel, filter: { _id: messageId, receiverId: userId, } })

    if (!message) {
        throw NotFoundException({ message: "message not found" })
    }
    if (!message.isAnonymous) {
        throw BadRequestException({ message: "Identity is already known for this message" })
    }
    if (!message.senderId) {
        throw BadRequestException({
            message: "Cannot request identity for guest messages"
        });
    }
    if (message.identityRequestStatus) {
        throw ConflictException({
            message: "Identity request has already been submitted"
        });
    }

    throw ConflictException({
        message: "Unable to create identity request"
    });

}

export const getIdentityRequests = async (user) => {
    const requests = await find({
        model: messageModel,
        filter: {
            senderId: user.sub,
            isAnonymous: true,
            identityRequestStatus: StatusEnum.Pending
        },
        options: {
            sort: { createdAt: -1 },
            populate: {
                path: "receiverId",
                select: "userName uniqueName"
            }
        }
    });

    return requests;
};


export const respondToIdentityRequest = async (messageId, status, userId) => {
    if (![StatusEnum.Accepted, StatusEnum.Rejected].includes(status)) {
        throw BadRequestException({
            message: "Invalid identity request status"
        });
    }

    const session = await mongoose.startSession();

    try {
        await session.withTransaction(async () => {
            const message = await updateOne({
                model: messageModel,
                filter: {
                    _id: messageId,
                    senderId: userId,
                    isAnonymous: true,
                    identityRequestStatus: StatusEnum.Pending
                },
                update: {
                    $set: {
                        identityRequestStatus: status
                    }
                },
                options: { new: true, session }
            });

            if (!message) {
                throw ConflictException({
                    message: "Identity request not found or already processed"
                });
            }

            if (status === StatusEnum.Accepted) {
                await conversationModel.create(
                    [{
                        participants: [
                            message.senderId,
                            message.receiverId
                        ],
                        originalMessageId: message._id
                    }],
                    { session }
                );
            }
        });

        return {
            message: "Identity request processed successfully",
            ...(status == 1 ? { status: 'accepted' } : { status: 'rejected' })
        };

    } finally {
        await session.endSession();
    }
};

// get user conversation
export const getUserConversations = async (user) => {
    // 1. Get user's conversations
    const conversations = await find({
        model: conversationModel,
        filter: {
            participants: user.sub
        },
        options: {
            sort: { updatedAt: -1 },
            populate: {
                path: "participants",
                select: "userName uniqueName"
            }
        }
    });

    if (!conversations.length) {
        return [];
    }

    // 2. Get latest messages for all conversations
    const conversationIds = conversations.map(
        conversation => conversation._id
    );

    const messages = await find({
        model: conversationMessageModel,
        filter: {
            conversationId: { $in: conversationIds }
        },
        options: {
            sort: { createdAt: -1 },
            populate: {
                path: "senderId",
                select: "userName uniqueName"
            }
        }
    });

    // 3. Map latest message to each conversation
    const lastMessages = new Map();

    for (const message of messages) {
        const conversationId = message.conversationId.toString();

        if (!lastMessages.has(conversationId)) {
            lastMessages.set(conversationId, message);
        }
    }

    // 4. Return conversations with other participant and last message
    return conversations.map(conversation => {
        const conversationData = conversation.toObject();

        const otherParticipant = conversation.participants.find(
            participant => participant._id.toString() !== user.sub
        );

        return {
            ...conversationData,
            otherParticipant,
            lastMessage: lastMessages.get(
                conversation._id.toString()
            ) || null
        };
    });
};

// send conversation message
export const sendConversationMessage = async (
    { conversationId, content },
    files = [],
    user
) => {
    const conversation = await findOne({
        model: conversationModel,
        filter: {
            _id: conversationId,
            participants: user.sub
        }
    });

    if (!conversation) {
        throw NotFoundException({
            message: "Conversation not found"
        });
    }

    if (!content?.trim() && !files.length) {
        throw BadRequestException({
            message: "Message must contain text or at least one image"
        });
    }

    if (files.length > 3) {
        throw BadRequestException({
            message: "Maximum 3 images are allowed"
        });
    }

    let message;

    try {
        message = await create({
            model: conversationMessageModel,
            data: {
                conversationId,
                senderId: user.sub,
                content: content?.trim() || undefined,
                attachments: files.map(uploadedFileUrl)
            }
        });
    } catch (error) {
        await removeStoredFiles(files.map(uploadedFileUrl));
        throw error;
    }

    await updateOne({
        model: conversationModel,
        filter: { _id: conversationId },
        update: {
            $set: { updatedAt: new Date() }
        }
    });

    return message;
};

// get conversation messages
export const getConversationMessages = async (
    { conversationId, page = 1, limit = 20 },
    user
) => {
    // 1. Check conversation and user authorization
    const conversation = await findOne({
        model: conversationModel,
        filter: {
            _id: conversationId,
            participants: user.sub
        }
    });

    if (!conversation) {
        throw NotFoundException({
            message: "Conversation not found"
        });
    }

    // 2. Pagination
    const skip = (page - 1) * limit;

    const filter = { conversationId };

    const count = await countDocuments({
        model: conversationMessageModel,
        filter
    });

    const pages = Math.ceil(count / limit);

    // 3. Get messages
    const messages = await find({
        model: conversationMessageModel,
        filter,
        options: {
            limit,
            skip,
            sort: { createdAt: -1 },
            populate: {
                path: "senderId",
                select: "userName uniqueName"
            }
        }
    });

    return {
        count,
        limit: Number(limit),
        pages,
        currentPage: Number(page),
        messages
    };
};