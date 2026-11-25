import { apiRequest } from "./apiClient.js";
import { getSession } from "./authService.js";

/**
 * Shared study resources (Resources page).
 *
 * Expected backend contract (Bearer token; adjust here when the API is built):
 *   GET /resources → [{ id, title, kind: "pdf" | "video" | "link" | "image", module, author: { id, name }, url }]
 *                    (resources attached to sessions the student can see)
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
const DEMO_RESOURCES = import.meta.env.DEV
  ? [
      { id: "res1", title: "Algorithms: 2024 exam solutions", kind: "pdf", module: "Algorithms", author: AMINE, url: "https://example.com/algo-2024.pdf" },
      { id: "res2", title: "Normalization in 15 minutes", kind: "video", module: "Databases", author: AMINE, url: "https://example.com/normalization" },
      { id: "res3", title: "MDN: React learning path", kind: "link", module: "Web Development", author: SARA, url: "https://developer.mozilla.org/" },
      { id: "res4", title: "Matrix operations mind-map", kind: "image", module: "Linear Algebra", author: { id: "s6", name: "Lina Hamidi" }, url: "https://example.com/matrix.png" },
      { id: "res5", title: "Signals TD series 3", kind: "pdf", module: "Signal Processing", author: KARIM, url: "https://example.com/signals-td3.pdf" },
      { id: "res6", title: "OS scheduling summary", kind: "pdf", module: "Operating Systems", author: AMINE, url: "https://example.com/os.pdf" },
      { id: "res7", title: "DP cheat sheet", kind: "pdf", module: "Algorithms", author: AMINE, url: "https://example.com/dp.pdf" },
      { id: "res8", title: "Intro video", kind: "video", module: "Web Development", author: SARA, url: "https://example.com/intro" },
      { id: "res9", title: "Starter repo", kind: "link", module: "Web Development", author: SARA, url: "https://github.com/" },
      { id: "res10", title: "Formula sheet", kind: "pdf", module: "Signal Processing", author: KARIM, url: "https://example.com/formulas.pdf" },
      { id: "res11", title: "Recursion exercises", kind: "pdf", module: "Algorithms", author: { id: "me", name: "You" }, url: "https://example.com/recursion.pdf" },
    ]
  : [];
