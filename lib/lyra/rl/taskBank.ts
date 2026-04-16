export interface BenchmarkTask {
  id: string;
  category: "research" | "content" | "code" | "multi_tool" | "memory";
  task: string;
  check: (response: string) => boolean;
  expectedKeywords: string[];
}

export const TASK_BANK: BenchmarkTask[] = [
  // RESEARCH (10 tasks)
  { id: "r01", category: "research", task: "What is the current year?", check: r => r.includes("2026"), expectedKeywords: ["2026"] },
  { id: "r02", category: "research", task: "What does CPU stand for?", check: r => /central processing unit/i.test(r), expectedKeywords: ["central processing unit"] },
  { id: "r03", category: "research", task: "What is the speed of light in km/s?", check: r => r.includes("299") || r.includes("300,000"), expectedKeywords: ["299792"] },
  { id: "r04", category: "research", task: "Who founded OpenAI?", check: r => /elon musk|sam altman|greg brockman|ilya sutskever/i.test(r), expectedKeywords: ["OpenAI founders"] },
  { id: "r05", category: "research", task: "What does LLM stand for in AI?", check: r => /large language model/i.test(r), expectedKeywords: ["large language model"] },
  { id: "r06", category: "research", task: "What is the capital of France?", check: r => /paris/i.test(r), expectedKeywords: ["Paris"] },
  { id: "r07", category: "research", task: "What programming language is Next.js written in?", check: r => /javascript|typescript/i.test(r), expectedKeywords: ["JavaScript", "TypeScript"] },
  { id: "r08", category: "research", task: "What does API stand for?", check: r => /application programming interface/i.test(r), expectedKeywords: ["application programming interface"] },
  { id: "r09", category: "research", task: "What is machine learning in one sentence?", check: r => r.length > 30 && /learn|data|model|train/i.test(r), expectedKeywords: ["learn", "data", "model"] },
  { id: "r10", category: "research", task: "What year was GPT-3 released?", check: r => r.includes("2020"), expectedKeywords: ["2020"] },

  // CONTENT (10 tasks)
  { id: "c01", category: "content", task: "Write a one-sentence tagline for an AI productivity app.", check: r => r.length > 10 && r.length < 200, expectedKeywords: ["AI", "productivity"] },
  { id: "c02", category: "content", task: "Write a haiku about artificial intelligence.", check: r => r.split("\n").length >= 3, expectedKeywords: ["haiku", "3 lines"] },
  { id: "c03", category: "content", task: "List 3 benefits of using AI in business.", check: r => /1\.|2\.|3\.|-|•/.test(r) || (r.match(/\n/g) ?? []).length >= 2, expectedKeywords: ["3 benefits"] },
  { id: "c04", category: "content", task: "Write a short tweet (under 280 chars) promoting a new AI product.", check: r => r.replace(/\s/g, "").length <= 280, expectedKeywords: ["tweet", "280 chars"] },
  { id: "c05", category: "content", task: "Explain what a neural network is to a 10-year-old.", check: r => r.length > 50 && !/jargon|gradient|backprop/i.test(r), expectedKeywords: ["simple explanation"] },
  { id: "c06", category: "content", task: "Write a professional email subject line for a product launch.", check: r => r.length > 5 && r.length < 100, expectedKeywords: ["subject line"] },
  { id: "c07", category: "content", task: "Give 3 tips for writing better prompts for AI.", check: r => r.length > 50, expectedKeywords: ["prompts", "tips"] },
  { id: "c08", category: "content", task: "Write a one-paragraph product description for an AI assistant.", check: r => r.length > 100, expectedKeywords: ["product description"] },
  { id: "c09", category: "content", task: "Summarize the concept of reinforcement learning in 2 sentences.", check: r => r.length > 50 && /reward|agent|environment|learn/i.test(r), expectedKeywords: ["reward", "agent"] },
  { id: "c10", category: "content", task: "Write a catchy name for a smart home AI system.", check: r => r.length > 0 && r.length < 100, expectedKeywords: ["name"] },

  // CODE (10 tasks)
  { id: "k01", category: "code", task: "Write a TypeScript function that returns the sum of two numbers.", check: r => /function|=>|return/.test(r) && /number|num/i.test(r), expectedKeywords: ["function", "return", "sum"] },
  { id: "k02", category: "code", task: "Write a Python one-liner to reverse a string.", check: r => /\[::-1\]|reversed/.test(r), expectedKeywords: ["[::-1]"] },
  { id: "k03", category: "code", task: "Write a JavaScript function to check if a number is even.", check: r => /% 2|modulo|remainder/i.test(r), expectedKeywords: ["% 2", "even"] },
  { id: "k04", category: "code", task: "Write a SQL query to select all users from a users table.", check: r => /SELECT.*FROM.*users/i.test(r), expectedKeywords: ["SELECT", "FROM", "users"] },
  { id: "k05", category: "code", task: "Write a regex to match a valid email address.", check: r => r.includes("@") && (r.includes("regex") || r.includes("/") || r.includes("pattern")), expectedKeywords: ["@", "regex"] },
  { id: "k06", category: "code", task: "Write a TypeScript interface for a User with id, name, and email fields.", check: r => /interface.*User|id.*string|name.*string|email.*string/i.test(r), expectedKeywords: ["interface", "User"] },
  { id: "k07", category: "code", task: "Write a JavaScript async function that fetches data from a URL.", check: r => /async|await|fetch/.test(r), expectedKeywords: ["async", "await", "fetch"] },
  { id: "k08", category: "code", task: "Write a Python function to calculate factorial recursively.", check: r => /def.*factorial|recursive|n \* |n\*/.test(r), expectedKeywords: ["factorial", "recursive"] },
  { id: "k09", category: "code", task: "Write a CSS class to center a div both horizontally and vertically.", check: r => /flex|grid|margin.*auto|transform/i.test(r), expectedKeywords: ["flexbox", "center"] },
  { id: "k10", category: "code", task: "Write a bash command to list all files in a directory sorted by size.", check: r => /ls.*-|du |sort/.test(r), expectedKeywords: ["ls", "sort"] },

  // MULTI-TOOL (10 tasks)
  { id: "m01", category: "multi_tool", task: "What is 15% of 847? Show your calculation.", check: r => /127|127\.05|126\.9/i.test(r.replace(/,/g, "")), expectedKeywords: ["127.05"] },
  { id: "m02", category: "multi_tool", task: "Convert 100 USD to a rough estimate of EUR (use approximate rate).", check: r => /€|euro|eur/i.test(r) && /\d{2,}/.test(r), expectedKeywords: ["EUR", "euros"] },
  { id: "m03", category: "multi_tool", task: "How many days are there in 3 years (assume non-leap)?", check: r => /1095/.test(r.replace(/,/g, "")), expectedKeywords: ["1095"] },
  { id: "m04", category: "multi_tool", task: "What is the square root of 144?", check: r => /\b12\b/.test(r), expectedKeywords: ["12"] },
  { id: "m05", category: "multi_tool", task: "If I have 5 apples and give away 2, then buy 3 more, how many do I have?", check: r => /\b6\b/.test(r), expectedKeywords: ["6"] },
  { id: "m06", category: "multi_tool", task: "What is the area of a circle with radius 5? Use pi = 3.14159.", check: r => /78\.5|78\.53|78\.54/.test(r.replace(/,/g, "")), expectedKeywords: ["78.54"] },
  { id: "m07", category: "multi_tool", task: "Calculate compound interest: $1000 at 5% for 2 years.", check: r => /1102|1103|1,102|1,103/.test(r.replace(/\s/g, "")), expectedKeywords: ["1102.50"] },
  { id: "m08", category: "multi_tool", task: "How many seconds are in a day?", check: r => /86400|86,400/.test(r.replace(/,/g, "")), expectedKeywords: ["86400"] },
  { id: "m09", category: "multi_tool", task: "What is 2 to the power of 10?", check: r => /\b1024\b/.test(r), expectedKeywords: ["1024"] },
  { id: "m10", category: "multi_tool", task: "If a car travels at 60 mph for 2.5 hours, how far does it travel?", check: r => /\b150\b/.test(r), expectedKeywords: ["150 miles"] },

  // MEMORY (10 tasks)
  { id: "mem01", category: "memory", task: "My name is Alex. What is my name?", check: r => /alex/i.test(r), expectedKeywords: ["Alex"] },
  { id: "mem02", category: "memory", task: "The password is BLUE42. Repeat the password I just told you.", check: r => /BLUE42|blue42/i.test(r), expectedKeywords: ["BLUE42"] },
  { id: "mem03", category: "memory", task: "I prefer Python over JavaScript. Which language do I prefer?", check: r => /python/i.test(r), expectedKeywords: ["Python"] },
  { id: "mem04", category: "memory", task: "The meeting is at 3pm Tuesday. When is the meeting?", check: r => /3.*pm|tuesday|3:00/i.test(r), expectedKeywords: ["3pm", "Tuesday"] },
  { id: "mem05", category: "memory", task: "My favorite color is crimson. What color did I mention?", check: r => /crimson/i.test(r), expectedKeywords: ["crimson"] },
  { id: "mem06", category: "memory", task: "I have 3 cats named Luna, Milo, and Zara. List my cats.", check: r => /luna/i.test(r) && /milo/i.test(r) && /zara/i.test(r), expectedKeywords: ["Luna", "Milo", "Zara"] },
  { id: "mem07", category: "memory", task: "My budget is $5000. How much is my budget?", check: r => /5000|\$5,000|\$5000/i.test(r), expectedKeywords: ["$5000"] },
  { id: "mem08", category: "memory", task: "The project deadline is December 31st. What is the deadline?", check: r => /december.*31|dec.*31|31.*december/i.test(r), expectedKeywords: ["December 31"] },
  { id: "mem09", category: "memory", task: "I live in Austin, Texas. What city did I say I live in?", check: r => /austin/i.test(r), expectedKeywords: ["Austin"] },
  { id: "mem10", category: "memory", task: "My company is called NexaFlow. What is my company name?", check: r => /nexaflow/i.test(r), expectedKeywords: ["NexaFlow"] },
];
