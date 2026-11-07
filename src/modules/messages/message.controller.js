import { Router } from 'express';
import { successResponse } from '../../common/exceptions/successResponse.js';
import { createMessage, createRequestIdentity, deleteMessage, getAllMessages, getConversationMessages, getIdentityRequests, getMessage, getUserConversations, respondToIdentityRequest, sendConversationMessage } from './message.service.js';
import { fileValidation, upload } from '../../middleware/multer.js';
import { deleteMessageSchema, getAllMessageSchema, getConversationMessagesSchema, messageContentValidationSchema, respondToIdentityRequestSchema } from './message.validation.js';
import { validation } from '../../middleware/validation.middleware.js';
import { auth } from '../../middleware/authentication.middleware.js';
const router = Router();


// send message as annoumes
router.post('/create-message', upload({ validation: fileValidation.image }).array('attachments', 3),
    validation(messageContentValidationSchema),
    async (req, res) => {
        // console.log(req.files);
        const data = await createMessage(req.validation.body, req.files)
        return successResponse({ res, data, status: 201 })
    })

//send message with sender ID 
router.post('/create-message-by-account',
    auth
    , upload({ validation: fileValidation.image }).array('attachments', 3),
    validation(messageContentValidationSchema),
    async (req, res) => {
        // console.log(req.files);
        const data = await createMessage(req.validation.body, req.files, req.user)
        return successResponse({ res, data, status: 201 })
    })

// get all messages
router.get('/get-all-messages',
    auth,
    validation(getAllMessageSchema),
    async (req, res) => {
        const data = await getAllMessages(req.validation.query, req.user)
        return successResponse({ res, data })
    })

// delete message by id
router.delete('/delete-message/:messageId',
    auth,
    validation(deleteMessageSchema),
    async (req, res) => {
        const data = await deleteMessage(req.validation.params, req.user)
        return successResponse({ res, data })
    })

// get message by id
router.get('/get-message/:messageId',
    auth,
    validation(deleteMessageSchema),
    async (req, res) => {
        const data = await getMessage(req.validation.params, req.user)
        return successResponse({ res, data })
    })

// request the sender identity
router.post('/request-identity/:messageId', auth, async (req, res) => {
    const { messageId } = req.params
    const data = await createRequestIdentity(messageId, req.user.sub)
    return successResponse({ res, data, status: 201 })
})

// Get identity requests using anonymous token
router.get("/identity-requests", auth, async (req, res) => {


    const data = await getIdentityRequests(req.user);

    return successResponse({ res, data });
});


// Accept / Reject identity request
router.patch("/identity-request/:messageId", auth, validation(respondToIdentityRequestSchema),
    async (req, res) => {
        const { messageId } = req.params;
        const { status } = req.body;

        const data = await respondToIdentityRequest(
            messageId,
            status,
            req.user.sub
        );

        return successResponse({ res, data });
    }
);

router.get('/user-conversation', auth, async (req, res) => {
    const data = await getUserConversations(req.user)
    return successResponse({ res, data })
})

router.post('/create-conversation-message', auth, upload({ validation: fileValidation.image }).array('attachments', 3), async (req, res) => {

    const data = await sendConversationMessage(req.body, req.files, req.user)
    return successResponse({ res, data, status: 201 })
})

router.get('/conversation-messages/:conversationId', auth, validation(getConversationMessagesSchema),
    async (req, res) => {
        const data = await getConversationMessages({ conversationId: req.params.conversationId, ...req.query },
            req.user
        );

        return successResponse({ res, data });
    }
);

export default router