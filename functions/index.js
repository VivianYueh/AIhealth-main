const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// 用於 httpsCallable 的安全刪除帳號
exports.deleteUserByAdmin = functions.https.onCall(async (data, context) => {
  console.log("收到 data:", data);
  const {uid} = data.data;
  console.log("要刪除的 uid:", uid);
  if (!uid) {
    throw new functions.https.HttpsError("invalid-argument", "Missing uid");
  }
  try {
    await admin.auth().deleteUser(uid);
    return {message: "User deleted"};
  } catch (error) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});
