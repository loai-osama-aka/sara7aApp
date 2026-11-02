import { Router } from 'express';
import { successResponse } from '../../common/exceptions/successResponse.js';
import { createMessage, deleteMessage, getAllMessages, getMessage } from './message.service.js';
import { fileValidation, upload } from '../../middleware/multer.js';
import { deleteMessageSchema, getAllMessageSchema, messageContentValidationSchema } from './message.validation.js';
import { validation } from '../../middleware/validation.middleware.js';
import { auth } from '../../middleware/authentication.middleware.js';
const router = Router();


// send message as annoumes
router.post('/create-message', upload({ validation: fileValidation.image }).array('attachments', 3),
    validation(messageContentValidationSchema),
    async (req, res) => {
        console.log(req.files);
        const data = await createMessage(req.body, req.files)
        return successResponse({ res, data, status: 201 })
    })

//send message with sender ID 
router.post('/create-message-by-account',
    auth
    , upload({ validation: fileValidation.image }).array('attachments', 3),
    validation(messageContentValidationSchema),
    async (req, res) => {
        // console.log(req.files);
        const data = await createMessage(req.body, req.files, req.user)
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


export default router