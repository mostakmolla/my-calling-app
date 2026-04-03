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
  const users = new Map();

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("register", (username) => {
      users.set(socket.id, { username, id: socket.id });
      io.emit("user_list", Array.from(users.values()));
    });

    socket.on("disconnect", () => {
      users.delete(socket.id);
      io.emit("user_list", Array.from(users.values()));
      console.log("User disconnected:", socket.id);
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
      socket.to(to).emit("receive_message", { from: socket.id, message });
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
