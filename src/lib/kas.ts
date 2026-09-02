export const ADMIN_USERNAME = "MT-JSI";
export const DEFAULT_PASSWORD = "123456";
export const EMAIL_DOMAIN = "mtjsi.local";

export function usernameToEmail(username: string) {
  const slug = username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "user"}@${EMAIL_DOMAIN}`;
}

export function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Transaksi acara hanya tampil sampai 1 bulan setelah dibuat. */
export const WINDOW_DAYS = 30;

export function isWithinWindow(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() < WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

export type Transaction = {
  id: string;
  kind: "income" | "expense";
  person_name: string | null;
  note: string | null;
  amount: number;
  target: "acara" | "internal";
  status: "pending" | "approved" | "rejected";
  created_by: string | null;
  created_at: string;
  approved_at: string | null;
};

export type EventInfo = {
  id: string;
  title: string;
  description: string | null;
  pamphlet_url: string | null;
  event_date: string | null;
  created_at: string;
};
