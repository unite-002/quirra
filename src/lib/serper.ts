// src/lib/serper.ts
import { NextResponse } from 'next/server';

const SERPER_API_KEY = process.env.SERPER_API_KEY;

/**
 * Searches the web using the Serper API.
 * This is a placeholder and you need to implement the actual API call logic.
 * @param query The search query string.
 * @returns A Promise that resolves to a string or object with search results.
 */
export async function search(query: string) {
  if (!SERPER_API_KEY) {
    console.error("❌ SERPER_API_KEY is not set. Cannot perform web search.");
    return null;
  }

  try {
    const response = await fetch("https://google.serper.dev/search", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': SERPER_API_KEY
      },
      body: JSON.stringify({ q: query })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Serper API Error: ${response.status} - ${errorText}`);
      return null;
    }

    const data = await response.json();
    console.log(`✅ Serper search successful for query: "${query}"`);

    // You can parse and format the data as needed for your application
    // Example: Extract and return the snippets from the organic results
    const snippets = data.organic.map((result: any) => result.snippet).join('\n\n');
    return snippets;

  } catch (error: any) {
    console.error(`❌ Error during Serper API call: ${error.message}`);
    return null;
  }
}