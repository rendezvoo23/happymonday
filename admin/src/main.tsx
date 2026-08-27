import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Activity,
  BarChart3,
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  KeyRound,
  LogOut,
  Megaphone,
  Search,
  Send,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { api } from "./api";
import type {
  AccessKind,
  AccessStatus,
  Segment,
  UserDetail,
  UserSummary,
} from "./types";
import "./styles.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, retry: 1 } },
});

const navigation = [
  { id: "overview", label: "Обзор", icon: BarChart3 },
  { id: "users", label: "Пользователи", icon: Users },
  { id: "broadcasts", label: "Рассылки", icon: Megaphone },
] as const;

const segments: Array<{ value: Segment; label: string }> = [
  { value: "all", label: "Все пользователи" },
  { value: "paid", label: "С подпиской" },
  { value: "trial", label: "Пробный доступ" },
  { value: "referral", label: "Реферальный доступ" },
  { value: "active_7d", label: "Активные за 7 дней" },
  { value: "inactive_14d", label: "Без активности 14 дней" },
];

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function userName(
  user: Pick<UserSummary, "displayName" | "firstName" | "lastName" | "username">
): string {
  return (
    user.displayName ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    (user.username ? `@${user.username}` : "Без имени")
  );
}

function accessLabel(access: AccessStatus): string {
  return {
    paid: "Подписка",
    referral: "Реферальный",
    trial: "Пробный",
    expired: "Нет доступа",
  }[access];
}

function App() {
  const session = useQuery({
    queryKey: ["session"],
    queryFn: api.session,
    retry: false,
  });
  if (session.isPending) return <div className="loading-screen" />;
  if (!session.data?.authenticated)
    return (
      <Login
        onSuccess={() =>
          void queryClient.invalidateQueries({ queryKey: ["session"] })
        }
      />
    );
  return <AdminWorkspace />;
}

function Login({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const login = useMutation({ mutationFn: api.login, onSuccess });
  function submit(event: FormEvent) {
    event.preventDefault();
    login.mutate(password);
  }
  return (
    <main className="login-shell">
      <form className="login-card" onSubmit={submit}>
        <div className="login-mark">
          <ShieldCheck size={22} />
        </div>
        <h1>Вход</h1>
        <p>Введите пароль администратора.</p>
        <label htmlFor="password">Пароль</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {login.error ? (
          <p className="form-error">{login.error.message}</p>
        ) : null}
        <button
          className="primary-button full"
          disabled={!password || login.isPending}
          type="submit"
        >
          {login.isPending ? "Проверяем…" : "Продолжить"}
        </button>
      </form>
    </main>
  );
}

function AdminWorkspace() {
  const [page, setPage] =
    useState<(typeof navigation)[number]["id"]>("overview");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const logout = useMutation({
    mutationFn: api.logout,
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["session"] }),
  });
  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <ShieldCheck size={19} />
          </span>
          <span>WhySpent</span>
        </div>
        <nav>
          {navigation.map((item) => (
            <button
              type="button"
              className={page === item.id ? "nav-item active" : "nav-item"}
              key={item.id}
              onClick={() => setPage(item.id)}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>
        <button
          type="button"
          className="nav-item logout"
          onClick={() => logout.mutate()}
        >
          <LogOut size={18} />
          Выйти
        </button>
      </aside>
      <main className="workspace">
        {page === "overview" ? (
          <Overview
            onUsers={() => setPage("users")}
            onBroadcasts={() => setPage("broadcasts")}
          />
        ) : null}
        {page === "users" ? <UsersPage onSelect={setSelectedUserId} /> : null}
        {page === "broadcasts" ? <BroadcastsPage /> : null}
      </main>
      {selectedUserId ? (
        <UserDrawer
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      ) : null}
    </div>
  );
}

function Overview({
  onUsers,
  onBroadcasts,
}: { onUsers: () => void; onBroadcasts: () => void }) {
  const overview = useQuery({ queryKey: ["overview"], queryFn: api.overview });
  if (overview.isPending) return <PageLoading />;
  if (overview.error || !overview.data)
    return <ErrorState onRetry={() => void overview.refetch()} />;
  const { metrics, broadcasts } = overview.data;
  const max = Math.max(1, ...metrics.daily_activity.map((item) => item.users));
  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1>Обзор</h1>
          <p>Ключевые показатели за последние 7 дней.</p>
        </div>
      </header>
      <div className="metric-grid">
        <Metric
          label="Пользователи"
          value={metrics.total_users}
          detail={`+${metrics.new_users_7d} за 7 дней`}
        />
        <Metric
          label="Активные"
          value={metrics.active_users_7d}
          detail="Добавляли траты"
        />
        <Metric
          label="Подписки"
          value={metrics.paid_users}
          detail={`${metrics.free_access_users} с бесплатным доступом`}
        />
        <Metric
          label="Звёзды за 30 дней"
          value={metrics.stars_revenue_30d}
          detail="Оплаченные подписки"
          suffix="★"
        />
      </div>
      <div className="overview-grid">
        <section className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <h2>Активность</h2>
              <p>Пользователи, добавлявшие траты</p>
            </div>
            <span className="chip neutral">7 дней</span>
          </div>
          <div className="activity-chart">
            {metrics.daily_activity.length ? (
              metrics.daily_activity.map((item) => (
                <div className="chart-column" key={item.date}>
                  <span className="chart-value">{item.users}</span>
                  <div className="chart-bar-wrap">
                    <div
                      className="chart-bar"
                      style={{
                        height: `${Math.max(7, (item.users / max) * 100)}%`,
                      }}
                    />
                  </div>
                  <span>
                    {new Intl.DateTimeFormat("ru-RU", {
                      weekday: "short",
                    }).format(new Date(item.date))}
                  </span>
                </div>
              ))
            ) : (
              <div className="empty-chart">Данных пока недостаточно</div>
            )}
          </div>
        </section>
        <section className="panel quick-panel">
          <div className="panel-heading">
            <div>
              <h2>Быстрые действия</h2>
              <p>Частые задачи</p>
            </div>
          </div>
          <button type="button" className="action-row" onClick={onUsers}>
            <Users size={18} />
            <span>
              <b>Найти пользователя</b>
              <small>Доступ, токен и история</small>
            </span>
            <ChevronRight size={18} />
          </button>
          <button type="button" className="action-row" onClick={onBroadcasts}>
            <Send size={18} />
            <span>
              <b>Создать рассылку</b>
              <small>Сначала тест, затем отправка</small>
            </span>
            <ChevronRight size={18} />
          </button>
        </section>
      </div>
      <section className="panel history-panel">
        <div className="panel-heading">
          <div>
            <h2>Последние рассылки</h2>
            <p>Статус доставки сообщений</p>
          </div>
          <button type="button" className="text-button" onClick={onBroadcasts}>
            Открыть рассылки
          </button>
        </div>
        {broadcasts.length ? (
          <div className="history-list">
            {broadcasts.map((broadcast) => (
              <div className="history-row" key={broadcast.id}>
                <div>
                  <b>
                    {
                      segments.find(
                        (segment) => segment.value === broadcast.segment
                      )?.label
                    }
                  </b>
                  <small>{formatDateTime(broadcast.created_at)}</small>
                </div>
                <span>
                  {broadcast.sent_count} из {broadcast.audience_size}
                </span>
                <StatusBadge value={broadcast.status} />
              </div>
            ))}
          </div>
        ) : (
          <Empty
            title="Рассылок пока не было"
            text="Здесь появится история после первой отправки."
          />
        )}
      </section>
    </section>
  );
}

function Metric({
  label,
  value,
  detail,
  suffix,
}: { label: string; value: number; detail: string; suffix?: string }) {
  return (
    <section className="metric-card">
      <span>{label}</span>
      <strong>
        {new Intl.NumberFormat("ru-RU").format(value)}
        {suffix ? ` ${suffix}` : ""}
      </strong>
      <small>{detail}</small>
    </section>
  );
}

function UsersPage({ onSelect }: { onSelect: (id: string) => void }) {
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState("all");
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [search, segment]);
  const users = useQuery({
    queryKey: ["users", page, search, segment],
    queryFn: () => api.users(page, search, segment),
  });
  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1>Пользователи</h1>
          <p>Доступ, токены и история действий.</p>
        </div>
      </header>
      <div className="toolbar">
        <label className="search-field">
          <Search size={18} />
          <input
            placeholder="Имя, @username или Telegram ID"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <select
          value={segment}
          onChange={(event) => setSegment(event.target.value)}
          aria-label="Фильтр доступа"
        >
          <option value="all">Все статусы</option>
          <option value="paid">Подписка</option>
          <option value="trial">Пробный</option>
          <option value="referral">Реферальный</option>
          <option value="expired">Нет доступа</option>
        </select>
      </div>
      <section className="panel table-panel">
        {users.isPending ? (
          <PageLoading />
        ) : users.error || !users.data ? (
          <ErrorState onRetry={() => void users.refetch()} />
        ) : (
          <>
            <div className="user-table">
              <div className="table-head">
                <span>Пользователь</span>
                <span>Доступ</span>
                <span>До</span>
                <span>Последняя активность</span>
                <span />
              </div>
              {users.data.users.map((user) => (
                <button
                  type="button"
                  className="table-row"
                  key={user.id}
                  onClick={() => onSelect(user.id)}
                >
                  <span className="person">
                    <span className="avatar">
                      {userName(user).slice(0, 1).toUpperCase()}
                    </span>
                    <span>
                      <b>{userName(user)}</b>
                      <small>
                        {user.username
                          ? `@${user.username}`
                          : `ID ${user.telegramId}`}
                      </small>
                    </span>
                  </span>
                  <StatusBadge value={user.access} />
                  <span>
                    {formatDate(
                      user.paidUntil ??
                        user.referralAccessUntil ??
                        user.trialEndsAt
                    )}
                  </span>
                  <span>{formatDateTime(user.lastActivityAt)}</span>
                  <ChevronRight size={18} />
                </button>
              ))}
            </div>
            {users.data.users.length === 0 ? (
              <Empty
                title="Никого не нашли"
                text="Попробуйте изменить запрос или фильтр."
              />
            ) : null}
            <div className="pagination">
              <span>{users.data.total} пользователей</span>
              <div>
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                >
                  <ChevronLeft size={18} />
                </button>
                <span>{page + 1}</span>
                <button
                  type="button"
                  disabled={users.data.users.length < users.data.pageSize}
                  onClick={() => setPage((current) => current + 1)}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </section>
  );
}

function UserDrawer({
  userId,
  onClose,
}: { userId: string; onClose: () => void }) {
  const client = useQueryClient();
  const detail = useQuery({
    queryKey: ["user", userId],
    queryFn: () => api.user(userId),
  });
  const [dialog, setDialog] = useState<
    "extend" | "revoke-access" | "revoke-tokens" | null
  >(null);
  const update = useMutation({
    mutationFn: async (
      payload:
        | { action: "adjust"; kind: AccessKind; days: number }
        | { action: "revoke-access" | "revoke-tokens" }
    ) => {
      if (payload.action === "adjust")
        return api.adjustAccess(userId, payload.kind, payload.days);
      return payload.action === "revoke-access"
        ? api.revokeAccess(userId)
        : api.revokeTokens(userId);
    },
    onSuccess: () => {
      setDialog(null);
      void client.invalidateQueries({ queryKey: ["user", userId] });
      void client.invalidateQueries({ queryKey: ["users"] });
      void client.invalidateQueries({ queryKey: ["overview"] });
    },
  });
  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <dialog
        open
        className="drawer"
        aria-label="Пользователь"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="icon-button drawer-close"
          onClick={onClose}
          aria-label="Закрыть"
        >
          <X size={20} />
        </button>
        {detail.isPending ? (
          <PageLoading />
        ) : detail.error || !detail.data ? (
          <ErrorState onRetry={() => void detail.refetch()} />
        ) : (
          <UserContent detail={detail.data} onDialog={setDialog} />
        )}
      </dialog>
      {dialog && detail.data ? (
        <AccessDialog
          type={dialog}
          pending={update.isPending}
          error={update.error?.message}
          onClose={() => setDialog(null)}
          onSubmit={(kind, days) => {
            if (kind) {
              update.mutate({ action: "adjust", kind, days: days ?? 7 });
            } else if (dialog === "revoke-access") {
              update.mutate({ action: "revoke-access" });
            } else {
              update.mutate({ action: "revoke-tokens" });
            }
          }}
        />
      ) : null}
    </div>
  );
}

function UserContent({
  detail,
  onDialog,
}: {
  detail: UserDetail;
  onDialog: (value: "extend" | "revoke-access" | "revoke-tokens") => void;
}) {
  const { user } = detail;
  return (
    <>
      <header className="drawer-header">
        <span className="avatar large">
          {userName(user).slice(0, 1).toUpperCase()}
        </span>
        <div>
          <h2>{userName(user)}</h2>
          <p>{user.username ? `@${user.username}` : `ID ${user.telegramId}`}</p>
        </div>
        <StatusBadge value={user.access} />
      </header>
      <section className="detail-section">
        <h3>Доступ</h3>
        <dl>
          <div>
            <dt>Подписка до</dt>
            <dd>{formatDate(user.paidUntil)}</dd>
          </div>
          <div>
            <dt>Бесплатный доступ до</dt>
            <dd>{formatDate(user.referralAccessUntil ?? user.trialEndsAt)}</dd>
          </div>
          <div>
            <dt>Токен</dt>
            <dd>{user.activeTokenCount ? "Активен" : "Нет активного"}</dd>
          </div>
          <div>
            <dt>Последняя активность</dt>
            <dd>{formatDateTime(user.lastActivityAt)}</dd>
          </div>
        </dl>
      </section>
      <section className="detail-section">
        <h3>Действия</h3>
        <button
          type="button"
          className="outline-action"
          onClick={() => onDialog("extend")}
        >
          <CreditCard size={18} />
          Выдать или продлить доступ
          <ChevronRight size={18} />
        </button>
        <button
          type="button"
          className="outline-action danger"
          onClick={() => onDialog("revoke-access")}
        >
          <X size={18} />
          Отозвать доступ
          <ChevronRight size={18} />
        </button>
        <button
          type="button"
          className="outline-action danger"
          onClick={() => onDialog("revoke-tokens")}
        >
          <KeyRound size={18} />
          Отозвать токен
          <ChevronRight size={18} />
        </button>
      </section>
      <section className="detail-section">
        <h3>Платежи</h3>
        {detail.payments.length ? (
          <div className="compact-list">
            {detail.payments.map((payment) => (
              <div key={payment.id}>
                <span>
                  {payment.amount}{" "}
                  {payment.currency === "XTR" ? "★" : payment.currency}
                </span>
                <small>{formatDate(payment.created_at)}</small>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">Платежей пока не было.</p>
        )}
      </section>
      <section className="detail-section">
        <h3>История</h3>
        {detail.audit.length ? (
          <div className="timeline">
            {detail.audit.map((event) => (
              <div key={event.id}>
                <i />
                <span>{event.action.replace(/_/g, " ")}</span>
                <small>{formatDateTime(event.created_at)}</small>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">Ручных действий пока не было.</p>
        )}
      </section>
    </>
  );
}

function AccessDialog({
  type,
  pending,
  error,
  onClose,
  onSubmit,
}: {
  type: "extend" | "revoke-access" | "revoke-tokens";
  pending: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (kind?: AccessKind, days?: number) => void;
}) {
  const [kind, setKind] = useState<AccessKind>("paid");
  const [days, setDays] = useState("30");
  const title =
    type === "extend"
      ? "Выдать доступ"
      : type === "revoke-access"
        ? "Отозвать доступ?"
        : "Отозвать токен?";
  const description =
    type === "extend"
      ? "Срок будет продлён от текущей даты окончания или от сегодняшнего дня."
      : type === "revoke-access"
        ? "Пользователь сразу потеряет возможность добавлять расходы через Shortcut. История платежей сохранится."
        : "Текущий Shortcut перестанет работать. Пользователь сможет выпустить новый токен через бота.";
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <dialog
        open
        className="modal"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2>{title}</h2>
        <p>{description}</p>
        {type === "extend" ? (
          <>
            <label>
              Тип доступа
              <select
                value={kind}
                onChange={(event) => setKind(event.target.value as AccessKind)}
              >
                <option value="paid">Подписка</option>
                <option value="referral">Бесплатный доступ</option>
                <option value="trial">Пробный доступ</option>
              </select>
            </label>
            <label>
              Дней
              <input
                inputMode="numeric"
                value={days}
                onChange={(event) =>
                  setDays(event.target.value.replace(/\D/g, ""))
                }
              />
            </label>
          </>
        ) : null}
        {error ? <p className="form-error">{error}</p> : null}
        <footer>
          <button type="button" className="secondary-button" onClick={onClose}>
            Отмена
          </button>
          <button
            type="button"
            className={type === "extend" ? "primary-button" : "danger-button"}
            disabled={
              pending ||
              (type === "extend" && (!Number(days) || Number(days) > 3650))
            }
            onClick={() =>
              onSubmit(
                type === "extend" ? kind : undefined,
                type === "extend" ? Number(days) : undefined
              )
            }
          >
            {pending
              ? "Сохраняем…"
              : type === "extend"
                ? "Выдать доступ"
                : "Подтвердить"}
          </button>
        </footer>
      </dialog>
    </div>
  );
}

function BroadcastsPage() {
  const client = useQueryClient();
  const [segment, setSegment] = useState<Segment>("paid");
  const [message, setMessage] = useState("");
  const [testId, setTestId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const audience = useQuery({
    queryKey: ["audience", segment],
    queryFn: () => api.audience(segment),
  });
  const test = useMutation({
    mutationFn: () => api.testBroadcast(segment, message),
    onSuccess: (result) => setTestId(result.testId),
  });
  const create = useMutation({
    mutationFn: () => api.createBroadcast(segment, message, testId ?? ""),
    onSuccess: async () => {
      setConfirming(false);
      setTestId(null);
      setMessage("");
      await client.invalidateQueries({ queryKey: ["overview"] });
    },
  });
  useEffect(() => setTestId(null), [segment, message]);
  const ready =
    message.trim().length > 0 &&
    message.trim().length <= 3000 &&
    Boolean(testId) &&
    (audience.data?.count ?? 0) > 0;
  return (
    <section className="page">
      <header className="page-header">
        <div>
          <h1>Рассылки</h1>
          <p>
            Сообщение сначала приходит вам для проверки. Затем вы подтверждаете
            отправку выбранному сегменту.
          </p>
        </div>
      </header>
      <section className="panel composer">
        <div className="composer-step">
          <span>1</span>
          <div>
            <h2>Получатели</h2>
            <p>Выберите сегмент.</p>
          </div>
        </div>
        <select
          value={segment}
          onChange={(event) => setSegment(event.target.value as Segment)}
        >
          {segments.map((item) => (
            <option value={item.value} key={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <p className="recipient-count">
          {audience.isPending
            ? "Считаем получателей…"
            : `${audience.data?.count ?? 0} получателей`}
        </p>
        <div className="composer-step">
          <span>2</span>
          <div>
            <h2>Сообщение</h2>
            <p>Только обычный текст, без скрытого форматирования.</p>
          </div>
        </div>
        <textarea
          value={message}
          maxLength={3000}
          placeholder="Напишите сообщение…"
          onChange={(event) => setMessage(event.target.value)}
        />
        <div className="composer-meta">
          <span>{message.length} / 3000</span>
          {testId ? (
            <span className="test-ready">
              <Check size={15} />
              Тест отправлен
            </span>
          ) : null}
        </div>
        <div className="composer-step">
          <span>3</span>
          <div>
            <h2>Проверка и отправка</h2>
            <p>После изменения текста тест нужно отправить заново.</p>
          </div>
        </div>
        <div className="composer-actions">
          <button
            type="button"
            className="secondary-button"
            disabled={!message.trim() || test.isPending}
            onClick={() => test.mutate()}
          >
            {test.isPending ? "Отправляем…" : "Отправить тест себе"}
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={!ready || create.isPending}
            onClick={() => setConfirming(true)}
          >
            {create.isPending ? "Ставим в очередь…" : "Подтвердить отправку"}
          </button>
        </div>
        {test.error ? <p className="form-error">{test.error.message}</p> : null}
        {create.error ? (
          <p className="form-error">{create.error.message}</p>
        ) : null}
      </section>
      {confirming ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => setConfirming(false)}
        >
          <dialog
            open
            className="modal"
            aria-label="Подтверждение рассылки"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2>Отправить сообщение?</h2>
            <p>
              Оно уйдёт {audience.data?.count ?? 0} пользователям из сегмента «
              {segments.find((item) => item.value === segment)?.label}».
            </p>
            <footer>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setConfirming(false)}
              >
                Отмена
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => create.mutate()}
                disabled={create.isPending}
              >
                Отправить
              </button>
            </footer>
          </dialog>
        </div>
      ) : null}
    </section>
  );
}

function StatusBadge({
  value,
}: {
  value:
    | AccessStatus
    | "queued"
    | "processing"
    | "completed"
    | "completed_with_errors"
    | "cancelled";
}) {
  const labels: Record<string, string> = {
    queued: "В очереди",
    processing: "Отправляется",
    completed: "Отправлено",
    completed_with_errors: "С ошибками",
    cancelled: "Отменено",
  };
  const label =
    value in labels ? labels[value] : accessLabel(value as AccessStatus);
  return <span className={`chip ${value}`}>{label}</span>;
}
function PageLoading() {
  return (
    <div className="page-loading">
      <Activity size={18} />
      Загружаем…
    </div>
  );
}
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="error-state">
      <p>Не удалось загрузить данные.</p>
      <button type="button" className="secondary-button" onClick={onRetry}>
        Повторить
      </button>
    </div>
  );
}
function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty">
      <b>{title}</b>
      <p>{text}</p>
    </div>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

createRoot(root).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
