import { auth, db, functions } from './firebase/config';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, deleteUser as firebaseDeleteUser } from 'firebase/auth';
import { doc, setDoc, getDoc, deleteDoc, collection, getDocs, updateDoc, serverTimestamp, query, where, arrayUnion, Timestamp, addDoc } from 'firebase/firestore';
import { scryptSync } from 'scrypt-js';
import { Buffer } from 'buffer';
import CryptoJS from 'crypto-js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFunctions, httpsCallable } from "firebase/functions";


const SECRET_KEY = 'EBKmQ298tQh2/U4MrzX/RuxGrPnZBMjtkAxPgulF7db0UoOKLZcL/zrW/FQuEvncSEde92lAqSHPSonvMxaeug==';

export function hashIdentity(identity) {
  try {
    const encryptedData = CryptoJS.AES.encrypt(identity, SECRET_KEY).toString();
    return encryptedData;
  } catch (error) {
    console.error('Hashing failed:', error.message);
    throw new Error('身份加密失敗');
  }
}

export function decryptIdentity(encryptedData) {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    return originalText;
  } catch (error) {
    console.error('Decrypting failed:', error.message);
    throw new Error('身份解密失敗');
  }
}

export async function login(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { uid: userCredential.user.uid, email: userCredential.user.email };
  } catch (error) {
    console.error('Login failed:', error.message);
    throw new Error('登入失敗: ' + error.message);
  }
}

export async function register(email, password, name, identity, role, fullPhone) {
  const validRoles = ['patient', 'caregiver', 'family', 'therapist', 'doctor', 'hospital_admin', 'system_admin'];
  let newUserCredential = null;
  try {
    if (!validRoles.includes(role)) {
      throw new Error('無效的角色');
    }

    console.log('Starting registration for:', email);
    newUserCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log('User created with UID:', newUserCredential.user.uid);

    const hashedIdentity = hashIdentity(identity);
    const userData = {
      email: newUserCredential.user.email,
      password: password,
      name: name,
      identity: hashedIdentity,
      role: role,
      phone: fullPhone,
      related_ids: [],
      createdAt: serverTimestamp()
    };
    console.log('Writing to Firestore:', userData);

    await setDoc(doc(db, 'users', newUserCredential.user.uid), userData);
    console.log('User data written to Firestore');

    return {
      uid: newUserCredential.user.uid,
      email: newUserCredential.user.email,
      name,
      identity: hashedIdentity,
      role,
      fullPhone
    };
  } catch (error) {
    console.error('Registration failed:', error.message);

    // 只刪除剛建立但未完成註冊的新帳號，不刪除當前登入的 admin
    if (newUserCredential && newUserCredential.user) {
      try {
        await firebaseDeleteUser(newUserCredential.user);
        console.log('Newly created user deleted due to registration failure:', newUserCredential.user.uid);
      } catch (cleanupError) {
        console.error('Failed to clean up new user:', cleanupError.message);
      }
    }

  // 回傳更詳細的錯誤訊息給前端
  throw new Error('註冊失敗: ' + (error.message || error.code || error.toString()));
  }
}

export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    console.log('Password reset email sent to:', email);
  } catch (error) {
    console.error('Password reset failed:', error.message);
    throw new Error('重設密碼失敗: ' + error.message);
  }
}

export async function deleteUser(userId, isAdmin = false) {
    // 0. 移除所有 users 文件中 related_ids 包含 userId 的欄位
    const allUsersSnap = await getDocs(collection(db, 'users'));
    for (const userDoc of allUsersSnap.docs) {
      const data = userDoc.data();
      if (Array.isArray(data.related_ids) && data.related_ids.includes(userId)) {
        const newRelated = data.related_ids.filter(id => id !== userId);
        await updateDoc(doc(db, 'users', userDoc.id), { related_ids: newRelated });
      }
    }
  try {
    // 1. 刪除與 userId 相關的 tasks
    const taskSnap = await getDocs(query(collection(db, 'tasks'), where('patient_id', '==', userId)));
    for (const docu of taskSnap.docs) {
      await deleteDoc(doc(db, 'tasks', docu.id));
    }
    // 2. 刪除與 userId 相關的 formAssigned
    const formAssignedSnap = await getDocs(query(collection(db, 'formAssigned'), where('assigned_to', '==', userId)));
    for (const docu of formAssignedSnap.docs) {
      await deleteDoc(doc(db, 'formAssigned', docu.id));
    }
    // 3. 刪除與 userId 相關的 records
    const recordSnap = await getDocs(query(collection(db, 'records'), where('patient_id', '==', userId)));
    for (const docu of recordSnap.docs) {
      await deleteDoc(doc(db, 'records', docu.id));
    }
    // 4. 刪除該 userId 建立的 formData
    const formDataSnap = await getDocs(query(collection(db, 'formData'), where('created_by', '==', userId)));
    for (const docu of formDataSnap.docs) {
      await deleteDoc(doc(db, 'formData', docu.id));
    }

    if (isAdmin) {
      const deleteUserByAdmin = httpsCallable(functions, "deleteUserByAdmin");
      console.log("呼叫 deleteUserByAdmin 參數:", { uid: userId });
      const result = await deleteUserByAdmin({ uid: userId });
      console.log("deleteUserByAdmin 回傳:", result);
      console.log("Admin deleted user:", userId);
      await deleteDoc(doc(db, "users", userId));
    } else {
      const user = auth.currentUser;
      if (!user || user.uid !== userId) {
        throw new Error("只能刪除自己的帳號");
      }
      // 先刪除 Firestore 資料
      await deleteDoc(doc(db, "users", userId));
      // 再刪除 Authentication 資料
      await firebaseDeleteUser(user);
      console.log("User deleted:", userId);
    }
  } catch (error) {
    console.error("User deletion failed:", error.message, error);
    throw new Error("刪除用戶失敗: " + error.message);
  }
}

export async function uploadMedia(file, patientId, type, id, role, questionText = null, extraFolder = null) {
  try {
    const storage = getStorage();
    const sanitizedId = id.replace(/[\/\\#?]/g, '_');
    let folder;

    if (type === 'task') {
      // 支援多一層pose
      if (extraFolder === 'pose') {
        folder = `tasks/${sanitizedId}/${role}/pose`;
      }else if (extraFolder === 'audio') {
        folder = `tasks/${sanitizedId}/${role}/audio`;
      }else if (extraFolder === 'gesture') {
        folder = `tasks/${sanitizedId}/${role}/gesture`;
      }else {
        folder = `tasks/${sanitizedId}/${role}`;
      }
    } else if (type === 'form') {
      if (!questionText) throw new Error('缺少表單題目文字');
      const safeQuestion = questionText.replace(/[\/\\#?]/g, '_');
      folder = `forms/${sanitizedId}/${role}/${safeQuestion}`;
    } else if (type === 'formData') {
      if (!questionText) throw new Error('缺少表單題目文字');
      const safeQuestion = questionText.replace(/[\/\\#?]/g, '_');
      folder = `formData/${sanitizedId}/${role}/${safeQuestion}`;
    } else if (type === 'daily_record') {
      folder = 'DailyRecord';
    } else {
      throw new Error('無效的類型');
    }

    const mediaRef = ref(storage, `media/${patientId}/${folder}/${file.name}`);
    await uploadBytes(mediaRef, file);
    return await getDownloadURL(mediaRef);
  } catch (error) {
    console.error('Media upload failed:', error.message);
    throw new Error('媒體上傳失敗: ' + error.message);
  }
}


export async function submitForm(formId, responses, patientId, mediaFiles = {}, role, submittedBy) {
  try {
    const mediaUrls = {};
   
    for (const questionText in mediaFiles) {
      const files = mediaFiles[questionText];
      console.log("questionText:",questionText)
      if (files && files.length > 0) {
        mediaUrls[questionText] = await Promise.all(
          Array.from(files).map(file =>
            uploadMedia(file, patientId, 'form', formId, role, questionText) // ✅ formId 當 id，題目文字當最後一層
          )
        );
      }
    }
    // 將媒體 URL 加入回應中
    for (const questionText in mediaUrls) {
      responses[questionText] = mediaUrls[questionText];
    }
    const responseData = {
      ...responses,
      role,
      submittedAt: Timestamp.fromDate(new Date())
    };

    await updateDoc(doc(db, 'formAssigned', formId), {
      responses: arrayUnion(responseData)
    });

    console.log('Form submitted for patient:', patientId, 'role:', role, 'submittedBy:', submittedBy);
  } catch (error) {
    console.error('Form submission failed:', error.message);
    throw new Error('表單提交失敗: ' + error.message);
  }
}


export async function submitTaskMedia(taskId, patientId, files, role, submittedBy) {
  try {
    const mediaUrls = await Promise.all(
      Array.from(files).map(file =>
        uploadMedia(file, patientId, 'task', taskId, role)
      )
    );

    await updateDoc(doc(db, 'tasks', taskId), {
      media_url: arrayUnion(...mediaUrls),
      updatedAt: serverTimestamp()
    });

    console.log('Task media submitted for patient:', patientId, 'role:', role, 'submittedBy:', submittedBy);
    return mediaUrls;
  } catch (error) {
    console.error('Task media submission failed:', error.message);
    throw new Error('任務媒體提交失敗: ' + error.message);
  }
}


export async function createForm(formData, userId, creatorRole) {
  try {
    const docRef = await addDoc(collection(db, 'formData'), {
      ...formData,
      created_by: userId,
      created_by_role: creatorRole,
      created_at: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Form creation failed:', error.message);
    throw new Error('表單創建失敗: ' + error.message);
  }
}

export async function updateForm(formId, formData) {
  try {
    await updateDoc(doc(db, 'formData', formId), {
      ...formData,
      updated_at: serverTimestamp(),
    });
    console.log('Form updated:', formId);
  } catch (error) {
    console.error('Form update failed:', error.message);
    throw new Error('表單更新失敗: ' + error.message);
  }
}

export async function getFormsByCreatorRole(roles) {
  try {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    console.log('Current user in getFormsByCreatorRole:', currentUser ? `UID: ${currentUser.uid}` : 'No user');
    if (!currentUser) {
      throw new Error('用戶未登入');
    }
    console.log(`Fetching forms with created_by_role in: ${roles}`);
    const q = query(
      collection(db, 'formData'),
      where('created_by_role', 'in', roles)
    );
    const querySnapshot = await getDocs(q);
    const formList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`Found ${formList.length} forms`, formList);
    return formList;
  } catch (error) {
    console.error('Fetching forms failed:', error.code, error.message);
    throw new Error('取得表單失敗: ' + error.message);
  }
}

export async function handleSubscibe(user){
  console.log('Subscribe button clicked!');
  if (!user || !user.uid) {
    throw new Error('User is not authenticated.');
  }
  await updateDoc(doc(db, 'users', user.uid), { subscription: true });
  alert('訂閱成功！感謝您的支持。');
}

export async function addDailyRecord(patientId, mediaUrl, role) {
  try {
    const docRef = await addDoc(collection(db, 'records'), {
      patient_id: patientId,
      media_url: mediaUrl,
      role: role,
      createdAt: serverTimestamp(),
      type: 'daily_record'
    });
    console.log('Daily record added with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Failed to add daily record:', error.message);
    throw new Error('新增每日記錄失敗: ' + error.message);
  }
}