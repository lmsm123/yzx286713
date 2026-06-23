export enum TimeOfDay {
  DAWN = "DAWN",       // 晨曦
  NOON = "NOON",       // 午间
  GOLDEN = "GOLDEN",   // 夕朝 / 暮色
  NIGHT = "NIGHT",     // 烟夜
}

export interface AtmosphereConfig {
  windSpeed: number;       // 风速 (0 to 1) affecting willow sway and mist drift
  windAngle: number;       // 风向角度 (in radians, e.g. 0 is left-to-right, Math.PI is right-to-left)
  mistDensity: number;     // 云雾密度 (0 to 1) affecting fog opacity/quantity
  mistSpeed: number;       // 云雾流动速度 (0 to 1)
  timeOfDay: TimeOfDay;    // 画面时辰/色调
  rainIntensity: number;   // 细雨强度 (0 to 1) for atmospheric spring drizzling
  horseState: "alert" | "grazing" | "drinking" | "moving"; // 白马状态
  soundscapesEnabled: boolean;
}

export interface InkStroke {
  id: string;
  points: { x: number; y: number; pressure: number }[];
  color: string;
  width: number;
  alpha: number;
}

export interface PoemAnalysis {
  text: string;           // 诗句文本
  translation: string;    // 诗意赏析/翻译
  mood: string;           // 意境解析 (e.g. 悲凉, 旷达, 宁静)
  recommendations: {      // AI建议的场景参数
    windSpeed: number;
    windAngle: number;
    mistDensity: number;
    mistSpeed: number;
    timeOfDay: TimeOfDay;
    rainIntensity: number;
    horseState: "alert" | "grazing" | "drinking";
  };
}
