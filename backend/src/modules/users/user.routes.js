import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { validateBody } from "../../middleware/validate.js";
import { createUserSchema, updateUserSchema } from "./user.schema.js";
import * as userController from "./user.controller.js";

const router = Router();

// Seluruh endpoint manajemen pengguna memerlukan autentikasi role ADMIN
router.use(requireAuth, requireRole("ADMIN"));

router.get("/", userController.listUsers);
router.get("/:id", userController.getUser);
router.post("/", validateBody(createUserSchema), userController.createUser);
router.patch("/:id", validateBody(updateUserSchema), userController.updateUser);
router.delete("/:id", userController.deleteUser);

export default router;
