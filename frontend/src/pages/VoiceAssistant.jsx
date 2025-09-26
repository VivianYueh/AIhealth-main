import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import "./VoiceAssistant.css";

// Remove the redundant MEDICAL_ADVICE_FUNCTION definition since it's now handled on the server
// The JSON structure definition can be kept as a comment for reference

/*
Interface MedicalResponse {
  diagnosis: string;       // 初步診斷建議
  severity: number;        // 嚴重程度 1-5
  recommendation: string;  // 建議處置方式
  warning: string;        // 警示症狀
  followUp: string;       // 後續追蹤建議
}
*/

export default function VoiceAssistant() {
    const { t } = useTranslation();

    const [messages, setMessages] = useState(() => {
        const saved = localStorage.getItem("chatMessages");
        return saved ? JSON.parse(saved) : [];
    });
    const [input, setInput] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [speechStatus, setSpeechStatus] = useState("stopped");
    const [language, setLanguage] = useState("zh-TW");

    const recognitionRef = useRef(null);
    const utteranceRef = useRef(null);
    const chatEndRef = useRef(null);
    // Display welcome message on first load
    useEffect(() => {
        if (messages.length === 0) {
            const welcomeMessage = `👋 歡迎使用AI復健諮詢助手

我可以幫您解答以下類型的問題：

🏥 一般醫療問題
例如：「我每天晚上睡覺時感到胸悶，這是什麼原因？」
     「最近咳嗽一週了，什麼時候該看醫生？」

🔄 關節活動度 (ROM) 評估
例如：「我的右肩膀無法舉高超過90度，有什麼建議？」
     「膝蓋彎曲時有卡卡的感覺，請評估我的關節活動度」

🧠 Brunnstrom 中風恢復分期評估
例如：「我三個月前中風，現在手指可以稍微活動，屬於哪個Brunnstrom階段？」
     「中風後我能抬起手臂但動作不協調，這是第幾期的表現？」
     「請評估我目前的中風恢復狀況：手臂可以抬起，但手指僵硬」

請輸入您的問題，我將盡力為您提供專業建議。`;

            setMessages([{ role: "assistant", content: welcomeMessage }]);
        }
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        localStorage.setItem("chatMessages", JSON.stringify(messages));
    }, [messages]);

    const addMessage = (role, content) => {
        setMessages((prev) => [...prev, { role, content }]);
    };

    const speakText = (text) => {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language;
        utterance.onstart = () => setSpeechStatus("playing");
        utterance.onpause = () => setSpeechStatus("paused");
        utterance.onresume = () => setSpeechStatus("playing");
        utterance.onend = () => setSpeechStatus("stopped");
        utterance.onerror = () => setSpeechStatus("stopped");
        speechSynthesis.speak(utterance);
        utteranceRef.current = utterance;
    };

    const pauseSpeech = () => {
        if (speechSynthesis.speaking && !speechSynthesis.paused) {
            speechSynthesis.pause();
            setSpeechStatus("paused");
        }
    };

    const resumeSpeech = () => {
        if (speechSynthesis.paused) {
            speechSynthesis.resume();
            setSpeechStatus("playing");
        }
    };

    const stopSpeech = () => {
        speechSynthesis.cancel();
        setSpeechStatus("stopped");
    };

    const sendToChatGPT = async () => {
        if (!input.trim() || isLoading) return;
        const userInput = input.trim();
        setInput("");
        addMessage("user", userInput);
        setIsLoading(true);
        addMessage("assistant", "...");

        // Example patient info
        const patientInfo = {
            age: 35,
            gender: "男",
            height: 175,
            weight: 70,
            medicalHistory: "高血壓、家族有糖尿病史",
            allergies: "青黴素過敏",
            medications: "無",
        };

        // 工程師萌兒已經修好功能，請勿再動，若要改請跟萌兒說
        try {
            const recentMessages = messages.slice(-6);
            const conversationHistory = messages
                .filter(
                    (msg) => msg.role === "user" || msg.role === "assistant"
                )
                .slice(-6);

            const res = await fetch("/api/aiMon", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userInput,
                    patientInfo,
                    recentMessages,
                    previousMessages: conversationHistory,
                }),
            });
            if (!res.ok) {
                if (res.status === 429) {
                    throw new Error("API 配額已用完");
                }
                throw new Error("API 回應格式錯誤");
                //throw new Error(error || "請求失敗");
            }
            const { intent, msg, data, error } = await res.json();
            switch (intent) {
                case "NON_MEDICAL":
                    setMessages((prev) => {
                        const updated = [...prev];
                        updated[updated.length - 1] = {
                            role: "assistant",
                            content: msg,
                        };
                        return updated;
                    });

                    speakText(msg);
                    break;
                case "BRUNNSTROM_ASSESSMENT":
                    if (data) {
                        const exercisesList = data.recommendedExercises
                            .map((ex) => `• ${ex}`)
                            .join("\n");

                        const formattedReply = `🧠 Brunnstrom 中風恢復評估

階段: 第 ${data.stage} 期 
目前特徵: ${data.characteristics}
下一階段目標: ${data.nextMilestone}

💪 建議訓練:
${exercisesList}

⚠️ 注意事項:
${data.precautions}`;

                        setMessages((prev) => {
                            const updated = [...prev];
                            updated[updated.length - 1] = {
                                role: "assistant",
                                content: formattedReply,
                                intentType: "BRUNNSTROM_ASSESSMENT", // Store intent type with message
                            };
                            return updated;
                        });

                        speakText(formattedReply);
                    } else {
                        throw new Error("Brunnstrom評估資料解析失敗");
                    }
                    break;
                case "ROM_ASSESSMENT":
                    if (data) {
                        // Format the ROM assessment response
                        const exercisesList = data.recommendedExercises
                            .map((ex) => `• ${ex}`)
                            .join("\n");

                        const formattedReply = `🔄 關節活動度評估
    
    關節: ${data.joint} 
    目前角度: ${data.currentAngle}° 
    正常範圍: ${data.normalRange}
    評估: ${data.assessment}
    
    💪 建議訓練:
    ${exercisesList}
    
    ⚠️ 注意事項:
    ${data.precautions}`;

                        setMessages((prev) => {
                            const updated = [...prev];
                            updated[updated.length - 1] = {
                                role: "assistant",
                                content: formattedReply,
                                intentType: "ROM_ASSESSMENT", // Store intent type with message
                            };
                            return updated;
                        });

                        speakText(formattedReply);
                    } else {
                        throw new Error("ROM評估資料解析失敗");
                    }
                    break;
                case "GENERAL_MEDICAL":
                    if (data) {
                        // Format the response
                        const formattedReply = `初步診斷：${data.diagnosis}
    
    
    嚴重程度：${data.severity}/5
    
    建議處置：${data.recommendation}
    
    警示症狀：${data.warning}
    
    後續追蹤：${data.followUp}`;
                        setMessages((prev) => {
                            const updated = [...prev];
                            updated[updated.length - 1] = {
                                role: "assistant",
                                content: formattedReply,
                                intentType: "GENERAL_MEDICAL", // Store intent type with message
                            };
                            return updated;
                        });

                        speakText(formattedReply);
                    } else {
                        throw new Error("回應資料驗證失敗");
                    }
                    break;
                default:
                    console.log("Routing to general medical advice API");
                    break;
            }
        } catch (err) {
            // Check if it's an OpenAI API quota error
            const isQuotaError = err.message.includes("API 配額已用完");

            let errorMsg =
                "很抱歉，我無法正確理解您的症狀。請重新描述或直接尋求醫生協助。";

            // If we detect a quota error, show a more specific message
            if (isQuotaError) {
                errorMsg =
                    "很抱歉，AI服務目前已達到使用限制。請稍後再試或聯絡系統管理員。";
            }

            setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                    role: "assistant",
                    content: errorMsg,
                };
                return updated;
            });
            speakText(errorMsg);
        }
        setIsLoading(false);
    };

    const startRecording = async () => {
        setErrorMessage("");
        const SpeechRecognition =
            window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setErrorMessage(t("error_unsupported"));
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = language;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setInput(transcript);
        };

        recognition.onerror = (event) => {
            setErrorMessage(`${t("error_recognition")}${event.error}`);
        };

        recognition.onend = () => setIsRecording(false);

        recognitionRef.current = recognition;
        recognition.start();
        setIsRecording(true);
    };

    const stopRecording = () => {
        recognitionRef.current?.stop();
        setIsRecording(false);
    };

    const clearChat = () => {
        setMessages([]);
        localStorage.removeItem("chatMessages");
        // Add the welcome message back
        setTimeout(() => {
            const welcomeMessage = `👋 歡迎使用AI復健諮詢助手

我可以幫您解答以下類型的問題：

🏥 一般醫療問題
例如：「我每天晚上睡覺時感到胸悶，這是什麼原因？」
     「最近咳嗽一週了，什麼時候該看醫生？」

🔄 關節活動度 (ROM) 評估
例如：「我的右肩膀無法舉高超過90度，有什麼建議？」
     「膝蓋彎曲時有卡卡的感覺，請評估我的關節活動度」

🧠 Brunnstrom 中風恢復分期評估
例如：「我三個月前中風，現在手指可以稍微活動，屬於哪個Brunnstrom階段？」
     「中風後我能抬起手臂但動作不協調，這是第幾期的表現？」
     「請評估我目前的中風恢復狀況：手臂可以抬起，但手指僵硬」

請輸入您的問題，我將盡力為您提供專業建議。`;

            setMessages([{ role: "assistant", content: welcomeMessage }]);
        }, 100);
    };

    return (
        <div
            className="container my-5 d-flex flex-column"
            style={{ height: "80vh", fontSize: "20px" }}>
            <h2 className="text-center mb-3 fw-bold">{t("voice_assistant")}</h2>

            <div className="d-flex justify-content-center mb-3">
                <select
                    className="form-select w-auto me-2"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}>
                    <option value="zh-TW">{t("language_zh")}</option>
                    <option value="en-US">{t("language_en")}</option>
                </select>
                <button className="btn btn-outline-danger" onClick={clearChat}>
                    {t("clear_chat")}
                </button>
            </div>

            <div className="flex-grow-1 p-3 border rounded bg-light overflow-auto">
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`d-flex ${
                            msg.role === "user"
                                ? "justify-content-end"
                                : "justify-content-start"
                        } mb-3`}>
                        <div
                            className={`p-3 rounded ${
                                msg.role === "user"
                                    ? "bg-primary text-white"
                                    : "bg-white text-dark"
                            }`}
                            style={{ maxWidth: "75%", whiteSpace: "pre-wrap" }}>
                            {msg.content === "..." && isLoading ? (
                                <span className="text-muted">
                                    {t("ai_replying")}
                                </span>
                            ) : (
                                msg.content
                            )}
                        </div>
                    </div>
                ))}
                <div ref={chatEndRef}></div>
            </div>

            {errorMessage && (
                <div className="text-danger mt-3 fw-bold text-center">
                    {errorMessage}
                </div>
            )}

            {input && !isLoading && (
                <div className="text-muted small mt-2 text-center">
                    {t("voice_input_notice")}
                </div>
            )}

            <div className="input-group mt-3 align-items-center">
                <input
                    className="form-control"
                    placeholder={t("input_placeholder")}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendToChatGPT()}
                />
                <button
                    className={`btn ${
                        isRecording ? "btn-danger" : "btn-success"
                    }`}
                    onClick={isRecording ? stopRecording : startRecording}>
                    {isRecording ? t("stop_recording") : t("start_recording")}
                </button>
                {isRecording && (
                    <div
                        className="recording-indicator"
                        title={t("start_recording")}></div>
                )}
                <button className="btn btn-primary" onClick={sendToChatGPT}>
                    {t("send_button")}
                </button>
            </div>

            <div className="mt-3 d-flex justify-content-center gap-2 align-items-center flex-wrap">
                <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={pauseSpeech}>
                    {t("pause_button")}
                </button>
                <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={resumeSpeech}>
                    {t("resume_button")}
                </button>
                <button
                    className="btn btn-outline-danger btn-sm"
                    onClick={stopSpeech}>
                    {t("stop_button")}
                </button>
                <span className="ms-2 small text-muted">
                    {t("status")}:&nbsp;
                    {speechStatus === "playing" && t("status_playing")}
                    {speechStatus === "paused" && t("status_paused")}
                    {speechStatus === "stopped" && t("status_stopped")}
                </span>
            </div>
        </div>
    );
}
