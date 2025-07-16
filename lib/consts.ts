export const defaultHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MindSite 1.0</title>
  <link rel="stylesheet" href="styles.css">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="flex flex-col justify-center items-center h-screen overflow-hidden bg-gradient-to-br from-white to-gray-50 font-sans text-center px-6 relative">
  <div class="space-y-4">
    <span class="text-xs rounded-full px-3 py-1 border border-amber-500/20 bg-amber-500/10 text-amber-600 font-semibold shadow-sm">
      🔥 MindSite 1.0 🔥
    </span>
    <h1 class="text-4xl lg:text-6xl font-bold text-gray-800">
      <span class="text-xl lg:text-3xl text-gray-500 block font-medium mb-1">I'm ready to work,</span>
      Ask me anything.
    </h1>
  </div>
  <img src="https://i.ibb.co/SWBVXZF/arrow.png" class="absolute bottom-8 left-8 w-24 rotate-45 animate-bounce-slow" />
  <script src="script.js"></script>
</body>
</html> 
`;

export const defaultCSS = `body {
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
  .animate-bounce-slow {
    animation: bounce 2s infinite;
  }
}`;

export const defaultJS = `console.log("Hello from MindSite!");`;

export const ALLOWED_FILES = ["index.html", "styles.css", "script.js"];
