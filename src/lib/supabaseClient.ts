// lib/supabaseClient.ts

import { createClient as createSupabaseClient, SupabaseClient, PostgrestError } from '@supabase/supabase-js'

// Define the database schema types for better type safety
// You should align these with your actual Supabase table definitions
export type UserProfile = {
  id: string; // auth.users UUID
  username: string;
  mood: string;
  created_at?: string;
  // Add other user profile fields as needed (e.g., avatar_url, email)
};

export type Message = {
  id: string; // Message ID (UUID)
  conversation_id: string; // Foreign key to conversations table
  user_id: string; // Foreign key to auth.users table
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string; // ISO timestamp
};

export type Conversation = {
  id: string; // Conversation ID (UUID)
  user_id: string; // Foreign key to auth.users table
  title: string; // A user-friendly title for the conversation
  created_at: string; // ISO timestamp
  last_updated?: string; // For sorting and showing recency
};

// --- Supabase Client Initialization ---

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 🔁 Singleton Client for client-side operations (e.g., in React components)
// It's generally safe to use a singleton for public operations where RLS is correctly configured.
export const supabase: SupabaseClient = createSupabaseClient(supabaseUrl, supabaseAnonKey);

/**
 * Creates a new Supabase client instance.
 * Useful if you need a fresh client for specific operations, though the singleton often suffices.
 * @returns {SupabaseClient} A new Supabase client instance.
 */
export function createNewClient(): SupabaseClient {
  return createSupabaseClient(supabaseUrl, supabaseAnonKey);
}

// --- Generic Database Operations ---

/**
 * Inserts a single row into a specified table.
 * @template T - The type of the object being inserted.
 * @param {string} table - The name of the table.
 * @param {T} values - The values to insert.
 * @returns {Promise<T>} The inserted data.
 * @throws {Error} If the insert operation fails.
 */
export async function insertRow<T extends object>(table: string, values: T): Promise<T> {
  const { data, error } = await supabase.from(table).insert(values).select().single();
  if (error) {
    console.error(`❌ Supabase Insert Error in '${table}':`, error.message, error.details);
    throw new Error(`Failed to insert into ${table}: ${error.message}`);
  }
  return data as T;
}

/**
 * Selects rows from a specified table with optional filters.
 * @template T - The expected type of the returned rows.
 * @param {string} table - The name of the table.
 * @param {Record<string, any>} filters - Optional key-value pairs to filter results.
 * @param {string} orderBy - Optional column to order results by.
 * @param {boolean} ascending - Whether to order in ascending (true) or descending (false) order.
 * @param {number} limit - Optional limit for the number of rows returned.
 * @returns {Promise<T[]>} An array of selected data.
 * @throws {Error} If the select operation fails.
 */
export async function selectRows<T extends object>(
  table: string,
  filters: Record<string, any> = {},
  orderBy: string = 'created_at',
  ascending: boolean = true,
  limit?: number
): Promise<T[]> {
  let query = supabase.from(table).select('*');
  for (const key in filters) {
    if (Object.prototype.hasOwnProperty.call(filters, key)) {
      query = query.eq(key, filters[key]);
    }
  }

  query = query.order(orderBy, { ascending });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) {
    console.error(`❌ Supabase Select Error in '${table}':`, error.message, error.details);
    throw new Error(`Failed to select from ${table}: ${error.message}`);
  }

  return data as T[];
}

/**
 * Deletes rows from a specified table based on filters.
 * @param {string} table - The name of the table.
 * @param {Record<string, any>} filters - Key-value pairs to filter rows for deletion.
 * @returns {Promise<boolean>} True if deletion was successful, false otherwise.
 * @throws {Error} If the delete operation fails.
 */
export async function deleteRows(table: string, filters: Record<string, any>): Promise<boolean> {
  let query = supabase.from(table).delete();
  for (const key in filters) {
    if (Object.prototype.hasOwnProperty.call(filters, key)) {
      query = query.eq(key, filters[key]);
    }
  }

  const { error } = await query;
  if (error) {
    console.error(`❌ Supabase Delete Error in '${table}':`, error.message, error.details);
    throw new Error(`Failed to delete from ${table}: ${error.message}`);
  }
  return true;
}

// --- Specific Application-Level Database Operations ---

/**
 * Fetches a single user profile by their ID.
 * @param {string} userId - The ID of the user (from auth.users).
 * @returns {Promise<UserProfile | null>} The user profile, or null if not found.
 * @throws {Error} If an error occurs during fetching.
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('users') // Assuming your user profiles are in a 'users' table
    .select('*')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is 'No rows found', which is not an error for this function
    console.error('❌ Error fetching user profile:', error.message, error.details);
    throw new Error(`Failed to fetch user profile: ${error.message}`);
  }

  return data as UserProfile | null;
}

/**
 * Creates a new conversation for a user.
 * @param {string} userId - The ID of the user.
 * @param {string} [initialTitle='New Chat'] - An optional initial title for the conversation.
 * @returns {Promise<Conversation>} The newly created conversation object.
 * @throws {Error} If the conversation cannot be created.
 */
export async function createConversation(userId: string, initialTitle: string = 'New Chat'): Promise<Conversation> {
  const { data, error } = await supabase
    .from('conversations')
    .insert({ user_id: userId, title: initialTitle, created_at: new Date().toISOString(), last_updated: new Date().toISOString() })
    .select()
    .single();

  if (error) {
    console.error('❌ Error creating conversation:', error.message, error.details);
    throw new Error(`Failed to create new conversation: ${error.message}`);
  }
  return data as Conversation;
}

/**
 * Fetches all messages for a specific conversation.
 * @param {string} conversationId - The ID of the conversation.
 * @param {number} [limit] - Optional: maximum number of messages to fetch.
 * @returns {Promise<Message[]>} An array of messages, ordered by creation time.
 * @throws {Error} If an error occurs during fetching.
 */
export async function getConversationMessages(conversationId: string, limit?: number): Promise<Message[]> {
  let query = supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('❌ Error fetching conversation messages:', error.message, error.details);
    throw new Error(`Failed to fetch messages for conversation ${conversationId}: ${error.message}`);
  }
  return data as Message[];
}

/**
 * Saves a new message to a specific conversation.
 * @param {string} conversationId - The ID of the conversation this message belongs to.
 * @param {string} userId - The ID of the user who sent/received the message.
 * @param {'user' | 'assistant' | 'system'} role - The role of the sender.
 * @param {string} content - The content of the message.
 * @returns {Promise<Message>} The saved message object.
 * @throws {Error} If the message cannot be saved.
 */
export async function saveMessage(
  conversationId: string,
  userId: string, // Changed to accept userId directly
  role: 'user' | 'assistant' | 'system',
  content: string
): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, user_id: userId, role, content, created_at: new Date().toISOString() })
    .select()
    .single(); // Ensure it returns the inserted data

  if (error) {
    console.error('❌ Error saving message:', error.message, error.details);
    throw new Error(`Failed to save message: ${error.message}`);
  }

  // Optionally update conversation's last_updated timestamp
  await supabase
    .from('conversations')
    .update({ last_updated: new Date().toISOString() })
    .eq('id', conversationId);

  return data as Message;
}

/**
 * Deletes all messages within a specific conversation.
 * @param {string} conversationId - The ID of the conversation whose messages to delete.
 * @returns {Promise<boolean>} True if messages were deleted successfully.
 * @throws {Error} If deletion fails.
 */
export async function deleteAllMessagesInConversation(conversationId: string): Promise<boolean> {
  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('conversation_id', conversationId);

  if (error) {
    console.error('❌ Error deleting messages in conversation:', error.message, error.details);
    throw new Error(`Failed to delete messages for conversation ${conversationId}: ${error.message}`);
  }
  return true;
}

/**
 * Fetches all conversations for a specific user.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<Conversation[]>} An array of conversations, ordered by last_updated (most recent first).
 * @throws {Error} If an error occurs during fetching.
 */
export async function getUserConversations(userId: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .order('last_updated', { ascending: false }); // Order by last_updated for recency

  if (error) {
    console.error('❌ Error fetching user conversations:', error.message, error.details);
    throw new Error(`Failed to fetch conversations for user ${userId}: ${error.message}`);
  }
  return data as Conversation[];
}

/**
 * Fetches a single conversation by its ID.
 * @param {string} conversationId - The ID of the conversation.
 * @returns {Promise<Conversation | null>} The conversation object, or null if not found.
 * @throws {Error} If an error occurs during fetching.
 */
export async function getConversationById(conversationId: string): Promise<Conversation | null> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is 'No rows found', which is not an error for this function
    console.error('❌ Error fetching conversation by ID:', error.message, error.details);
    throw new Error(`Failed to fetch conversation ${conversationId}: ${error.message}`);
  }
  return data as Conversation | null;
}

// Optional: Add an update function
/**
 * Updates a row in a specified table based on filters.
 * @template T - The type of the object being updated.
 * @param {string} table - The name of the table.
 * @param {Partial<T>} values - The values to update.
 * @param {Record<string, any>} filters - Key-value pairs to filter rows for update.
 * @returns {Promise<T[]>} An array of updated data.
 * @throws {Error} If the update operation fails.
 */
export async function updateRows<T extends object>(
  table: string,
  values: Partial<T>,
  filters: Record<string, any>
): Promise<T[]> {
  let query = supabase.from(table).update(values);
  for (const key in filters) {
    if (Object.prototype.hasOwnProperty.call(filters, key)) {
      query = query.eq(key, filters[key]);
    }
  }

  const { data, error } = await query.select(); // Return updated rows
  if (error) {
    console.error(`❌ Supabase Update Error in '${table}':`, error.message, error.details);
    throw new Error(`Failed to update ${table}: ${error.message}`);
  }
  return data as T[];
}