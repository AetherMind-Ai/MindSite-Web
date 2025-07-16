export const PROVIDERS = {
  "google-genai": {
    name: "Google GenAI",
    max_tokens: 1_000_000, // Gemini 2.5 Flash has 1M token context window
    id: "google-genai",
  },
};


export const MODELS = [
  {
    value: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro (Reasoner)",
    providers: ["google-genai"],
    autoProvider: "google-genai",
    id: "gemini-2.5-pro",
    isReasoner: true,
  },
  {
    value: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    providers: ["google-genai"],
    autoProvider: "google-genai",
    id: "gemini-2.5-flash",
  },
  {
    value: "mindbot-1.7",
    label: "MindBot 1.7",
    providers: ["google-genai"],
    autoProvider: "google-genai",
    id: "mindbot-1.7",
  },
  {
    value: "mindthink-a2",
    label: "MindThink-A2",
    providers: ["google-genai"],
    autoProvider: "google-genai",
    id: "mindthink-a2",
    isReasoner: true,
  },
  {
    value: "gpt-4o",
    label: "GPT-4o",
    providers: ["google-genai"],
    autoProvider: "google-genai",
    id: "gpt-4o",
  },
  {
    value: "gpt-4o-mini",
    label: "GPT-4o Mini",
    providers: ["google-genai"],
    autoProvider: "google-genai",
    id: "gpt-4o-mini",
  },
  {
    value: "gpt-3.5-turbo",
    label: "GPT-3.5 Turbo",
    providers: ["google-genai"],
    autoProvider: "google-genai",
    id: "gpt-3.5-turbo",
  },
];
