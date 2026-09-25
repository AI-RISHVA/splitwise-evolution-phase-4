import { apiFetch, ApiError, DEMO_MODE, tokens } from "./api-client";

export type User = { firstname: string; lastname: string; username: string; gender: "male" | "female" | "other"; email: string };
export type RegisterInput = User & { mobile_no: string; password: string };
export type SearchUser = { firstname: string; lastname: string; username: string };
export type Friend = { username: string; balance: number };
export type FriendAction = "accepted" | "rejected";

/* ---------------- Demo data (localStorage) ---------------- */
type DemoDB = {
  users: (RegisterInput)[];
  relations: { from: string; to: string; status: "pending" | "accepted" | "rejected" }[];
  balances: Record<string, number>;
};
const DKEY = "sw_demo_db";
const seed: DemoDB = {
  users: [
    { firstname: "Demo", lastname: "User", username: "DEMO1", gender: "other", email: "demo@mail.com", mobile_no: "9999999999", password: "Demo@123" },
    { firstname: "Aarav", lastname: "Shah", username: "AARAV01", gender: "male", email: "aarav@mail.com", mobile_no: "9000000001", password: "x" },
    { firstname: "Priya", lastname: "Patel", username: "PRIYA22", gender: "female", email: "priya@mail.com", mobile_no: "9000000002", password: "x" },
    { firstname: "Rohan", lastname: "Mehta", username: "ROHAN7", gender: "male", email: "rohan@mail.com", mobile_no: "9000000003", password: "x" },
    { firstname: "Neha", lastname: "Joshi", username: "NEHA99", gender: "female", email: "neha@mail.com", mobile_no: "9000000004", password: "x" },
    { firstname: "Kabir", lastname: "Desai", username: "KABIR5", gender: "male", email: "kabir@mail.com", mobile_no: "9000000005", password: "x" },
  ],
  relations: [
    { from: "DEMO1", to: "AARAV01", status: "accepted" },
    { from: "PRIYA22", to: "DEMO1", status: "accepted" },
    { from: "ROHAN7", to: "DEMO1", status: "pending" },
    { from: "NEHA99", to: "DEMO1", status: "pending" },
  ],
  balances: { AARAV01: 450, PRIYA22: -220 },
};
const db = (): DemoDB => JSON.parse(localStorage.getItem(DKEY) || "null") ?? structuredClone(seed);
const save = (d: DemoDB) => localStorage.setItem(DKEY, JSON.stringify(d));
const me = () => localStorage.getItem("sw_demo_user") ?? "";
const wait = () => new Promise((r) => setTimeout(r, 250));
const isFriendPair = (r: DemoDB["relations"][0], a: string, b: string) =>
  (r.from === a && r.to === b) || (r.from === b && r.to === a);

/* ---------------- Auth ---------------- */
export async function login(username: string, password: string) {
  if (DEMO_MODE) {
    await wait();
    const u = db().users.find((x) => x.username === username && x.password === password);
    if (!u) throw new ApiError("invalid username & password");
    localStorage.setItem("sw_demo_user", u.username);
    tokens.set("demo-token", "demo-refresh");
    return;
  }
  const body = new URLSearchParams({ username, password });
  const res = await apiFetch<{ access_token: string; refresh_token: string }>("/login", { method: "POST", body, auth: false });
  tokens.set(res.access_token, res.refresh_token);
}

export async function register(input: RegisterInput) {
  if (DEMO_MODE) {
    await wait();
    const d = db();
    if (d.users.some((u) => u.username === input.username)) throw new ApiError("Username is already registered");
    d.users.push(input);
    save(d);
    return;
  }
  await apiFetch("/register", { method: "POST", json: input, auth: false });
}

export async function logout() {
  try {
    if (!DEMO_MODE) await apiFetch("/logout/", { method: "POST", json: tokens.refresh ?? "" });
  } finally {
    tokens.clear();
    localStorage.removeItem("sw_demo_user");
  }
}

export async function getMe(): Promise<User> {
  if (DEMO_MODE) {
    const u = db().users.find((x) => x.username === me());
    if (!u) throw new ApiError("Not logged in");
    return u;
  }
  return apiFetch<User>("/me");
}

/* ---------------- Friends ---------------- */
export async function searchUsers(query: string): Promise<SearchUser[]> {
  if (DEMO_MODE) {
    await wait();
    const q = query.toLowerCase();
    return db().users.filter((u) => u.username !== me() && u.username.toLowerCase().includes(q)).slice(0, 10);
  }
  const res = await apiFetch<{ data: SearchUser[] }>("/friend/search/", { method: "POST", json: { query } });
  return res.data ?? [];
}

export async function sendFriendRequest(friend_username: string) {
  if (DEMO_MODE) {
    await wait();
    const d = db();
    const ex = d.relations.find((r) => isFriendPair(r, me(), friend_username));
    if (ex && ex.status !== "rejected") throw new ApiError(`relationship or request already exists with status: '${ex.status}'.`);
    d.relations = d.relations.filter((r) => r !== ex);
    d.relations.push({ from: me(), to: friend_username, status: "pending" });
    save(d);
  } else {
    await apiFetch("/friend/send_request/", { method: "POST", json: { friend_username } });
  }
  rememberSent(friend_username);
}

export async function respondFriendRequest(friend_username: string, action: FriendAction) {
  if (DEMO_MODE) {
    await wait();
    const d = db();
    const r = d.relations.find((x) => x.from === friend_username && x.to === me() && x.status === "pending");
    if (!r) throw new ApiError(`No pending friend request found from user '${friend_username}'`);
    r.status = action;
    save(d);
    return;
  }
  await apiFetch("/friend/respond_request/", { method: "PUT", json: { friend_username, action } });
}

export async function listFriends(): Promise<Friend[]> {
  if (DEMO_MODE) {
    await wait();
    const d = db();
    return d.relations
      .filter((r) => r.status === "accepted" && (r.from === me() || r.to === me()))
      .map((r) => {
        const u = r.from === me() ? r.to : r.from;
        return { username: u, balance: d.balances[u] ?? 0 };
      });
  }
  const res = await apiFetch<{ friends: Friend[] }>("/friend/list/");
  return res.friends ?? [];
}

export async function removeFriend(friend_username: string) {
  if (DEMO_MODE) {
    await wait();
    const d = db();
    if (Math.abs(d.balances[friend_username] ?? 0) > 0.01)
      throw new ApiError(`Cannot remove ${friend_username} — balance is not settled. Settle up first.`);
    d.relations = d.relations.filter((r) => !(r.status === "accepted" && isFriendPair(r, me(), friend_username)));
    save(d);
    return;
  }
  await apiFetch("/friend/remove/", { method: "DELETE", json: { friend_username } });
}

/** Incoming pending requests. Backend has no list endpoint yet, so only demo mode can list them. */
export const CAN_LIST_INCOMING = DEMO_MODE;
export async function listIncoming(): Promise<string[]> {
  if (!DEMO_MODE) return [];
  await wait();
  return db().relations.filter((r) => r.to === me() && r.status === "pending").map((r) => r.from);
}

/* Sent requests remembered in this browser (backend has no endpoint to list them) */
const SENT = "sw_sent_requests";
export function getSent(): string[] {
  return JSON.parse(localStorage.getItem(SENT) || "[]");
}
function rememberSent(u: string) {
  localStorage.setItem(SENT, JSON.stringify([...new Set([u, ...getSent()])]));
}
export function forgetSent(u: string) {
  localStorage.setItem(SENT, JSON.stringify(getSent().filter((x) => x !== u)));
}
