insert into public.currencies (code, name, symbol, decimals, is_active)
values
  ('CNY', 'Chinese Yuan', '¥', 2, true),
  ('EUR', 'Euro', '€', 2, true),
  ('GBP', 'British Pound', '£', 2, true),
  ('JPY', 'Japanese Yen', '¥', 0, true),
  ('RUB', 'Russian Ruble', '₽', 2, true),
  ('USD', 'US Dollar', '$', 2, true)
on conflict (code) do update
set
  name = excluded.name,
  symbol = excluded.symbol,
  decimals = excluded.decimals,
  is_active = excluded.is_active;

insert into public.categories (
  id,
  user_id,
  type,
  name,
  icon,
  color,
  sort_order,
  is_archived
)
values
  ('27be5565-c758-4c30-92e5-5d9d51e421ee', null, 'expense', 'Food & Drink', ':fork:', '#FF9F0A', 10, false),
  ('00000000-0000-4000-8000-000000000002', null, 'expense', 'Shopping', ':cart:', '#FFD60A', 20, false),
  ('00000000-0000-4000-8000-000000000003', null, 'expense', 'Travel', ':plane:', '#30D158', 30, false),
  ('00000000-0000-4000-8000-000000000004', null, 'expense', 'Transport', ':bus:', '#0A84FF', 40, false),
  ('00000000-0000-4000-8000-000000000005', null, 'expense', 'Services', ':wrench:', '#BF5AF2', 50, false),
  ('00000000-0000-4000-8000-000000000006', null, 'expense', 'Fun', ':gamecontroller:', '#FF375F', 60, false),
  ('00000000-0000-4000-8000-000000000007', null, 'expense', 'Health', ':heart:', '#FF453A', 70, false),
  ('00000000-0000-4000-8000-000000000008', null, 'expense', 'Other', ':more:', '#8E8E93', 80, false),
  ('00000000-0000-4000-8000-000000000009', null, 'income', 'Salary', ':banknote:', '#30D158', 10, false),
  ('00000000-0000-4000-8000-000000000010', null, 'income', 'Investment', ':chart:', '#0A84FF', 20, false),
  ('00000000-0000-4000-8000-000000000011', null, 'income', 'Other', ':more:', '#8E8E93', 30, false)
on conflict (id) do update
set
  user_id = excluded.user_id,
  type = excluded.type,
  name = excluded.name,
  icon = excluded.icon,
  color = excluded.color,
  sort_order = excluded.sort_order,
  is_archived = excluded.is_archived;
