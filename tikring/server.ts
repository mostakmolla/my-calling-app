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

  // Signaling and Presence
  const users = new Map(); // socket.id -> { username, id, phone }
  const phoneToSocket = new Map(); // phone -> socket.id

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("register", ({ username, phone }) => {
      users.set(socket.id, { username, id: socket.id, phone });
      if (phone) {
        phoneToSocket.set(phone, socket.id);
        socket.join(phone); // Join a room named after the phone number
        // Broadcast that this user is now online
        io.emit("user_status_change", { phone, isOnline: true });
      }
      io.emit("user_list", Array.from(users.values()));
    });

    socket.on("disconnect", () => {
      const user = users.get(socket.id);
      if (user && user.phone) {
        phoneToSocket.delete(user.phone);
        // Broadcast that this user is now offline
        io.emit("user_status_change", { phone: user.phone, isOnline: false });
      }
      users.delete(socket.id);
      io.emit("user_list", Array.from(users.values()));
      console.log("User disconnected:", socket.id);
    });

    // Friend Request Signaling
    socket.on("friend_request", ({ toPhone, fromUser }) => {
      const targetSocketId = phoneToSocket.get(toPhone);
      if (targetSocketId) {
        socket.to(targetSocketId).emit("friend_request_received", fromUser);
      }
    });

    // WebRTC Signaling
    socket.on("offer", ({ to, offer }) => {
      socket.to(to).emit("offer", { from: socket.id, offer });
    });

    socket.on("answer", ({ to, answer }) => {
      socket.to(to).emit("answer", { from: socket.id, answer });
    });

    socket.on("ice_candidate", ({ to, candidate }) => {
      socket.to(to).emit("ice_candidate", { from: socket.id, candidate });
    });

    // Chat signaling (for real-time delivery, though storage is local)
    socket.on("send_message", ({ to, message }) => {
      const sender = users.get(socket.id);
      socket.to(to).emit("receive_message", { from: sender?.phone || socket.id, message });
    });

    socket.on("typing", ({ to }) => {
      const sender = users.get(socket.id);
      socket.to(to).emit("typing", { from: sender?.phone || socket.id });
    });

    socket.on("stop_typing", ({ to }) => {
      const sender = users.get(socket.id);
      socket.to(to).emit("stop_typing", { from: sender?.phone || socket.id });
    });
  });

  // Vite middleware for development
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
