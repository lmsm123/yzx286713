import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

// Load local environment variables
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());

  // Initialize server-side Gemini API client
  const geminiApiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;
  
  if (geminiApiKey) {
    ai = new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });
  }

  // API 1: Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", mode: process.env.NODE_ENV });
  });

  // API 2: Gemini Poetry and Mood Interpreter
  app.post("/api/gemini/interpret", async (req, res) => {
    const { poem } = req.body;
    
    if (!poem || typeof poem !== "string") {
      return res.status(400).json({ error: "Poem query string is required." });
    }

    if (!ai) {
      // Graceful fallback for missing key, letting the user proceed with local mood settings
      return res.status(503).json({
        error: "Gemini API key is not configured in the Secrets panel. Please check .env or Secrets.",
        isFallback: true
      });
    }

    try {
      // Craft structured interpretation prompt for the shanshui atmosphere
      const prompt = `你是一位精通国画、书画美学以及古典文学的国画宗师与文学泰斗。
请分析并拆解输入诗词或环境意境所蕴含的画意，输出格式必须严格符合指定的 JSON Schema 格式。

输入诗句/意境：
"${poem}"

请根据诗词描绘的画面：
1. 阐释诗意（translation - 简要生动的现代散文诗意翻译，限120字内）
2. 提炼情绪/美学风格（mood - 简短的形容词，例如：深黛寂寥、清旷高洁、暖阳春和，限10字内）
3. 推荐山水画画境推荐配置：
   - windSpeed (风速，数值 0.0 到 1.0；大风对应狂风卷柳、狂云奔涌；无风对应柳丝垂静、云雾舒缓)
   - windAngle (风向，可选 0 ［从左往右］ 或 3.14 ［从右往左］)
   - mistDensity (云雾密度，数值 0.0 到 1.0；深远意境需要大量水墨留白和云雾缭绕)
   - mistSpeed (云雾漫卷速度，数值 0.0 到 1.0)
   - timeOfDay (时辰雅色，可选：DAWN [拂晓/晨曦]、NOON [明媚/午间宣纸黄]、GOLDEN [夕照/琥珀秋金]、NIGHT [烟夜/深黛明月])
   - rainIntensity (细雨春雷强度，数值 0.0 到 1.0；如诗中有细雨、清溪、秋雨等则拉高配置，无雨则设为 0)
   - horseState (白马动静，可选：alert [警觉/昂首看湖]、grazing [草地漫步]、drinking [饮水涟漪次生])`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          temperature: 0.7,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              text: {
                type: Type.STRING,
                description: "原始输入的诗句或修饰语"
              },
              translation: {
                type: Type.STRING,
                description: "古典意境的现代雅致散文诗解读"
              },
              mood: {
                type: Type.STRING,
                description: "意境情绪词，富有古典文学美感"
              },
              recommendations: {
                type: Type.OBJECT,
                properties: {
                  windSpeed: { type: Type.NUMBER, description: "建议风速 0.0 到 1.0" },
                  windAngle: { type: Type.NUMBER, description: "建议风向弧度，0 或 3.14" },
                  mistDensity: { type: Type.NUMBER, description: "建议云雾密度 0.0 到 1.0" },
                  mistSpeed: { type: Type.NUMBER, description: "建议云雾漫卷速度 0.0 到 1.0" },
                  timeOfDay: { 
                    type: Type.STRING, 
                    enum: ["DAWN", "NOON", "GOLDEN", "NIGHT"],
                    description: "时态色调，必须为 DAWN, NOON, GOLDEN, NIGHT 之一"
                  },
                  rainIntensity: { type: Type.NUMBER, description: "雨强度建议值 0.0 到 1.0" },
                  horseState: {
                    type: Type.STRING,
                    enum: ["alert", "grazing", "drinking"],
                    description: "白马状态，必须为 alert, grazing, drinking 之一"
                  }
                },
                required: ["windSpeed", "windAngle", "mistDensity", "mistSpeed", "timeOfDay", "rainIntensity", "horseState"]
              }
            },
            required: ["text", "translation", "mood", "recommendations"]
          }
        }
      });

      const jsonString = response.text ? response.text.trim() : "";
      try {
        const result = JSON.parse(jsonString);
        res.json(result);
      } catch (jsonErr) {
        console.error("Failed to parse AI response json string:", jsonString, jsonErr);
        res.status(500).json({ error: "AI returned invalid JSON formatting. Try again." });
      }

    } catch (err: any) {
      console.error("Gemini Poetry AI error:", err);
      res.status(500).json({ error: err.message || "Failed to communicate with poetic mind." });
    }
  });

  // Hot Module Replacement (HMR) and Static Serving Integration
  if (process.env.NODE_ENV !== "production") {
    // Mounting Vite for local development in container mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Dist folder path resolution
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`墨境山水 express server starts on http://localhost:${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
  });
}

startServer();
