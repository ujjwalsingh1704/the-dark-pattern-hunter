/**
 * Unified LLM communication module for the Autonomous Dark Pattern Auditor.
 * Supports Anthropic Claude, OpenAI, Gemini, and Groq API keys via standard fetch.
 * Includes a deterministic fallback engine when no LLM key is configured.
 */

export async function decideNextAction({ goal, flow, step, targetUrl, currentUrl, visitedUrls, elements, previousActions, findings }) {
  if (process.env.ENABLE_LLM !== "true") {
    console.log("[LLM Agent] Disabled - using deterministic fallback");

    return deterministicFallback({
      flow,
      step,
      currentUrl,
      visitedUrls,
      elements,
      previousActions,
      findings
    });
  }

  const providers = [];

  if (process.env.TAVILY_API_KEY) {
    providers.push({ name: "Tavily AI", fn: () => callTavily(process.env.TAVILY_API_KEY, { goal, flow, step, currentUrl, visitedUrls, elements, previousActions, findings }) });
  }
  if (process.env.ANTHROPIC_API_KEY) {
    providers.push({ name: "Anthropic Claude", fn: () => callClaude(process.env.ANTHROPIC_API_KEY, { goal, flow, step, currentUrl, visitedUrls, elements, previousActions, findings }) });
  }
  if (process.env.OPENAI_API_KEY) {
    providers.push({ name: "OpenAI", fn: () => callOpenAI(process.env.OPENAI_API_KEY, { goal, flow, step, currentUrl, visitedUrls, elements, previousActions, findings }) });
  }
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    providers.push({ name: "Gemini", fn: () => callGemini(key, { goal, flow, step, currentUrl, visitedUrls, elements, previousActions, findings }) });
  }
  if (process.env.GROQ_API_KEY) {
    providers.push({ name: "Groq", fn: () => callGroq(process.env.GROQ_API_KEY, { goal, flow, step, currentUrl, visitedUrls, elements, previousActions, findings }) });
  }

  for (const provider of providers) {
    try {
      console.log(`[LLM Agent] Trying ${provider.name}...`);
      return await provider.fn();
    } catch (err) {
      console.warn(`[LLM Agent] ${provider.name} failed (${err.message}). Trying next provider...`);
    }
  }

  // Deterministic Fallback Engine (🔧) when no LLM key is available
  console.log("[LLM Agent] Using deterministic fallback");
  return deterministicFallback({ flow, step, currentUrl, visitedUrls, elements, previousActions, findings });
}

function buildPromptPayload({ goal, flow, step, currentUrl, visitedUrls, elements, previousActions, findings }) {
  const simplifiedElements = elements.map((e) => ({
    id: e.id,
    tag: e.tag,
    role: e.role,
    text: e.text,
    href: e.href,
    type: e.type
  }));

  return {
    systemPrompt: `You are an Autonomous UX Auditor AI Agent.
Your objective: Audit web pages to detect manipulative UX (dark patterns) during a ${flow} flow.

Instructions:
1. Review the interactive elements provided with unique 'id' values (e.g. "el_1", "el_2").
2. Choose the next best action to progress the ${flow} audit flow or investigate potential dark patterns.
3. Output MUST be valid JSON strictly adhering to this JSON schema:
{
  "action": "click" | "navigate" | "goBack" | "checkPatterns" | "reloadAndVerify" | "finishAudit",
  "targetId": "string (the element id to click, required if action is click)",
  "reason": "string (concise explanation of why this step was chosen)",
  "confidence": number (between 0.0 and 1.0)
}`,
    userPrompt: JSON.stringify({
      goal,
      flow,
      currentStep: step,
      currentUrl,
      visitedUrls,
      recentActions: previousActions.slice(-3),
      detectedFindings: findings.length,
      availableElements: simplifiedElements
    }, null, 2)
  };
}

async function safeFetchJson(url, options) {
  const res = await fetch(url, options);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`HTTP ${res.status} returned non-JSON response (${text.slice(0, 80).replace(/\s+/g, " ")})`);
  }
  return { res, data };
}

async function callClaude(apiKey, ctx) {
  const { systemPrompt, userPrompt } = buildPromptPayload(ctx);
  const { res, data } = await safeFetchJson("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }]
    })
  });

  console.log("[Claude Response]", JSON.stringify(data, null, 2));

  if (!res.ok) {
    throw new Error(data.error?.message || `Claude API error: ${res.status}`);
  }

  const raw = data.content?.[0]?.text;
  if (!raw) {
    throw new Error("Claude returned no message content");
  }

  return JSON.parse(raw);
}

async function callOpenAI(apiKey, ctx) {
  const { systemPrompt, userPrompt } = buildPromptPayload(ctx);
  const { res, data } = await safeFetchJson("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2
    })
  });

  console.log("[OpenAI Response]", JSON.stringify(data, null, 2));

  if (!res.ok) {
    throw new Error(
      data.error?.message || `OpenAI API error: ${res.status}`
    );
  }

  const raw = data.choices?.[0]?.message?.content;

  if (!raw) {
    throw new Error("OpenAI returned no message content");
  }

  return JSON.parse(raw);
}

async function callGroq(apiKey, ctx) {
  const { systemPrompt, userPrompt } = buildPromptPayload(ctx);
  const { res, data } = await safeFetchJson("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2
    })
  });
  if (!res.ok) throw new Error(data.error?.message || `Groq API error: ${res.status}`);
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error("Empty response from Groq");
  return JSON.parse(raw);
}

async function callGemini(apiKey, ctx) {
  const { systemPrompt, userPrompt } = buildPromptPayload(ctx);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;
  const { res, data } = await safeFetchJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        { role: "user", parts: [{ text: `${systemPrompt}\n\nTask details:\n${userPrompt}` }] }
      ],
      generationConfig: { responseMimeType: "application/json" }
    })
  });

  console.log("[Gemini Response]", JSON.stringify(data, null, 2));

  if (!res.ok) {
    throw new Error(data.error?.message || `Gemini API error: ${res.status}`);
  }

  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error("Gemini returned no message content");
  return JSON.parse(raw);
}

async function callTavily(apiKey, ctx) {
  const { flow, step, currentUrl, elements } = ctx;

  const topElements = elements.filter((e) => e.text || e.href).slice(0, 5);

  const candidateLabels = topElements
    .map((e) => `${e.id}:${(e.text || "").slice(0, 15)}`)
    .join(", ");

  // Build natural search query strictly capped under 300 characters
  const searchQuery = `Best ${flow} action step ${step} for ${currentUrl.slice(0, 40)}: ${candidateLabels}`.slice(0, 300);

  const { res, data } = await safeFetchJson("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query: searchQuery,
      include_answer: true,
      search_depth: "basic"
    })
  });

  console.log("[Tavily Response]", JSON.stringify(data, null, 2));

  if (!res.ok) {
    throw new Error(data.detail?.error || `Tavily API error: ${res.status}`);
  }

  const raw = data.answer || "";
  if (!raw) throw new Error("Tavily returned no answer content");

  // 1. Try strict JSON block matching
  const jsonMatch = raw.match(/\{[\s\S]*?\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed && (parsed.action || parsed.targetId)) {
        return {
          action: parsed.action || "click",
          targetId: parsed.targetId || topElements[0]?.id,
          reason: parsed.reason || "Tavily JSON decision",
          confidence: parsed.confidence || 0.85
        };
      }
    } catch {}
  }

  // 2. Try extracting element ID (el_1, el_2, etc.) from Tavily natural text response
  const elementIdMatch = raw.match(/el_\d+/i);
  if (elementIdMatch) {
    const targetId = elementIdMatch[0].toLowerCase();
    const matchedEl = elements.find((e) => e.id === targetId);
    if (matchedEl) {
      return {
        action: "click",
        targetId: matchedEl.id,
        reason: raw.slice(0, 150) || `Tavily selected element ${matchedEl.id}`,
        confidence: 0.85
      };
    }
  }

  // 3. Check if Tavily suggested finishing the audit
  if (/finish|complete|done|stop|end/i.test(raw)) {
    return {
      action: "finishAudit",
      reason: raw.slice(0, 150) || "Tavily indicated flow completion.",
      confidence: 0.8
    };
  }

  // 4. Fallback to top candidate element if Tavily returned text answer
  if (topElements.length > 0) {
    return {
      action: "click",
      targetId: topElements[0].id,
      reason: `Tavily text answer parsed: ${raw.slice(0, 100)}`,
      confidence: 0.8
    };
  }

  throw new Error("Could not parse Tavily response into valid action");
}

/**
 * Deterministic Fallback Engine (🔧)
 * Evaluates candidate elements based on text heuristics when no LLM key is configured.
 */
function deterministicFallback({ flow, step, elements, previousActions }) {
  if (elements.length === 0) {
    return {
      action: "finishAudit",
      reason: "No interactive elements found on the page.",
      confidence: 0.8
    };
  }

  const signupKeywords = [
    /sign\s*up/i,
    /get\s*started/i,
    /start\s*free\s*trial/i,
    /try\s*free/i,
    /create\s*account/i,
    /continue/i,
    /pricing/i,
    /join/i
  ];

  const cancelKeywords = [
    /cancel/i,
    /manage\s*subscription/i,
    /subscription/i,
    /billing/i,
    /account/i,
    /settings/i,
    /my\s*plan/i,
    /profile/i,
    /membership/i
  ];

  const junkKeywords = [
    /privacy/i,
    /terms/i,
    /cookie/i,
    /contact/i,
    /help/i,
    /faq/i,
    /about/i,
    /student\s*help/i,
    /support/i,
    /exit/i,
    /blog/i,
    /article/i,
    /news/i,
    /review/i,
    /rating/i,
    /feedback/i,
    /comment/i,
    /share/i
  ];

  const isJunk = (e) => junkKeywords.some((re) => re.test(e.text) || re.test(e.href || ""));

  const keywords = flow === "signup" ? signupKeywords : cancelKeywords;

  // Filter out elements clicked in the last 3 actions when page state DID NOT change
  const recentlyClickedKeys = new Set(
    previousActions
      .slice(-3)
      .filter((a) => a.action === "click" && a.stateChanged === false)
      .map((a) => {
        if (a.element && (a.element.text || a.element.href)) {
          return `${(a.element.text || "").toLowerCase()}|${(a.element.href || "").toLowerCase()}`;
        }
        return (a.elementKey || a.targetId || "").toLowerCase();
      })
  );

  const isRecentlyClicked = (el) => {
    const key = `${(el.text || "").toLowerCase()}|${(el.href || "").toLowerCase()}`;
    return recentlyClickedKeys.has(key);
  };

  for (const re of keywords) {
    const match = elements.find((e) => !isRecentlyClicked(e) && !isJunk(e) && (re.test(e.text) || re.test(e.href || "")));
    if (match) {
      return {
        action: "click",
        targetId: match.id,
        element: match,
        reason: `Found matching cancellation/signup element "${match.text || match.href}" for ${flow} flow.`,
        confidence: 0.85
      };
    }
  }

  // For SIGNUP flow: fallback strictly to signupProgressKeywords and reject authentication/junk links.
  // For CANCELLATION flow: DO NOT click random buttons. Finish flow if no cancellation action exists.
  if (flow === "signup") {
    const signupProgressKeywords = [
      "continue",
      "next",
      "submit",
      "create account",
      "create an account",
      "sign up",
      "signup",
      "get started",
      "start free trial",
      "start trial",
      "register",
      "registration",
      "join",
      "apply now",
      "send otp",
      "proceed",
      "request callback",
      "explore courses"
    ];

    const signupRejectKeywords = [
      "sign in",
      "signin",
      "log in",
      "login",
      "forgot password",
      "reset password",
      "privacy",
      "terms",
      "cookie",
      "contact",
      "help",
      "faq",
      "about",
      "support",
      "exit",
      "reviews",
      "rating",
      "feedback",
      "comment",
      "more"
    ];

    const candidate = elements.find((el) => {
      if (isRecentlyClicked(el)) return false;
      const text = (el.text || "").toLowerCase();
      const href = (el.href || "").toLowerCase();
      const combined = `${text} ${href}`;

      if (signupRejectKeywords.some((k) => combined.includes(k))) {
        return false;
      }

      return signupProgressKeywords.some((k) => combined.includes(k));
    });

    if (candidate) {
      return {
        action: "click",
        targetId: candidate.id,
        element: candidate,
        reason: `Found valid signup progression element "${candidate.text || candidate.href}".`,
        confidence: 0.95
      };
    }
  }

  return {
    action: "finishAudit",
    reason: `Completed exploration for ${flow} flow — no further relevant ${flow} navigation actions found.`,
    confidence: 0.9
  };
}

export async function decideFormFields(fields) {
  const apiKey =
    process.env.OPENAI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("No LLM API key configured");
  }

  const prompt = `
You are a web form understanding assistant.

Identify what each form field represents.

Allowed field types:

- firstName
- lastName
- fullName
- email
- password
- phone
- company
- city
- unknown

Return ONLY valid JSON:

{
  "fields": [
    {
      "index": 0,
      "type": "email"
    }
  ]
}

Form fields:

${JSON.stringify(fields, null, 2)}
`;

  // OpenAI
  if (process.env.OPENAI_API_KEY) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: prompt
          }
        ],
        response_format: {
          type: "json_object"
        },
        temperature: 0
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error?.message || `OpenAI error ${res.status}`);
    }

    const raw = data.choices?.[0]?.message?.content;

    if (!raw) {
      throw new Error("OpenAI returned empty response");
    }

    return JSON.parse(raw).fields || [];
  }

  // Gemini
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error?.message || `Gemini error ${res.status}`);
    }

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!raw) {
      throw new Error("Gemini returned empty response");
    }

    return JSON.parse(raw).fields || [];
  }

  throw new Error("No supported LLM provider configured");
}

