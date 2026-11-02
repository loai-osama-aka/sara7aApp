import { Router } from "express";
import { getAllUsers, getPublicUserByUniqueName, getUserById } from "./user.service.js";
import { auth } from "../../middleware/authentication.middleware.js";
import { autherization } from "../../middleware/autherization.middleware.js";

const router = Router();
// get user by id
router.get("/profile", auth, async (req, res) => {
  // console.log(req.user.sub, "id");
  const response = await getUserById(req.user.sub);

  res.json(response);
});

// public: resolve a uniqueName from a share link, no auth needed
router.get("/unique/:uniqueName", async (req, res) => {
  const response = await getPublicUserByUniqueName(req.params.uniqueName);

  res.json(response);
});

// get all user (admin only)
router.get('/get-all-users', auth, autherization(['1']), async (req, res) => {
  const response = await getAllUsers()
  res.json(response)
})


export default router;
