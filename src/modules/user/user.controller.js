import { Router } from "express";
import { getUserById } from "./user.service.js";
import { auth } from "../../middleware/authentication.middleware.js";

const router = Router();
// get user by id
router.get("/get-user-by-id", auth, async (req, res) => {
  // console.log(req.user.sub, "id");
  const response = await getUserById(req.user.sub);

  res.json(response);
});

export default router;
