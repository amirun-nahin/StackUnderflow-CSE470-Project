const sequelize = require('../config/db');
const Group = require("../models/Group");
const GroupMember = require("../models/GroupMember");
const Post = require("../models/Post");
const User = require("../models/User");
const Comment = require("../models/Comment");
const Vote = require("../models/Vote");
const Notification = require("../models/Notification");

// Role hierarchy, top (most authority) to bottom
const ROLE_HIERARCHY = ["ADMIN", "TEAM_MANAGER", "SCRUM_MASTER", "PRODUCT_OWNER", "DEVELOPER", "MEMBER"];

// Create a Group (Creator becomes ADMIN)
exports.createGroup = async (req, res) => {
  try {
    const { name, description, is_private } = req.body;
    if (!name) return res.status(400).json({ error: "Group name is required" });

    const group = await Group.create({ name, description, is_private });

    await GroupMember.create({
      UserId: req.user.id,
      GroupId: group.id,
      role: "ADMIN",
      status: "APPROVED",
    });

    res.status(201).json(group);
  } catch (error) {
    console.error("Group creation error:", error);
    res
      .status(500)
      .json({ error: "Failed to create group. Name might be taken." });
  }
};

// Get all Groups
exports.getAllGroups = async (req, res) => {
  try {
    const groups = await Group.findAll({
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: User,
          attributes: ["id", "username", "profile_picture"],
          through: { attributes: ["role", "status"] },
        },
      ],
    });

    const userId = req.user.id;

    const enrichedGroups = groups.map((group) => {
      const json = group.toJSON();
      const membershipRecord = json.Users.find((u) => u.id === userId);
      const myMembership = membershipRecord
        ? membershipRecord.GroupMember
        : null;

      return {
        ...json,
        myMembership,
      };
    });

    res.json(enrichedGroups);
  } catch (error) {
    console.error("Fetch groups error:", error);
    res.status(500).json({ error: "Failed to fetch groups" });
  }
};

// Toggle Privacy - Admins Only
exports.togglePrivacy = async (req, res) => {
  try {
    const membership = await GroupMember.findOne({
      where: {
        GroupId: req.params.groupId,
        UserId: req.user.id,
        role: "ADMIN",
      },
    });

    if (!membership)
      return res
        .status(403)
        .json({ error: "Only admins can change privacy settings" });

    const group = await Group.findByPk(req.params.groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });

    group.is_private = !group.is_private;
    await group.save();

    if (!group.is_private) {
      await GroupMember.update(
        { status: "APPROVED" },
        { where: { GroupId: group.id, status: "PENDING" } },
      );
    }

    res.json({
      message: `Group is now ${group.is_private ? "Private" : "Public"}`,
      group,
    });
  } catch (error) {
    console.error("Toggle privacy error:", error);
    res.status(500).json({ error: "Failed to toggle privacy" });
  }
};

// Join a Group (Or request to join if private)
exports.joinGroup = async (req, res) => {
  try {
    const group = await Group.findByPk(req.params.groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });

    const existing = await GroupMember.findOne({
      where: { GroupId: group.id, UserId: req.user.id },
    });
    if (existing)
      return res
        .status(400)
        .json({ error: "You have already joined or requested to join" });

    const status = group.is_private ? "PENDING" : "APPROVED";
    await GroupMember.create({
      UserId: req.user.id,
      GroupId: group.id,
      status,
    });

    res.json({
      message:
        status === "PENDING" ? "Request sent to admins" : "Joined successfully",
    });
  } catch (error) {
    console.error("Join group error:", error);
    res.status(500).json({ error: "Failed to join group" });
  }
};

// Admin: View Pending Join Requests
exports.getPendingRequests = async (req, res) => {
  try {
    const isAdmin = await GroupMember.findOne({
      where: {
        GroupId: req.params.groupId,
        UserId: req.user.id,
        role: "ADMIN",
      },
    });
    if (!isAdmin)
      return res.status(403).json({ error: "Only admins can view requests" });

    const groupWithRequests = await Group.findByPk(req.params.groupId, {
      include: [
        {
          model: User,
          through: { where: { status: "PENDING" }, attributes: ["status"] },
          attributes: ["id", "username"],
        },
      ],
    });

    // Return just the array of pending users
    res.json(groupWithRequests ? groupWithRequests.Users : []);
  } catch (error) {
    console.error("Fetch requests error:", error);
    res.status(500).json({ error: "Failed to fetch requests" });
  }
};

// Admin: Approve a Join Request
exports.approveRequest = async (req, res) => {
  try {
    const isAdmin = await GroupMember.findOne({
      where: {
        GroupId: req.params.groupId,
        UserId: req.user.id,
        role: "ADMIN",
      },
    });
    if (!isAdmin)
      return res
        .status(403)
        .json({ error: "Only admins can approve requests" });

    const request = await GroupMember.findOne({
      where: {
        GroupId: req.params.groupId,
        UserId: req.params.userId,
        status: "PENDING",
      },
    });
    if (!request)
      return res.status(404).json({ error: "Pending request not found" });

    request.status = "APPROVED";
    await request.save();

    res.json({ message: "Member approved successfully" });
  } catch (error) {
    console.error("Approve request error:", error);
    res.status(500).json({ error: "Failed to approve request" });
  }
};

// Get a group's approved members with their roles, sorted by role hierarchy
exports.getMembers = async (req, res) => {
  try {
    const requester = await GroupMember.findOne({
      where: { GroupId: req.params.groupId, UserId: req.user.id, status: "APPROVED" },
    });
    if (!requester) {
      return res.status(403).json({ error: "You must be a group member to view members" });
    }

    const group = await Group.findByPk(req.params.groupId, {
      include: [
        {
          model: User,
          attributes: ["id", "username", "profile_picture"],
          through: { where: { status: "APPROVED" }, attributes: ["role"] },
        },
      ],
    });
    if (!group) return res.status(404).json({ error: "Group not found" });

    const members = group.Users
      .map((u) => ({ id: u.id, username: u.username, profile_picture: u.profile_picture, role: u.GroupMember.role }))
      .sort((a, b) => ROLE_HIERARCHY.indexOf(a.role) - ROLE_HIERARCHY.indexOf(b.role));

    res.json(members);
  } catch (error) {
    console.error("Fetch members error:", error);
    res.status(500).json({ error: "Failed to fetch members" });
  }
};

// Admin: Assign a role to a member
exports.assignRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!ROLE_HIERARCHY.includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const isAdmin = await GroupMember.findOne({
      where: { GroupId: req.params.groupId, UserId: req.user.id, role: "ADMIN" },
    });
    if (!isAdmin) {
      return res.status(403).json({ error: "Only the admin can assign roles" });
    }

    const membership = await GroupMember.findOne({
      where: { GroupId: req.params.groupId, UserId: req.params.userId, status: "APPROVED" },
    });
    if (!membership) {
      return res.status(404).json({ error: "Member not found in this group" });
    }

    membership.role = role;
    await membership.save();

    res.json({ message: "Role updated", role: membership.role });
  } catch (error) {
    console.error("Assign role error:", error);
    res.status(500).json({ error: "Failed to assign role" });
  }
};

// Create a Group Post (approved members, standard post only)
exports.createGroupPost = async (req, res) => {
  try {
    const { text_content, code_snippet, language } = req.body;
    const { groupId } = req.params;

    const member = await GroupMember.findOne({
      where: { GroupId: groupId, UserId: req.user.id, status: "APPROVED" },
    });
    if (!member)
      return res.status(403).json({
        error: "You must be an approved member to post in this group",
      });

    const post = await Post.create({
      text_content,
      code_snippet,
      category: "NORMAL",
      language: language || "General",
      GroupId: groupId,
      UserId: req.user.id,
    });

    const postWithUser = await Post.findByPk(post.id, {
      include: [{ model: User, attributes: ["username", "profile_picture"] }],
    });
    // Notify every other approved member — skip the poster themselves
    const group = await Group.findByPk(groupId);
    const otherMembers = await GroupMember.findAll({
      where: { GroupId: groupId, status: "APPROVED" },
    });
    const recipientIds = otherMembers
      .map((m) => m.UserId)
      .filter((id) => id !== req.user.id);

    if (recipientIds.length > 0) {
      await Notification.bulkCreate(
        recipientIds.map((id) => ({
          type: "NEW_POST_IN_GROUP",
          message: `${postWithUser.User.username} posted in "${group.name}".`,
          link: `/group/${groupId}`,
          UserId: id,
        }))
      );
    }

    res.status(201).json(postWithUser);
  } catch (error) {
    console.error("Group post error:", error);
    res.status(500).json({ error: "Failed to create group post" });
  }
};

// Get Group Feed
exports.getGroupFeed = async (req, res) => {
  try {
    const group = await Group.findByPk(req.params.groupId);
    if (!group) return res.status(404).json({ error: "Group not found" });

    if (group.is_private) {
      const member = await GroupMember.findOne({
        where: { GroupId: group.id, UserId: req.user.id, status: "APPROVED" },
      });
      if (!member)
        return res
          .status(403)
          .json({ error: "This group is private. Access denied." });
    }

    const posts = await Post.findAll({
      where: { GroupId: group.id },
      order: [["createdAt", "DESC"]],
      include: [
        { model: User, attributes: ["id", "username", "profile_picture"] },
        { model: Vote },
        {
          model: Comment,
          include: [{ model: User, attributes: ["username"] }],
        },
      ],
    });

    res.json(posts);
  } catch (error) {
    console.error("Fetch group feed error:", error);
    res.status(500).json({ error: "Failed to fetch group posts" });
  }
};

// Admin: Delete the Group
exports.deleteGroup = async (req, res) => {
    try {
        const isAdmin = await GroupMember.findOne({
            where: { GroupId: req.params.groupId, UserId: req.user.id, role: "ADMIN" }
        });
        if (!isAdmin) return res.status(403).json({ error: "Only admins can delete the group" });

        // Find which posts belong to this group, so we know which comments/votes to remove
        const posts = await Post.findAll({ where: { GroupId: req.params.groupId }, attributes: ['id'] });
        const postIds = posts.map(p => p.id);

        await sequelize.transaction(async (t) => {
            if (postIds.length) {
                await Comment.destroy({ where: { PostId: postIds }, transaction: t });
                await Vote.destroy({ where: { PostId: postIds }, transaction: t });
                await Post.destroy({ where: { GroupId: req.params.groupId }, transaction: t });
            }
            await GroupMember.destroy({ where: { GroupId: req.params.groupId }, transaction: t });
            await Group.destroy({ where: { id: req.params.groupId }, transaction: t });
        });

        res.json({ message: "Group deleted" });
    } catch (error) {
        console.error("Delete group error:", error);
        res.status(500).json({ error: "Failed to delete group" });
    }
};

// Leave the Group (approved members)
exports.leaveGroup = async (req, res) => {
    try {
        const membership = await GroupMember.findOne({
            where: { GroupId: req.params.groupId, UserId: req.user.id }
        });
        if (!membership) {
            return res.status(404).json({ error: "You are not a member of this group" });
        }
        if (membership.role === "ADMIN") {
            return res.status(400).json({ error: "The admin cannot leave the group. Delete the group instead." });
        }
        await membership.destroy();
        res.json({ message: "Left group successfully" });
    } catch (error) {
        console.error("Leave group error:", error);
        res.status(500).json({ error: "Failed to leave group" });
    }
};

// Admin: Edit group name/description
exports.editGroup = async (req, res) => {
    try {
        const { name, description } = req.body;

        const isAdmin = await GroupMember.findOne({
            where: { GroupId: req.params.groupId, UserId: req.user.id, role: "ADMIN" }
        });
        if (!isAdmin) return res.status(403).json({ error: "Only the admin can edit this group" });

        const group = await Group.findByPk(req.params.groupId);
        if (!group) return res.status(404).json({ error: "Group not found" });

        if (name !== undefined) {
            if (!name.trim()) {
                return res.status(400).json({ error: "Group name cannot be empty" });
            }
            group.name = name.trim();
        }
        if (description !== undefined) {
            group.description = description.trim();
        }

        await group.save();
        res.json({ message: "Group updated", name: group.name, description: group.description });
    } catch (error) {
        if (error.name === "SequelizeUniqueConstraintError") {
            return res.status(400).json({ error: "A group with that name already exists" });
        }
        console.error("Edit group error:", error);
        res.status(500).json({ error: "Failed to update group" });
    }
};