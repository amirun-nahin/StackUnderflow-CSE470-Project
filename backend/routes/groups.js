const express = require("express");
const router = express.Router();
const groupController = require("../controllers/groups");
const { validateToken } = require("../middlewares/AuthMiddleware");

router.post("/create", validateToken, groupController.createGroup);
router.get("/", validateToken, groupController.getAllGroups);
router.put("/:groupId/toggle-privacy", validateToken, groupController.togglePrivacy);
router.post("/:groupId/join", validateToken, groupController.joinGroup);
router.get("/:groupId/requests", validateToken, groupController.getPendingRequests);
router.put("/:groupId/requests/:userId/approve", validateToken, groupController.approveRequest);
router.get("/:groupId/members", validateToken, groupController.getMembers);
router.put("/:groupId/members/:userId/role", validateToken, groupController.assignRole);
router.post("/:groupId/posts", validateToken, groupController.createGroupPost);
router.get("/:groupId/posts", validateToken, groupController.getGroupFeed);
router.delete("/:groupId", validateToken, groupController.deleteGroup);
router.delete("/:groupId/leave", validateToken, groupController.leaveGroup);
router.put("/:groupId", validateToken, groupController.editGroup);

module.exports = router;