import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import fetch from 'node-fetch'
import multer from 'multer'
import fs from 'fs'
import FormData from 'form-data'
import ffmpeg from 'fluent-ffmpeg'
import path from 'path'

dotenv.config()

const app = express()
const PORT = 3001
const upload = multer({ dest: 'uploads/' })

app.use(cors())
app.use(express.json())

// 🔹 Chat API Proxy to GPT-4o-mini
app.post('/api/chat', async (req, res) => {
  const { messages, functions, function_call } = req.body
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: '缺少 messages 參數或格式錯誤' })
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        temperature: 0.7,
        functions: functions || undefined,
        function_call: function_call || undefined
      })
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('❌ OpenAI API 錯誤：', data)
      return res.status(response.status).json({ error: data.error?.message || 'OpenAI 錯誤' })
    }

    console.log('OpenAI Response:', JSON.stringify(data, null, 2))
    console.log('Function Call:', data.choices?.[0]?.message?.function_call)

    res.status(200).json({ choices: data.choices })
  } catch (err) {
    console.error('❌ Server 錯誤：', err)
    res.status(500).json({ error: '伺服器錯誤，請稍後再試' })
  }
})

// 🔹 Audio Transcription Proxy to Whisper API with ffmpeg conversion
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  try {
    const originalPath = req.file.path
    const mp3Path = path.join('uploads', req.file.filename + '.mp3')

    await new Promise((resolve, reject) => {
      ffmpeg(originalPath)
        .toFormat('mp3')
        .on('error', reject)
        .on('end', resolve)
        .save(mp3Path)
    })

    const formData = new FormData()
    formData.append('file', fs.createReadStream(mp3Path))
    formData.append('model', 'whisper-1')

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: formData
    })

    const data = await response.json()
    fs.unlinkSync(originalPath)
    fs.unlinkSync(mp3Path)

    if (!response.ok) {
      console.error('❌ Whisper API 錯誤：', data)
      return res.status(response.status).json({ error: data.error?.message || 'Whisper 錯誤' })
    }

    res.status(200).json({ text: data.text })
  } catch (err) {
    console.error('❌ Whisper Server 錯誤：', err)
    res.status(500).json({ error: '語音轉換失敗' })
  }
})

// 🔹 New Medical Advice Endpoint - Specialized for function calling
app.post('/api/medical-advice', async (req, res) => {
  const { userInput, patientInfo, previousMessages } = req.body
  
  if (!userInput) {
    return res.status(400).json({ error: '缺少 userInput 參數' })
  }
  
  // Define the medical advice function structure
  const MEDICAL_ADVICE_FUNCTION = {
    name: 'getMedicalAdvice',
    description: '回傳結構化的醫療建議',
    parameters: {
      type: 'object',
      properties: {
        diagnosis: {
          type: 'string',
          description: '初步診斷建議，3-4句話說明'
        },
        severity: {
          type: 'number',
          description: '嚴重程度 1-5，1為輕微，5為需要立即就醫',
          minimum: 1,
          maximum: 5
        },
        recommendation: {
          type: 'string',
          description: '具體的建議處置方式'
        },
        warning: {
          type: 'string',
          description: '需要立即就醫的警示症狀'
        },
        followUp: {
          type: 'string',
          description: '後續追蹤建議'
        }
      },
      required: ['diagnosis', 'severity', 'recommendation', 'warning', 'followUp']
    }
  }

  // Create the system prompt with appropriate context
  let systemPrompt = `
你是一位專業的家庭醫師，專長於初步症狀評估。請使用函數回傳結構化的醫療建議。

請注意：
1. 回答要以繁體中文呈現
2. 態度要親切但專業
3. 建議要具體可執行
4. 若遇到無法透過遠距診斷的狀況，請建議盡快就醫
5. 若症狀可能危及生命，請務必提醒立即就醫
6. 請記住並參考用戶之前提供的症狀資訊，給予連貫的建議
`.trim()

  // Add patient information to the prompt if available
  if (patientInfo) {
    let patientInfoText = '\n\n患者基本資料：\n';
    
    if (patientInfo.age) patientInfoText += `年齡：${patientInfo.age}歲\n`;
    if (patientInfo.gender) patientInfoText += `性別：${patientInfo.gender}\n`;
    if (patientInfo.height) patientInfoText += `身高：${patientInfo.height}公分\n`;
    if (patientInfo.weight) patientInfoText += `體重：${patientInfo.weight}公斤\n`;
    if (patientInfo.medicalHistory) patientInfoText += `病史：${patientInfo.medicalHistory}\n`;
    if (patientInfo.allergies) patientInfoText += `過敏史：${patientInfo.allergies}\n`;
    if (patientInfo.medications) patientInfoText += `當前用藥：${patientInfo.medications}\n`;
    
    systemPrompt += patientInfoText;
    systemPrompt += '\n請根據上述患者資料，提供更精確的醫療建議。';
  }

  try {
    // Build message array with conversation history
    const messages = [
      { role: 'system', content: systemPrompt }
    ];
    
    // Add previous messages if they exist, limited to a reasonable number (e.g., last 10)
    if (previousMessages && Array.isArray(previousMessages) && previousMessages.length > 0) {
      // Only keep most recent messages to avoid token limits
      const recentMessages = previousMessages.slice(-10);
      messages.push(...recentMessages);
    }
    
    // Add the current user input
    messages.push({ role: 'user', content: userInput });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: messages, // Use the context-aware messages array
        temperature: 0.7,
        functions: [MEDICAL_ADVICE_FUNCTION],
        function_call: { name: 'getMedicalAdvice' }
      })
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('❌ OpenAI API 錯誤：', data)
      
      // Check for quota exceeded error
      if (data.error && data.error.includes('exceeded your current quota')) {
        return res.status(429).json({ 
          error: 'API quota exceeded', 
          message: '已超過 OpenAI API 使用限額，請聯絡管理員充值或等待下個計費週期。',
          details: data.error
        })
      }
      
      return res.status(response.status).json({ error: data.error?.message || 'OpenAI 錯誤' })
    }

    const functionCall = data.choices?.[0]?.message?.function_call
    
    if (!functionCall || !functionCall.arguments) {
      return res.status(422).json({ 
        error: '未收到預期的函數呼叫回應',
        raw_response: data 
      })
    }

    try {
      // Parse the function arguments
      const medicalAdvice = JSON.parse(functionCall.arguments)
      return res.status(200).json({ medicalAdvice })
    } catch (parseError) {
      console.error('❌ 解析函數參數錯誤：', parseError)
      return res.status(422).json({ 
        error: '無法解析函數回應',
        raw_arguments: functionCall.arguments
      })
    }
  } catch (err) {
    console.error('❌ Server 錯誤：', err)
    res.status(500).json({ error: '伺服器錯誤，請稍後再試' })
  }
})
// 🔹 ROM (Range of Motion) Assessment Endpoint
app.post('/api/rom-assessment', async (req, res) => {
  const { userInput, patientInfo } = req.body;
  
  if (!userInput) {
    return res.status(400).json({ error: '缺少輸入參數' });
  }
  
  // Define the ROM assessment function
  const ROM_ASSESSMENT_FUNCTION = {
    name: 'assessRangeOfMotion',
    description: '評估關節活動度並提供建議',
    parameters: {
      type: 'object',
      properties: {
        joint: {
          type: 'string',
          description: '關節名稱 (例如：肩、肘、腕、髖、膝、踝)'
        },
        currentAngle: {
          type: 'number',
          description: '目前估計的活動角度 (度)'
        },
        normalRange: {
          type: 'string',
          description: '該關節的正常活動範圍'
        },
        assessment: {
          type: 'string',
          description: '活動度狀態評估 (例如：受限、正常、過度活動)'
        },
        recommendedExercises: {
          type: 'array',
          items: {
            type: 'string'
          },
          description: '建議的恢復訓練動作'
        },
        precautions: {
          type: 'string',
          description: '需要注意的事項'
        }
      },
      required: ['joint', 'currentAngle', 'normalRange', 'assessment', 'recommendedExercises', 'precautions']
    }
  };

  // Create system prompt
  const systemPrompt = `
你是一位專業的物理治療師，專長於關節活動度(ROM)評估。
請根據用戶描述的關節問題，使用函數回傳結構化的評估結果。

請考慮以下因素：
1. 關節活動度的正常範圍因關節而異
2. 提供實用且安全的練習建議
3. 評估是初步的，需要依據更多臨床資訊調整

注意：所有回覆必須以繁體中文呈現。
`.trim();

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userInput }
        ],
        functions: [ROM_ASSESSMENT_FUNCTION],
        function_call: { name: 'assessRangeOfMotion' }
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ OpenAI API 錯誤：', data);
      return res.status(response.status).json({ error: data.error?.message || 'OpenAI 錯誤' });
    }

    const functionCall = data.choices?.[0]?.message?.function_call;
    
    if (!functionCall || !functionCall.arguments) {
      return res.status(422).json({ 
        error: '未收到預期的函數呼叫回應',
        raw_response: data 
      });
    }

    try {
      // Parse the function arguments
      const romAssessment = JSON.parse(functionCall.arguments);
      return res.status(200).json({ romAssessment });
    } catch (parseError) {
      console.error('❌ 解析函數參數錯誤：', parseError);
      return res.status(422).json({ 
        error: '無法解析函數回應',
        raw_arguments: functionCall.arguments
      });
    }
  } catch (err) {
    console.error('❌ Server 錯誤：', err);
    res.status(500).json({ error: '伺服器錯誤，請稍後再試' });
  }
});

// 🔹 Brunnstrom Stage Assessment Endpoint
app.post('/api/brunnstrom-assessment', async (req, res) => {
  const { userInput, patientInfo } = req.body;
  
  if (!userInput) {
    return res.status(400).json({ error: '缺少輸入參數' });
  }
  
  // Define the Brunnstrom assessment function
  const BRUNNSTROM_ASSESSMENT_FUNCTION = {
    name: 'assessBrunnstromStage',
    description: '評估中風後動作恢復的Brunnstrom分期',
    parameters: {
      type: 'object',
      properties: {
        stage: {
          type: 'number',
          description: 'Brunnstrom分期 (1-7)',
          minimum: 1,
          maximum: 7
        },
        characteristics: {
          type: 'string',
          description: '該階段的典型表現特徵'
        },
        nextMilestone: {
          type: 'string',
          description: '下一階段的目標'
        },
        recommendedExercises: {
          type: 'array',
          items: {
            type: 'string'
          },
          description: '此階段建議的訓練活動'
        },
        precautions: {
          type: 'string',
          description: '此階段需要注意的事項'
        }
      },
      required: ['stage', 'characteristics', 'nextMilestone', 'recommendedExercises', 'precautions']
    }
  };

  // Create system prompt
  const systemPrompt = `
你是一位專精於中風後動作恢復評估的物理治療師，擅長Brunnstrom分期評估。
請根據用戶描述的動作表現，使用函數回傳結構化的評估結果。

Brunnstrom分期詳細介紹：
Stage 1 (極度痙攣期): 完全無法主動運動，可能出現肢體癱瘓，無反射反應
Stage 2 (協同性出現期): 開始出現基本的協同運動模式，痙攣增加，出現異常反射
Stage 3 (協同性控制期): 患者可主動控制協同運動，但動作仍受限於協同模式，痙攣強度達最高點，開始減輕
Stage 4 (協同性脫離初期): 出現部分脫離協同運動的能力，可以做出一些混合的動作模式
Stage 5 (協同性脫離中期): 協同運動模式進一步減弱，更複雜的動作和獨立關節運動開始出現
Stage 6 (協同性脫離末期): 協同模式消失，關節可獨立運動，協調性和動作控制明顯改善
Stage 7 (恢復期): 接近或恢復正常功能，動作品質接近中風前

注意：評估必須非常謹慎且專業，考慮描述的所有動作細節。
若用戶提供的資訊不足以確定精確分期，請合理推測，並在precautions中說明需要進一步評估。

所有回覆必須以繁體中文呈現。
`.trim();

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userInput }
        ],
        functions: [BRUNNSTROM_ASSESSMENT_FUNCTION],
        function_call: { name: 'assessBrunnstromStage' }
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ OpenAI API 錯誤：', data);
      return res.status(response.status).json({ error: data.error?.message || 'OpenAI 錯誤' });
    }

    const functionCall = data.choices?.[0]?.message?.function_call;
    
    if (!functionCall || !functionCall.arguments) {
      return res.status(422).json({ 
        error: '未收到預期的函數呼叫回應',
        raw_response: data 
      });
    }

    try {
      // Parse the function arguments
      const brunnstromAssessment = JSON.parse(functionCall.arguments);
      return res.status(200).json({ brunnstromAssessment });
    } catch (parseError) {
      console.error('❌ 解析函數參數錯誤：', parseError);
      return res.status(422).json({ 
        error: '無法解析函數回應',
        raw_arguments: functionCall.arguments
      });
    }
  } catch (err) {
    console.error('❌ Server 錯誤：', err);
    res.status(500).json({ error: '伺服器錯誤，請稍後再試' });
  }
});
app.listen(PORT, () => {
  console.log(`✅ 本地 GPT+Whisper proxy server 啟動於 http://localhost:${PORT}`)
})
