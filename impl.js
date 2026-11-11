/**
 * Host half of the token-usage bundle.
 *
 * Folds the provider usage recorded in the durable session logs into local-time
 * day and hour buckets (the reporting window) plus an all-time per-model ledger
 * folded from the whole corpus, and serves both to the Client half over a
 * private Connection RPC channel. Every subscription is registered on `ctx`, so
 * disabling the plugin disposes the channel, the append feed, and the state.
 */

/** Private Connection channel; the Client half POSTs `<channel>/summary`. */
const CHANNEL = '/dsh-token-usage';
const SUMMARY = 'summary';

const DAY_MS = 86_400_000;
/** Days reported to the Client. */
const WINDOW_DAYS = 7;
/** Hard cap on logs folded by one Host process (the all-time scan included). */
const MAX_SESSIONS = 5000;
const READ_CONCURRENCY = 4;
/** Log reads per RPC call: a generous first batch, then a trickle per poll. */
const FIRST_BATCH = 24;
const NEXT_BATCH = 24;
/** Wall-clock budget for one RPC call's log reading. */
const TIME_BUDGET_MS = 2_000;
/** Minimum spacing between corpus listings. */
const REFRESH_INTERVAL_MS = 15_000;
/** Retained hour buckets per session. */
const MAX_BUCKETS_PER_SESSION = 24 * (WINDOW_DAYS + 2);

// `sessionQuery` reads the persisted corpus for the cold backlog; `connection` carries
// the exact Fetch-route registry that publishes the summary under /api.
export const inject = ['sessionQuery', 'connection'];

function pad2(value) {
  return value < 10 ? `0${value}` : String(value);
}

/** Local-time `YYYY-MM-DD` key of an epoch-millisecond instant. */
function dayKey(time) {
  const date = new Date(time);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Local-time `YYYY-MM-DDTHH` bucket key of an epoch-millisecond instant. */
function hourKey(time) {
  const date = new Date(time);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}`;
}

/** Start of the local day containing `time`. */
function startOfDay(time) {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** Start of the local day `offset` days away from `time`, DST-safe through the Date setters. */
function shiftDay(time, offset) {
  const date = new Date(time);
  date.setDate(date.getDate() + offset);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function positive(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

function emptyBucket() {
  return { input: 0, output: 0, cache: 0, total: 0, calls: 0 };
}

/** Per-model rows of one model Map, sorted by total, for the Client payload. */
function sortedModels(map) {
  return [...map.entries()]
    .map(([model, counts]) => ({ model, ...counts }))
    .sort((left, right) => right.total - left.total);
}

/** Session-level hour bucket: counters plus a per-model breakdown. */
function makeBucket() {
  return { ...emptyBucket(), models: new Map() };
}

/**
 * Model identifier of one assistant event; `unknown` when absent.
 * Keyed by model name only (no provider prefix) so the same model reached
 * through different providers counts as one row.
 */
function modelOf(event) {
  const data = event !== null && typeof event === 'object' ? event.data : null;
  // The model identifier rides on the LLM response object: data.message.source.
  // Fall back to data.source in case the log shape moves it back up one level.
  const carriers = [];
  if (data !== null && typeof data === 'object') {
    const message = data.message;
    if (message !== null && typeof message === 'object') carriers.push(message);
    carriers.push(data);
  }
  for (const carrier of carriers) {
    const source = carrier.source;
    if (source !== null && typeof source === 'object') {
      const model = typeof source.model === 'string' && source.model !== '' ? source.model : '';
      if (model !== '') return model;
    }
  }
  return 'unknown';
}

function describe(error) {
  return error instanceof Error ? error.message : String(error);
}

export function apply(ctx) {
  /** sessionId -> hour bucket key -> counters, pruned to the reporting window. */
  const totals = new Map();
  const queue = [];
  const queued = new Set();
  const read = new Set();
  /** sessionId -> first sequence number observed on the live feed. */
  const liveFloor = new Map();
  /** All-time per-model ledger, rebuilt from the whole corpus on every Host start. */
  const allModels = new Map();
  /** All-time per-day ledger, for the single-day max/min stat cards. */
  const allDays = new Map();
  /** All-time per-hour-of-day ledger with per-model detail (the by-slot overview card). */
  const allSlots = [];
  for (let hour = 0; hour < 24; hour += 1) allSlots.push(makeBucket());
  /** Earliest folded event time, so the overview can say "since" when. */
  let firstTime = Infinity;

  let reading = false;
  let lastRefresh = 0;
  let unreadable = 0;
  let problem;
  let firstRequest = true;

  function window() {
    const start = startOfDay(Date.now());
    const days = [];
    for (let offset = -(WINDOW_DAYS - 1); offset <= 0; offset += 1) days.push(dayKey(shiftDay(start, offset)));
    return { start, days };
  }

  /** Add one event's usage to its session's bucket, keeping only `start` onwards. */
  function fold(sessionId, event) {
    if (event === null || typeof event !== 'object' || event.type !== 'assistant/message') return;
    const data = event.data;
    const usage = data !== null && typeof data === 'object' ? data.usage : void 0;
    if (usage === null || typeof usage !== 'object') return;
    const input = positive(usage.inputTokens);
    const output = positive(usage.outputTokens);
    // deepseek-flash reports prompt-cache reads separately; they count toward total.
    const cache = positive(usage.cacheReadTokens);
    const total = positive(usage.totalTokens) || input + output + cache;
    if (input === 0 && output === 0 && total === 0 && cache === 0) return;
    const time = typeof event.time === 'number' ? event.time : Date.now();
    const key = hourKey(time);
    let buckets = totals.get(sessionId);
    if (buckets === void 0) {
      buckets = new Map();
      totals.set(sessionId, buckets);
    }
    const bucket = buckets.get(key) ?? makeBucket();
    bucket.input += input;
    bucket.output += output;
    bucket.cache += cache;
    bucket.total += total;
    bucket.calls += 1;
    const model = modelOf(event);
    const modelBucket = bucket.models.get(model) ?? emptyBucket();
    modelBucket.input += input;
    modelBucket.output += output;
    modelBucket.cache += cache;
    modelBucket.total += total;
    modelBucket.calls += 1;
    bucket.models.set(model, modelBucket);
    buckets.set(key, bucket);
    // All-time ledger: folded exactly once per event, like the hour buckets.
    const allBucket = allModels.get(model) ?? emptyBucket();
    allBucket.input += input;
    allBucket.output += output;
    allBucket.cache += cache;
    allBucket.total += total;
    allBucket.calls += 1;
    allModels.set(model, allBucket);
    // All-time per-day ledger for the single-day max/min stat cards.
    const allDayKey = dayKey(time);
    const allDay = allDays.get(allDayKey) ?? emptyBucket();
    allDay.input += input;
    allDay.output += output;
    allDay.cache += cache;
    allDay.total += total;
    allDay.calls += 1;
    allDays.set(allDayKey, allDay);
    // All-time per-hour-of-day ledger for the by-slot overview card.
    const hod = allSlots[new Date(time).getHours()];
    hod.input += input;
    hod.output += output;
    hod.cache += cache;
    hod.total += total;
    hod.calls += 1;
    const hodModel = hod.models.get(model) ?? emptyBucket();
    hodModel.input += input;
    hodModel.output += output;
    hodModel.cache += cache;
    hodModel.total += total;
    hodModel.calls += 1;
    hod.models.set(model, hodModel);
    if (time < firstTime) firstTime = time;
    if (buckets.size > MAX_BUCKETS_PER_SESSION) {
      const start = startOfDay(time);
      for (const existing of [...buckets.keys()]) {
        const hour = Date.parse(`${existing}:00:00`);
        if (!Number.isFinite(hour) || hour < start - DAY_MS) buckets.delete(existing);
      }
      while (buckets.size > MAX_BUCKETS_PER_SESSION) buckets.delete(buckets.keys().next().value);
    }
  }

  /**
   * Fold a log read from persistence, stopping at the fork-inherited prefix (already
   * counted for the parent session) and at whatever the live feed has already folded.
   */
  function seed(sessionId, snapshot) {
    const events = snapshot !== null && typeof snapshot === 'object' && Array.isArray(snapshot.events) ? snapshot.events : [];
    let cut = typeof snapshot?.inheritedEventCount === 'number' ? snapshot.inheritedEventCount : 0;
    if (cut === 0) {
      for (let index = 0; index < events.length; index += 1) {
        const event = events[index];
        if (event?.type === 'session/end-seed' && event.data?.inherited === true) {
          cut = index + 1;
          break;
        }
      }
    }
    const floor = liveFloor.get(sessionId);
    const limit = typeof floor === 'number' ? Math.min(floor, events.length) : events.length;
    for (let index = cut; index < limit; index += 1) fold(sessionId, events[index]);
  }

  /** List the corpus and queue the most recent unread logs. */
  async function refresh() {
    lastRefresh = Date.now();
    const { start } = window();
    let listed;
    try {
      listed = await ctx.sessionQuery.listSessions();
    } catch (error) {
      problem = describe(error);
      return;
    }
    const recent = [];
    const older = [];
    for (const record of Array.isArray(listed) ? listed : []) {
      const header = record?.header;
      const id = header?.id;
      if (typeof id !== 'string' || read.has(id) || queued.has(id)) continue;
      const createdAt = typeof header.createdAt === 'number' ? header.createdAt : 0;
      (createdAt >= start ? recent : older).push(id);
    }
    // Today's sessions first, then the whole remaining history, oldest corpus order last.
    const room = Math.max(0, MAX_SESSIONS - read.size - queued.size);
    for (const id of recent.concat(older).slice(0, room)) {
      queued.add(id);
      queue.push(id);
    }
  }

  /** Read up to `batch` queued logs within the time budget, folding each exactly once. */
  async function drain(batch) {
    if (reading) return;
    reading = true;
    const deadline = Date.now() + TIME_BUDGET_MS;
    let claimed = 0;
    try {
      const worker = async () => {
        while (claimed < batch && queue.length > 0 && Date.now() < deadline) {
          claimed += 1;
          const id = queue.shift();
          if (read.has(id)) continue;
          try {
            seed(id, await ctx.sessionQuery.readSession(id));
          } catch (error) {
            unreadable += 1;
            problem = describe(error);
          }
          read.add(id);
        }
      };
      await Promise.all(Array.from({ length: READ_CONCURRENCY }, () => worker()));
    } finally {
      reading = false;
    }
  }

  async function collect() {
    // List the corpus first: the queue only holds what has already been discovered,
    // so a session picked up from the live feed must not starve the backlog.
    if (!reading && Date.now() - lastRefresh >= REFRESH_INTERVAL_MS) await refresh();
    await drain(firstRequest ? FIRST_BATCH : NEXT_BATCH);
    firstRequest = false;
  }

  /** Build the Client payload: seven day rows and today's twenty-four hour rows. */
  function aggregate() {
    const { days } = window();
    const start = Date.parse(`${days[0]}T00:00:00`);
    const dayTotals = new Map(days.map((key) => [key, emptyBucket()]));
    const hours = [];
    for (let hour = 0; hour < 24; hour += 1) hours.push({ hour, ...emptyBucket() });
    const todayKey = days[days.length - 1];
    let sessions = 0;
    const modelTotals = new Map();
    /** day key -> model -> counts, reporting window only. */
    const dayModels = new Map();
    /** hour-of-day -> model -> counts, today only. */
    const hourModels = [];
    for (let hour = 0; hour < 24; hour += 1) hourModels.push(new Map());
    for (const buckets of totals.values()) {
      if (buckets.size > 0) sessions += 1;
      for (const [key, bucket] of buckets) {
        const day = key.slice(0, 10);
        const rolled = dayTotals.get(day);
        if (rolled !== void 0) {
          rolled.input += bucket.input;
          rolled.output += bucket.output;
          rolled.cache += bucket.cache;
          rolled.total += bucket.total;
          rolled.calls += bucket.calls;
        }
        const slotIndex = Number(key.slice(11, 13));
        const isToday = day === todayKey && hours[slotIndex] !== void 0;
        // Window-scoped model rollups: buckets outside the seven-day window are
        // excluded so byModel and week.total share one basis and shares sum to 100%.
        if (rolled !== void 0) {
          for (const [model, modelBucket] of bucket.models) {
            const modelTotal = modelTotals.get(model) ?? emptyBucket();
            modelTotal.input += modelBucket.input;
            modelTotal.output += modelBucket.output;
            modelTotal.cache += modelBucket.cache;
            modelTotal.total += modelBucket.total;
            modelTotal.calls += modelBucket.calls;
            modelTotals.set(model, modelTotal);
            let rolledModels = dayModels.get(day);
            if (rolledModels === void 0) {
              rolledModels = new Map();
              dayModels.set(day, rolledModels);
            }
            const dayModel = rolledModels.get(model) ?? emptyBucket();
            dayModel.input += modelBucket.input;
            dayModel.output += modelBucket.output;
            dayModel.cache += modelBucket.cache;
            dayModel.total += modelBucket.total;
            dayModel.calls += modelBucket.calls;
            rolledModels.set(model, dayModel);
            if (isToday) {
              const hourModel = hourModels[slotIndex].get(model) ?? emptyBucket();
              hourModel.input += modelBucket.input;
              hourModel.output += modelBucket.output;
              hourModel.cache += modelBucket.cache;
              hourModel.total += modelBucket.total;
              hourModel.calls += modelBucket.calls;
              hourModels[slotIndex].set(model, hourModel);
            }
          }
        }
        if (!isToday) continue;
        const slot = hours[Number(key.slice(11, 13))];
        slot.input += bucket.input;
        slot.output += bucket.output;
        slot.cache += bucket.cache;
        slot.total += bucket.total;
        slot.calls += bucket.calls;
      }
    }
    const week = emptyBucket();
    const rows = days.map((key) => {
      const bucket = dayTotals.get(key) ?? emptyBucket();
      week.input += bucket.input;
      week.output += bucket.output;
      week.cache += bucket.cache;
      week.total += bucket.total;
      week.calls += bucket.calls;
      const time = Date.parse(`${key}T00:00:00`);
      return { key, dow: new Date(time).getDay(), ...bucket, models: sortedModels(dayModels.get(key) ?? new Map()) };
    });
    const today = rows[rows.length - 1] ?? { key: todayKey, dow: new Date(Date.now()).getDay(), ...emptyBucket() };
    const byModel = [...modelTotals.entries()]
      .map(([model, counts]) => ({ model, ...counts }))
      .sort((left, right) => right.total - left.total);
    const allTime = emptyBucket();
    for (const counts of allModels.values()) {
      allTime.input += counts.input;
      allTime.output += counts.output;
      allTime.cache += counts.cache;
      allTime.total += counts.total;
      allTime.calls += counts.calls;
    }
    const allTimeByModel = [...allModels.entries()]
      .map(([model, counts]) => ({ model, ...counts }))
      .sort((left, right) => right.total - left.total);
    const allTimeDays = [...allDays.entries()]
      .map(([key, counts]) => ({ key, dow: new Date(`${key}T00:00:00`).getDay(), ...counts }))
      .sort((left, right) => (left.key < right.key ? -1 : 1));
    return {
      days: rows,
      allTimeDays,
      hours: hours.map((slot, index) => ({ ...slot, models: sortedModels(hourModels[index]) })),
      hourOfDayAll: allSlots.map((slot, index) => ({ hour: index, ...slot, models: sortedModels(slot.models) })),
      today,
      week,
      byModel,
      allTime,
      allTimeByModel,
      allSince: Number.isFinite(firstTime) ? firstTime : null,
      start,
      sessions,
      queued: queue.length,
      unreadable,
      problem: problem ?? null,
      scanning: queue.length > 0 || reading,
      updatedAt: Date.now(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  // Live append feed: counts every session's usage as it commits, and keeps the
  // pre-attach backlog of an unseen session queued for one exact-once log read.
  ctx.on('session/event', (session, event) => {
    const id = session !== null && typeof session === 'object' ? session.id : void 0;
    if (typeof id !== 'string') return;
    if (!liveFloor.has(id)) liveFloor.set(id, typeof event?.seq === 'number' ? event.seq : 0);
    if (!read.has(id) && !queued.has(id)) {
      queued.add(id);
      queue.push(id);
    }
    fold(id, event);
  });

  // Fiber-owned registration: disposing this plugin drops the route with it.
  const summaryHandler = async (endpoint) => {
    if (endpoint !== SUMMARY) {
      return { ok: false, error: { code: 'token-usage/unknown-endpoint', message: `unknown endpoint "${endpoint}"` } };
    }
    try {
      await collect();
      return { ok: true, value: aggregate() };
    } catch (error) {
      return { ok: false, error: { code: 'token-usage/failed', message: describe(error) } };
    }
  };

  // `rpc.handle` is unusable here: it hands `owner.webServer` to an owner the service
  // derives internally, which no inject this plugin declares can satisfy (verified in
  // the running Host: both a root and a scoped ['connection','webServer'] registration
  // threw while `ctx.fiber.inject` listed all three services). The exact Fetch-route
  // registry is the reader-scoped seam that touches no service, and mounting it under
  // /api inherits the Host/Origin fence and browser authentication of that transport.
  ctx.connection.fetch.register({
    path: `/api${CHANNEL}/${SUMMARY}`,
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: async () => {
      const result = await summaryHandler(SUMMARY);
      return new Response(JSON.stringify(result), {
        status: result.ok === true ? 200 : 500,
        headers: { 'content-type': 'application/json' }
      });
    }
  });
}
