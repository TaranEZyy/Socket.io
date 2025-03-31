const io = require("socket.io")(3000, {
  cors: {
    origin: "*",
  },
});

let users = {};

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("registerUser", (username) => {
    users[socket.id] = { id: socket.id, username };
    io.emit("usersList", Object.values(users)); // Broadcast updated user list
  });

  socket.on("sendMessage", ({ receiverId, text }) => {
    if (users[receiverId]) {
      io.to(receiverId).emit("receiveMessage", { senderId: socket.id, text });
      io.to(receiverId).emit("unreadMessage", { senderId: socket.id });
    }
  });

  socket.on("disconnect", () => {
    delete users[socket.id];
    io.emit("usersList", Object.values(users));
  });
});

console.log("Socket.io server running on portdsdnxjsnd 3000");





