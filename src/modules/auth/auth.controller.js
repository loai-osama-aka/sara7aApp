import { Router } from "express";
import { checkTwoStepOtp, forgetPassword, generateNewAccessToken, login, reSendVerifyAccount, resetForgetPassword, signup, signupOrLoginWithGoogle, twoStepVerification, verifyAccount, verifyForgetPassword, verifyTwoStepVerification } from "./auth.service.js";
import { confirmEmailSchema, loginSchema, loginValidation, resetForgetPasswordSchema, signupSchema } from "./auth.validation.js";
import { validation } from "../../middleware/validation.middleware.js";
import { auth } from './../../middleware/authentication.middleware.js';
import { autherization } from "../../middleware/autherization.middleware.js";
import { fileValidation, upload } from "../../middleware/multer.js";
const router = Router();

//sign up
router.post("/signup", validation(signupSchema), async (req, res) => {
  const response = await signup(req.validation.body);
  res.send(response);
});

//upload profile image 
router.patch("/upload-image-profile", upload({ validation: fileValidation.image }).array('image', 2), async (req, res) => {
  console.log(req.file ?? req.files);

  res.send({ file: req.files ?? req.file });
});

// request a twoStepVerification

router.post("/req-two-step-verify", validation(confirmEmailSchema), auth, async (req, res) => {
  const { email } = req.validation.body
  const response = await twoStepVerification(email);
  res.send(response);
});

// verifyTwoStepVerification
router.patch("/verify-two-step", validation(confirmEmailSchema), auth, async (req, res) => {
  const { email, otp } = req.validation.body
  const response = await verifyTwoStepVerification(email, otp);
  res.send(response);
});

// login confirmation using two step verify
router.post("/login-confirm-two-step-verify", validation(confirmEmailSchema), async (req, res) => {
  const { email, otp } = req.validation.body
  const response = await checkTwoStepOtp(email, otp);
  res.send(response);
});
// login
router.post("/login", validation(loginValidation), async (req, res) => {

  const response = await login(req.validation.body);
  res.send(response);
});

// signup & login using google
router.post("/google", async (req, res) => {
  const { idToken } = req.body
  const response = await signupOrLoginWithGoogle(idToken);
  res.send(response);
});

// generate new access token
router.post("/generate-access-token", async (req, res) => {
  const { refreshToken } = req.body;
  const response = await generateNewAccessToken(refreshToken);
  res.json(response);
});

//verify email
router.patch('/verify-account', validation(confirmEmailSchema), async (req, res) => {
  const { otp, email } = req.body
  const response = await verifyAccount(otp, email)
  res.json(response)
})

//resend verify email
router.patch('/resend-verify-account', async (req, res) => {
  const { email } = req.body
  const response = await reSendVerifyAccount(email)
  res.json(response)
})

//forgetPassword
router.post('/forget-password', validation(confirmEmailSchema), async (req, res) => {
  const { email } = req.body
  const response = await forgetPassword(email)
  res.json(response)
})

//verifyForgetPassword
router.post('/verify-forget-password', validation(confirmEmailSchema), async (req, res) => {
  const { email, otp } = req.body
  const response = await verifyForgetPassword(otp, email)
  res.json(response)
})

//reset password 
router.patch('/reset-forget-password', validation(resetForgetPasswordSchema), async (req, res) => {
  const { email, otp, password } = req.body
  const response = await resetForgetPassword(otp, email, password)
  res.json(response)
})


export default router;
