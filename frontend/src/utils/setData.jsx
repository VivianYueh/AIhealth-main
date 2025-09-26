import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";

export async function seedTestData(doctorUid, patientUid, caregiverUid, therapistUid) {
  try {
    // ✅ 建立一筆任務
    const taskRef = await addDoc(collection(db, "tasks"), {
      patient_id: patientUid,
      description: "每天早晚測血壓並上傳照片",
      doctor_id: doctorUid,
      status: "pending",
      created_at: new Date().toISOString(),
      media_required: true,
      media_url: "",
      caregiver_id: caregiverUid,
      assigned_staff_ids: [therapistUid]
    });
    console.log("測試 Task 建立成功:", taskRef.id);

    // ✅ 建立一筆表單
    const formRef = await addDoc(collection(db, "forms"), {
      title: "每日健康狀況表",
      questions: [
        {
          type: "single_choice",
          text: "今天有沒有頭暈？",
          options: ["沒有", "輕微", "嚴重"],
          required: true
        },
        {
          type: "text",
          text: "今天服用了什麼藥物？",
          required: false
        },
        {
          type: "media_upload",
          text: "上傳血壓計照片",
          required: false
        }
      ],
      created_by: "system_admin_uid_123", // 測試用 admin UID
      created_by_role: "system_admin",
      created_at: serverTimestamp(),
      assigned_to: patientUid,
      assigned_at: new Date().toISOString(),
      patient_id: patientUid
    });
    console.log("測試 Form 建立成功:", formRef.id);

    // ✅ 建立一筆表單回應
    // 注意 responses 是 forms/{formId}/responses/{patientUid}
    const responseRef = await addDoc(collection(db, `forms/${formRef.id}/responses`), {
      responses: {
        media: ["https://example.com/photo1.png"],
        "今天有沒有頭暈？": "輕微",
        "今天服用了什麼藥物？": "降壓藥"
      },
      submittedAt: serverTimestamp()
    });
    console.log("測試 Form 回應建立成功:", responseRef.id);

  } catch (err) {
    console.error("建立測試資料失敗:", err.message);
  }
}
