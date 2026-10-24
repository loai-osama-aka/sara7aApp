import { Router } from "express";
import { getUserById } from "./user.service.js";
import { auth } from "../../middleware/authentication.middleware.js";

const router = Router();
// get user by id
router.get("/profile", auth, async (req, res) => {
  // console.log(req.user.sub, "id");
  const response = await getUserById(req.user.sub);

  res.json(response);
});

export default router;
