// src/app/api/ask/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    // Validate prompt
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ response: "⚠️ Missing or invalid prompt." }, { status: 400 });
    }

    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are Quirra, a powerful AI assistant built to help users with intelligence, clarity, and vision." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    // Parse OpenAI response
    const data = await response.json();

    // Log the full response for debugging
    console.log("OpenAI API Response:", data);

    // Check if the response has a message and choices
    const message = data?.choices?.[0]?.message?.content;

    if (!message) {
      // Log the error if no message is returned
      console.error("Error: OpenAI API response has no message content.", JSON.stringify(data, null, 2));
      return NextResponse.json(
        { response: "⚠️ OpenAI responded but no message was returned." },
        { status: 502 }
      );
    }

    // Return the response message
    return NextResponse.json({ response: message });
  } catch (err) {
    // Log the error for better debugging
    console.error("Error connecting to OpenAI:", err);

    return NextResponse.json(
      { response: "⚠️ Quirra failed to connect to OpenAI's brain." },
      { status: 500 }
    );
  }
}
