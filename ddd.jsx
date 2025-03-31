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

console.log("Socket.io server running on port 3000");





















import React, { useState, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet } from "react-native";
import { createStackNavigator } from "@react-navigation/stack";
import { NavigationContainer } from "@react-navigation/native";
import io from "socket.io-client";

const socket = io("http://10.8.21.150:3000"); // Change to your server IP

const Stack = createStackNavigator();

// 🟢 Join Screen: Enter Username Before Joining
const JoinScreen = ({ navigation }) => {
  const [username, setUsername] = useState("");

  const handleJoin = () => {
    if (username.trim()) {
      socket.emit("registerUser", username); // Send username to server
      navigation.replace("Home", { username }); // Navigate to HomeScreen
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Enter Your Username</Text>
      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
      />
      <TouchableOpacity style={styles.joinButton} onPress={handleJoin}>
        <Text style={styles.joinButtonText}>Join</Text>
      </TouchableOpacity>
    </View>
  );
};







// 🟢 Home Screen: List of Online Users
const HomeScreen = ({ navigation, route }) => {
  const { username } = route.params;
  const [users, setUsers] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});

  useEffect(() => {
    socket.on("usersList", (userList) => {
      setUsers(userList.filter((user) => user.id !== socket.id));
    });

    socket.on("unreadMessage", ({ senderId }) => {
      setUnreadCounts((prev) => ({
        ...prev,
        [senderId]: (prev[senderId] || 0) + 1,
      }));
    });

    return () => {
      socket.off("usersList");
      socket.off("unreadMessage");
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>🟢 Online Users</Text>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.userItem,{elevation:6,borderColor:"black",borderWidth:0.9,}]}
            onPress={() => {
              setUnreadCounts((prev) => ({ ...prev, [item.id]: 0 }));
              navigation.navigate("Chat", { user: item });
            }}
          >
            <Text style={styles.username}>{item.username}</Text>
            {unreadCounts[item.id] > 0 && (
              <View style={styles.badge}>
                <Text style={{color:'white',fontWeight: "bold"}}>New Message:</Text>
                <Text style={styles.badgeText}> {unreadCounts[item.id]}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
};








// 🟢 Chat Screen: Messaging with Selected User
const ChatScreen = ({ route }) => {
  const { user } = route.params;
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    socket.on("receiveMessage", (msg) => {
      setMessages((prevMessages) => [...prevMessages, msg]);
    });

    return () => {
      socket.off("receiveMessage");
    };
  }, []);

  const sendMessage = () => {
    if (message.trim()) {
      const newMessage = {
        text: message,
        senderId: socket.id,
        receiverId: user.id,
      };
      socket.emit("sendMessage", newMessage);
      setMessages((prevMessages) => [...prevMessages, newMessage]);
      setMessage("");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Chat with {user.username}</Text>
      <FlatList
        data={messages}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={[styles.messageBubble, item.senderId === socket.id ? styles.myMessage : styles.otherMessage]}>
            <Text style={styles.messageText}>{item.text}</Text>
          </View>
        )}
      />
      <View style={styles.inputContainer}>
        <TextInput style={[styles.input,{width:"75%"}]} value={message} onChangeText={setMessage} placeholder="Type a message..." />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};









// 🟢 Navigation Setup
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Join" component={JoinScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// 🟢 Styles
const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: "#ece5dd" },
  header: { fontSize: 20, fontWeight: "bold", marginBottom: 10, textAlign: "center", color: "#075e54"},
  input: { borderWidth: 1, borderColor: "#ddd", padding: 18, borderRadius: 25, fontSize: 16, backgroundColor: "#f5f5f5", marginBottom: 10 },
  joinButton: { backgroundColor: "#25d366", padding: 15, borderRadius: 25, alignItems: "center" },
  joinButtonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  userItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 15, borderBottomWidth: 1, borderColor: "#ddd", backgroundColor: "#ffffff", borderRadius: 5, marginVertical: 5 },
  username: { fontSize: 18, color: "#075e54", fontWeight: "bold" },
  badge: { flexDirection:"row",backgroundColor: "red", borderRadius: 12, paddingHorizontal: 6, paddingVertical: 3, justifyContent: "center", alignItems: "center" },
  badgeText: { color: "white", fontSize: 19, fontWeight: "bold" },
  messageBubble: { padding: 12, borderRadius: 10, marginVertical: 5, maxWidth: "80%", paddingHorizontal: 15 },
  myMessage: { backgroundColor: "#dcf8c6", alignSelf: "flex-end" },
  otherMessage: { backgroundColor: "#ffffff", alignSelf: "flex-start", borderWidth: 1, borderColor: "#ddd" },
  messageText: { fontSize: 16, color: "#000" },
  inputContainer: { flexDirection: "row", alignItems: "center", padding: 10, backgroundColor: "#ffffff", borderTopWidth: 1, borderColor: "#ddd" },
  sendButton: { marginLeft: 10, backgroundColor: "#25d366", paddingVertical: 15, paddingHorizontal: 20, borderRadius: 25 },
  sendButtonText: { color: "#ffffff", fontSize: 16, fontWeight: "bold" },
});
