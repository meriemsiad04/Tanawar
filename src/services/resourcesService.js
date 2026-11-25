import { apiRequest } from "./apiClient.js";
import { getSession } from "./authService.js";

/**
 * Shared study resources (Resources page).
 *
 * Expected backend contract (Bearer token; adjust here when the API is built):
 *   GET /resources → [{ id, title, kind: "pdf" | "video" | "link" | "image", module, author: { id, name }, url,
 *                       session: { id, title } | null }]
 *                    (resources attached to sessions the student can see; `session` = the session it was shared in)
 */
const token = () => getSession()?.token;
const isDemo = () => Boolean(import.meta.env.DEV) && token() === "demo-token";
const call = (path, opts) => apiRequest(path, { token: token(), ...opts });

export const RESOURCE_KINDS = ["pdf", "video", "link", "image"];

export async function listResources() {
  if (isDemo()) {
    const me = getSession()?.user?.fullName ?? "You";
    return DEMO_RESOURCES.map((r) => (r.author.id === "me" ? { ...r, author: { ...r.author, name: me } } : r));
  }
  return call("/resources");
}

/* Dev demo account only: sample resources. Dead code in production builds. */
const AMINE = { id: "s5", name: "Amine Khelifi" };
const SARA = { id: "s1", name: "Sara Mebarki" };
const KARIM = { id: "s3", name: "Karim Ouali" };
// Same ids / titles as the demo sessions in sessionsService, so the Session filter matches the Sessions page.
const S = {
  dp: { id: "dp-bootcamp", title: "Dynamic Programming Bootcamp" },
  graphs: { id: "graphs", title: "Graph Algorithms Study Group" },
  recursion: { id: "recursion", title: "Recursion for Beginners" },
  sql: { id: "sql-joins", title: "SQL Joins & Normalization" },
  react: { id: "react-hooks", title: "React Hooks Deep Dive" },
  eigen: { id: "eigenvalues", title: "Eigenvalues Made Simple" },
  fourier: { id: "fourier", title: "Fourier Transform Workshop" },
  os: { id: "os-scheduling", title: "Process Scheduling Q&A" },
};
const DEMO_RESOURCES = import.meta.env.DEV
  ? [
      { id: "res1", title: "Algorithms: 2024 exam solutions", kind: "pdf", module: "Algorithms", author: AMINE, url: "https://example.com/algo-2024.pdf", session: S.dp },
      { id: "res2", title: "Normalization in 15 minutes", kind: "video", module: "Databases", author: AMINE, url: "https://example.com/normalization", session: S.sql },
      { id: "res3", title: "MDN: React learning path", kind: "link", module: "Web Development", author: SARA, url: "https://developer.mozilla.org/", session: S.react },
      { id: "res4", title: "Matrix operations mind-map", kind: "image", module: "Linear Algebra", author: { id: "s6", name: "Lina Hamidi" }, url: "https://example.com/matrix.png", session: S.eigen },
      { id: "res5", title: "Signals TD series 3", kind: "pdf", module: "Signal Processing", author: KARIM, url: "https://example.com/signals-td3.pdf", session: S.fourier },
      { id: "res6", title: "OS scheduling summary", kind: "pdf", module: "Operating Systems", author: AMINE, url: "https://example.com/os.pdf", session: S.os },
      { id: "res7", title: "DP cheat sheet", kind: "pdf", module: "Algorithms", author: AMINE, url: "https://example.com/dp.pdf", session: S.dp },
      { id: "res8", title: "Intro video", kind: "video", module: "Web Development", author: SARA, url: "https://example.com/intro", session: S.react },
      { id: "res9", title: "Starter repo", kind: "link", module: "Web Development", author: SARA, url: "https://github.com/", session: S.react },
      { id: "res10", title: "Formula sheet", kind: "pdf", module: "Signal Processing", author: KARIM, url: "https://example.com/formulas.pdf", session: S.fourier },
      { id: "res12", title: "BFS / DFS practice sheet", kind: "pdf", module: "Algorithms", author: { id: "s2", name: "Nour Saidi" }, url: "https://example.com/graphs.pdf", session: S.graphs },
      { id: "res11", title: "Recursion exercises", kind: "pdf", module: "Algorithms", author: { id: "me", name: "You" }, url: "https://example.com/recursion.pdf", session: S.recursion },
    ]
  : [];
