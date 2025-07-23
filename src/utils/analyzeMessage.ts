// utils/analyzeMessage.ts

// Define the expanded structure for the analysis result
export interface MessageAnalysis {
  mood: string; // e.g., happy, sad, frustrated, curious, neutral, confused, excited
  tone: string; // e.g., formal, casual, aggressive, warm, sarcastic, objective, passive-aggressive, appreciative
  intent: string; // e.g., question, complaint, feedback, casual_talk, instruction, request, information_seeking, problem_reporting, greeting
  sentiment_score: number; // -1.0 (very negative) to 1.0 (very positive)
  sentiment_label: 'positive' | 'negative' | 'neutral' | 'mixed'; // Categorical sentiment
  formality_score: number; // 0.0 (very casual) to 1.0 (very formal)
  urgency_score: number; // 0.0 (not urgent) to 1.0 (very urgent)
  politeness_score: number; // 0.0 (very impolite) to 1.0 (very polite)
  topic_keywords: string[]; // e.g., ["math", "homework", "project"], 3-5 keywords
  domain_context: string; // e.g., "education", "technical_support", "customer_service", "personal", "business", "creative"
}

// Default analysis to return in case of errors or missing API key
export const DEFAULT_ANALYSIS: MessageAnalysis = {
  mood: "neutral",
  tone: "neutral",
  intent: "unknown",
  sentiment_score: 0,
  sentiment_label: "neutral",
  formality_score: 0.5,
  urgency_score: 0.0,
  politeness_score: 0.5,
  topic_keywords: [],
  domain_context: "general"
};

export async function analyzeMessageTone(message: string): Promise<MessageAnalysis> {
  // 1. Validate API Key
  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY is not set. Cannot perform message analysis.");
    return DEFAULT_ANALYSIS;
  }

  // 2. Define the OpenAI Function Tool for structured output
  const tools = [
    {
      type: "function",
      function: {
        name: "analyze_message",
        description: "Analyzes a user message for various communication attributes including mood, tone, intent, sentiment, formality, urgency, politeness, keywords, and context.",
        parameters: {
          type: "object",
          properties: {
            mood: {
              type: "string",
              description: "The user's overall emotional state. Examples: happy, sad, frustrated, curious, neutral, confused, excited, angry, hopeful."
            },
            tone: {
              type: "string",
              description: "The dominant tone of the message. Examples: formal, casual, aggressive, warm, sarcastic, objective, passive-aggressive, appreciative, instructional, interrogative."
            },
            intent: {
              type: "string",
              description: "The primary purpose of the message. Examples: question, complaint, feedback, casual_talk, instruction, request, information_seeking, problem_reporting, greeting, clarification."
            },
            sentiment_score: {
              type: "number",
              format: "float",
              description: "A numerical sentiment score ranging from -1.0 (very negative) to 1.0 (very positive), where 0.0 is neutral."
            },
            sentiment_label: {
              type: "string",
              enum: ["positive", "negative", "neutral", "mixed"],
              description: "A categorical sentiment label derived from the sentiment score."
            },
            formality_score: {
              type: "number",
              format: "float",
              description: "A numerical formality score ranging from 0.0 (very casual) to 1.0 (very formal), where 0.5 is neutral."
            },
            urgency_score: {
              type: "number",
              format: "float",
              description: "A numerical urgency score ranging from 0.0 (not urgent) to 1.0 (very urgent). Higher scores indicate more immediate need."
            },
            politeness_score: {
              type: "number",
              format: "float",
              description: "A numerical politeness score ranging from 0.0 (very impolite) to 1.0 (very polite)."
            },
            topic_keywords: {
              type: "array",
              items: {
                type: "string"
              },
              description: "A list of 3 to 5 highly relevant keywords or short phrases representing the main topics discussed in the message. E.g., ['project deadline', 'API integration', 'meeting notes']."
            },
            domain_context: {
              type: "string",
              description: "The general context or domain the message belongs to. Examples: education, technical_support, customer_service, personal, business, creative, legal, medical, general."
            }
          },
          required: [
            "mood",
            "tone",
            "intent",
            "sentiment_score",
            "sentiment_label",
            "formality_score",
            "urgency_score",
            "politeness_score",
            "topic_keywords",
            "domain_context"
          ]
        }
      }
    }
  ];

  // 3. Construct the messages for the OpenAI API call
  const promptMessages = [
    {
      role: "system",
      content: `You are an expert communication analyst. Your sole purpose is to analyze the user's message thoroughly and provide precise attributes using the 'analyze_message' tool. You MUST respond ONLY by calling this tool.`
    },
    {
      role: "user",
      content: `Analyze the following message:\n\n"""${message}"""`
    }
  ];

  try {
    // 4. Make the API call to OpenAI
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o", // gpt-4o is highly capable for structured output and function calling
        messages: promptMessages,
        temperature: 0.1, // Lower temperature for more consistent and factual analysis
        tools: tools, // Include the defined tools
        tool_choice: {
          type: "function",
          function: {
            name: "analyze_message"
          }
        } // Force the model to call our specific function
      })
    });

    // 5. Handle non-OK HTTP responses from OpenAI API
    if (!res.ok) {
      const errorData = await res.json();
      console.error(`❌ OpenAI API HTTP error: ${res.status} ${res.statusText}`, errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || res.statusText}`);
    }

    const data = await res.json();

    // 6. Validate OpenAI response structure for tool calls
    if (!data.choices || data.choices.length === 0 || !data.choices[0].message || !data.choices[0].message.tool_calls || data.choices[0].message.tool_calls.length === 0) {
      console.error("❌ OpenAI API response missing expected tool call content:", data);
      throw new Error("Invalid response structure from OpenAI API: Expected a tool call.");
    }

    const toolCall = data.choices[0].message.tool_calls[0];

    // 7. Verify the correct tool was called
    if (toolCall.function.name !== "analyze_message") {
      console.error("❌ OpenAI API called an unexpected function:", toolCall.function.name, "Response:", data);
      throw new Error(`Invalid tool call: Expected 'analyze_message' but received '${toolCall.function.name}'.`);
    }

    // 8. Parse and return the analysis from function arguments
    try {
      // The arguments are guaranteed by OpenAI's function calling to be valid JSON
      // conforming to the schema we provided.
      const parsedAnalysis: MessageAnalysis = JSON.parse(toolCall.function.arguments);

      // Although function calling enforces schema, a final sanity check can be added
      // if there are specific runtime validations beyond basic type (e.g., score ranges).
      // For simplicity, we trust the schema enforcement here.
      return parsedAnalysis;

    } catch (parseError) {
      console.error("❌ Failed to parse function arguments JSON from OpenAI response:", parseError, "Raw arguments:", toolCall.function.arguments);
      return DEFAULT_ANALYSIS;
    }

  } catch (apiError: any) {
    console.error("❌ Error during communication with OpenAI API or unexpected response:", apiError.message);
    return DEFAULT_ANALYSIS;
  }
}