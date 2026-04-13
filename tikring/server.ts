import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;

  // Presence tracking
  const users = new Map(); // socket.id -> { username, phone }
  const phoneToSocket = new Map(); // phone -> socket.id

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("register", ({ username, phone }) => {
      users.set(socket.id, { username, phone });
      if (phone) {
        phoneToSocket.set(phone, socket.id);
        socket.join(phone); // Individual room for signaling
        io.emit("user_status_change", { phone, isOnline: true });
      }
      io.emit("user_list", Array.from(users.values()));
    });

    socket.on("disconnect", () => {
      const user = users.get(socket.id);
      if (user && user.phone) {
        phoneToSocket.delete(user.phone);
        io.emit("user_status_change", { phone: user.phone, isOnline: false });
        
        // Notify any active call rooms
        const rooms = Array.from(socket.rooms);
        rooms.forEach(room => {
          if (room.startsWith('call_')) {
            socket.to(room).emit('peer_disconnected');
          }
        });
      }
      users.delete(socket.id);
      io.emit("user_list", Array.from(users.values()));
      console.log("User disconnected:", socket.id);
    });

    // WebRTC Signaling Relay
    socket.on("join_call", ({ toPhone }) => {
      const user = users.get(socket.id);
      if (!user || !user.phone) return;

      const roomName = [user.phone, toPhone].sort().join('_');
      socket.join(`call_${roomName}`);
      console.log(`User ${user.phone} joined call room: call_${roomName}`);
      
      // Notify the other user that someone joined the call
      socket.to(toPhone).emit("user_joined_call", { from: user.phone });
    });

    socket.on("offer", (payload) => {
      const user = users.get(socket.id);
      console.log(`Relaying offer from ${user?.phone} to ${payload.to}. Type: ${payload.callType || payload.type || 'unknown'}`);
      console.log('Offer Payload:', JSON.stringify({ ...payload, offer: 'SDP_HIDDEN' }));
      socket.to(payload.to).emit("offer", { ...payload, from: user?.phone });
    });

    socket.on("answer", (payload) => {
      const user = users.get(socket.id);
      console.log(`Relaying answer from ${user?.phone} to ${payload.to}`);
      socket.to(payload.to).emit("answer", { ...payload, from: user?.phone });
    });

    socket.on("ice_candidate", ({ to, candidate }) => {
      const user = users.get(socket.id);
      socket.to(to).emit("ice_candidate", { from: user?.phone, candidate });
    });

    socket.on("end_call", ({ to }) => {
      const user = users.get(socket.id);
      if (user && user.phone) {
        const roomName = [user.phone, to].sort().join('_');
        socket.leave(`call_${roomName}`);
        socket.to(to).emit("call_ended");
      }
    });

    // Other app features (Chat, Groups, etc.)
    socket.on("send_message", ({ to, message, isGroup }) => {
      const sender = users.get(socket.id);
      if (isGroup) {
        socket.to(to).emit("receive_message", { from: to, message, senderPhone: sender?.phone });
      } else {
        socket.to(to).emit("receive_message", { from: sender?.phone || socket.id, message });
      }
    });

    socket.on("delete_message", ({ to, messageId, isGroup }) => {
      const sender = users.get(socket.id);
      console.log(`🗑️ Delete request from ${sender?.phone} for msg ${messageId} to ${to} (isGroup: ${isGroup})`);
      if (isGroup) {
        io.to(to).emit("delete_message", { messageId, from: to });
      } else {
        io.to(to).emit("delete_message", { messageId, from: sender?.phone || socket.id });
      }
    });

    socket.on("typing", ({ to }) => {
      const sender = users.get(socket.id);
      socket.to(to).emit("typing", { from: sender?.phone || socket.id });
    });

    socket.on("stop_typing", ({ to }) => {
      const sender = users.get(socket.id);
      socket.to(to).emit("stop_typing", { from: sender?.phone || socket.id });
    });

    socket.on("message_read", ({ to, messageId, chatId }) => {
      const sender = users.get(socket.id);
      const payload = { from: sender?.phone || socket.id, messageId, chatId: sender?.phone || chatId };
      socket.to(to).emit("message_read", payload);
      if (sender?.phone) {
        socket.to(sender.phone).emit("message_read", { ...payload, isSelfUpdate: true });
      }
    });

    socket.on("friend_request", ({ toPhone, fromUser }) => {
      const targetSocketId = phoneToSocket.get(toPhone);
      if (targetSocketId) socket.to(targetSocketId).emit("friend_request_received", fromUser);
    });

    socket.on("group_invitation", ({ to, group }) => {
      const targetSocketId = phoneToSocket.get(to);
      if (targetSocketId) socket.to(targetSocketId).emit("group_invitation", group);
    });

    socket.on("join_group", (groupId) => {
      socket.join(groupId);
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
