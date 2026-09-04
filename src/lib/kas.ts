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

/** Informasi acara tampil sampai 2 bulan setelah acara berlangsung. */
export const EVENT_WINDOW_DAYS = 60;

export function isEventVisible(event: EventInfo) {
  const ref = new Date(event.event_date ?? event.created_at).getTime();
  return Date.now() - ref < EVENT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

/** Ambil acara terbaru yang masih dalam masa tayang, lengkap dengan URL pamflet. */
export async function fetchLatestEvent(client: {
  from: (t: "events") => any;
  storage: { from: (b: string) => any };
}): Promise<EventInfo | null> {
  const { data } = await client
    .from("events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1);
  const event = (data?.[0] ?? null) as EventInfo | null;
  if (!event || !isEventVisible(event)) return null;
  if (event.pamphlet_url) {
    const { data: signed } = await client.storage
      .from("pamflet")
      .createSignedUrl(event.pamphlet_url, 60 * 60 * 24 * 7);
    event.pamphlet_url = signed?.signedUrl ?? null;
  }
  return event;
}


/** Saldo warisan dari transaksi yang rinciannya sudah dihapus (lebih dari 1 tahun). */
export type CarryBalance = { acara: number; internal: number };

export async function fetchCarryBalance(client: {
  from: (t: "balance_carry") => any;
}): Promise<CarryBalance> {
  const { data } = await client.from("balance_carry").select("target, amount");
  const rows = (data ?? []) as { target: string; amount: number }[];
  return {
    acara: Number(rows.find((r) => r.target === "acara")?.amount ?? 0),
    internal: Number(rows.find((r) => r.target === "internal")?.amount ?? 0),
  };
}
