import { Router } from "express";
import { generateNewAccessToken, login, signup } from "./auth.service.js";
const router = Router();

router.post("/signup", async (req, res) => {
  const response = await signup(req.body);
  res.send(response);
});
// login
router.post("/login", async (req, res) => {
  const response = await login(req.body);
  res.send(response);
});
// generate new access token
router.post("/generate-access-token", async (req, res) => {
  const { refreshToken } = req.body;
  const response = await generateNewAccessToken(refreshToken);
  res.json(response);
});

export default router;
