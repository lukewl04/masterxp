import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // server only!
);

// ---------- Users ----------
export async function findUserByAuth0Id(auth0Id) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("auth0_id", auth0Id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createUser({ auth0Id, xp, level }) {
  const { data, error } = await supabase
    .from("users")
    .insert({ auth0_id: auth0Id, xp, level })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateUserXP(auth0Id, xp, level) {
  const { data, error } = await supabase
    .from("users")
    .update({ xp, level })
    .eq("auth0_id", auth0Id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ---------- Todos ----------
export async function listTodosByDate(auth0Id, dateStr) {
  const { data, error } = await supabase
    .from("todos")
    .select("*")
    .eq("auth0_id", auth0Id)
    .eq("date", dateStr)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function createTodo(auth0Id, { text, date }) {
  const { data, error } = await supabase
    .from("todos")
    .insert({ auth0_id: auth0Id, text, date })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTodo(auth0Id, todoId, patch) {
  const { data, error } = await supabase
    .from("todos")
    .update(patch)
    .eq("id", todoId)
    .eq("auth0_id", auth0Id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTodo(auth0Id, todoId) {
  const { error } = await supabase
    .from("todos")
    .delete()
    .eq("id", todoId)
    .eq("auth0_id", auth0Id);

  if (error) throw error;
  return true;
}
