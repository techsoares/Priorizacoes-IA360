-- Import detailed costs from "Demandas da area de IA360 - Custos_Detalhados.pdf"
-- Columns mapped:
--   Custo considerado    -> cost_per_hour (R$/h das pessoas afetadas)
--   Custo hora desenv.   -> tech_hour_cost
--   Horas Terceiros      -> third_party_hours
--   Custo Unit. Terceiros-> third_party_hour_cost
--   Custo Infra          -> cloud_infra_cost
--   Custo token          -> token_cost

-- Page 1
UPDATE initiatives SET cost_per_hour=21.63, tech_hour_cost=29.36, third_party_hours=0.5, third_party_hour_cost=45.69, cloud_infra_cost=0, token_cost=0.22 WHERE jira_key='EF-1';
UPDATE initiatives SET cloud_infra_cost=2.72 WHERE jira_key='EF-100';
UPDATE initiatives SET cost_per_hour=14.91, tech_hour_cost=36.62, third_party_hours=0, third_party_hour_cost=0, cloud_infra_cost=2.72, token_cost=0 WHERE jira_key='EF-101';
UPDATE initiatives SET cost_per_hour=17.23, tech_hour_cost=36.62, third_party_hours=0, third_party_hour_cost=0, cloud_infra_cost=2.72, token_cost=0 WHERE jira_key='EF-102';
UPDATE initiatives SET cloud_infra_cost=2.72 WHERE jira_key='EF-103';
UPDATE initiatives SET cloud_infra_cost=2.72 WHERE jira_key='EF-106';
UPDATE initiatives SET cloud_infra_cost=2.72 WHERE jira_key='EF-107';
UPDATE initiatives SET cost_per_hour=33.64, tech_hour_cost=33.64, third_party_hours=0, third_party_hour_cost=0, cloud_infra_cost=2.72, token_cost=0 WHERE jira_key='EF-108';
UPDATE initiatives SET cost_per_hour=18.77, tech_hour_cost=29.36, third_party_hours=0, third_party_hour_cost=0, cloud_infra_cost=2.72, token_cost=0 WHERE jira_key='EF-109';
UPDATE initiatives SET cloud_infra_cost=2.72 WHERE jira_key='EF-110';
UPDATE initiatives SET cost_per_hour=18.77, tech_hour_cost=29.36, third_party_hours=0, third_party_hour_cost=0, cloud_infra_cost=2.72, token_cost=3.00 WHERE jira_key='EF-111';
UPDATE initiatives SET cloud_infra_cost=2.72 WHERE jira_key='EF-112';
UPDATE initiatives SET cost_per_hour=14.91, tech_hour_cost=29.36, third_party_hours=0, third_party_hour_cost=0, cloud_infra_cost=2.72, token_cost=0 WHERE jira_key='EF-113';
UPDATE initiatives SET cost_per_hour=17.53, tech_hour_cost=29.36, third_party_hours=0, third_party_hour_cost=0, cloud_infra_cost=2.72, token_cost=0 WHERE jira_key='EF-114';
UPDATE initiatives SET cloud_infra_cost=2.72 WHERE jira_key='EF-115';
UPDATE initiatives SET cloud_infra_cost=2.72 WHERE jira_key='EF-116';
UPDATE initiatives SET cloud_infra_cost=2.72 WHERE jira_key='EF-117';
UPDATE initiatives SET cost_per_hour=14.91, tech_hour_cost=17.53, third_party_hours=0, third_party_hour_cost=0, cloud_infra_cost=2.72, token_cost=0 WHERE jira_key='EF-118';
UPDATE initiatives SET cloud_infra_cost=2.72 WHERE jira_key='EF-119';
UPDATE initiatives SET cost_per_hour=21.63, tech_hour_cost=29.36, third_party_hours=1, third_party_hour_cost=33.51, cloud_infra_cost=2.72, token_cost=0 WHERE jira_key='EF-120';
UPDATE initiatives SET cost_per_hour=22.69, tech_hour_cost=17.27, third_party_hours=3, third_party_hour_cost=17.27, cloud_infra_cost=2.72, token_cost=0 WHERE jira_key='EF-121';
UPDATE initiatives SET cloud_infra_cost=2.72 WHERE jira_key='EF-122';
UPDATE initiatives SET cloud_infra_cost=2.72 WHERE jira_key='EF-124';
UPDATE initiatives SET cost_per_hour=29.36, tech_hour_cost=28.81, third_party_hours=0, third_party_hour_cost=0, cloud_infra_cost=2.72, token_cost=0 WHERE jira_key='EF-125';
UPDATE initiatives SET cloud_infra_cost=2.72 WHERE jira_key='EF-126';
UPDATE initiatives SET cloud_infra_cost=2.72 WHERE jira_key='EF-127';
UPDATE initiatives SET cloud_infra_cost=2.72 WHERE jira_key='EF-128';
UPDATE initiatives SET cloud_infra_cost=2.72 WHERE jira_key='EF-129';
UPDATE initiatives SET cloud_infra_cost=2.72 WHERE jira_key='EF-130';

-- Page 2
UPDATE initiatives SET cloud_infra_cost=2.72 WHERE jira_key='EF-131';
UPDATE initiatives SET cloud_infra_cost=2.72 WHERE jira_key='EF-132';
UPDATE initiatives SET cloud_infra_cost=2.72 WHERE jira_key='EF-133';
UPDATE initiatives SET cloud_infra_cost=2.72 WHERE jira_key='EF-134';
UPDATE initiatives SET cloud_infra_cost=2.72 WHERE jira_key='EF-135';
UPDATE initiatives SET cloud_infra_cost=2.72 WHERE jira_key='EF-136';
UPDATE initiatives SET cloud_infra_cost=2.72 WHERE jira_key='EF-137';
UPDATE initiatives SET cloud_infra_cost=2.72 WHERE jira_key='EF-138';
UPDATE initiatives SET cloud_infra_cost=2.72 WHERE jira_key='EF-139';
UPDATE initiatives SET cloud_infra_cost=2.72 WHERE jira_key='EF-140';
UPDATE initiatives SET cloud_infra_cost=2.72 WHERE jira_key='EF-141';
UPDATE initiatives SET cloud_infra_cost=2.72 WHERE jira_key='EF-142';
UPDATE initiatives SET cloud_infra_cost=2.72 WHERE jira_key='EF-143';
UPDATE initiatives SET cloud_infra_cost=2.72 WHERE jira_key='EF-144';
UPDATE initiatives SET cloud_infra_cost=2.72 WHERE jira_key='EF-145';
UPDATE initiatives SET cloud_infra_cost=2.72 WHERE jira_key='EF-146';
UPDATE initiatives SET cloud_infra_cost=2.72 WHERE jira_key='EF-147';
UPDATE initiatives SET cost_per_hour=62.12, tech_hour_cost=29.36, third_party_hours=2, third_party_hour_cost=36.15, cloud_infra_cost=2.72, token_cost=0.20 WHERE jira_key='EF-148';
UPDATE initiatives SET cloud_infra_cost=2.72 WHERE jira_key='EF-149';
UPDATE initiatives SET cost_per_hour=58.97, tech_hour_cost=29.36, third_party_hours=3, third_party_hour_cost=45.69, cloud_infra_cost=2.72, token_cost=8.00 WHERE jira_key='EF-18';
UPDATE initiatives SET cost_per_hour=21.63, tech_hour_cost=29.36, third_party_hours=0, third_party_hour_cost=0, cloud_infra_cost=0, token_cost=0.22 WHERE jira_key='EF-2';
UPDATE initiatives SET cost_per_hour=39.50, tech_hour_cost=29.36, third_party_hours=6, third_party_hour_cost=38.18, cloud_infra_cost=2.72, token_cost=0 WHERE jira_key='EF-20';
UPDATE initiatives SET cost_per_hour=21.63, tech_hour_cost=29.36, third_party_hours=0, third_party_hour_cost=41.39, cloud_infra_cost=0, token_cost=0.16 WHERE jira_key='EF-26';
UPDATE initiatives SET cost_per_hour=21.63, tech_hour_cost=29.36, third_party_hours=0, third_party_hour_cost=41.39, cloud_infra_cost=0, token_cost=0.08 WHERE jira_key='EF-27';
UPDATE initiatives SET cost_per_hour=21.63, tech_hour_cost=29.36, third_party_hours=0, third_party_hour_cost=41.39, cloud_infra_cost=0, token_cost=0.16 WHERE jira_key='EF-28';
UPDATE initiatives SET cost_per_hour=21.63, tech_hour_cost=29.36, third_party_hours=1, third_party_hour_cost=51.02, cloud_infra_cost=0, token_cost=3.00 WHERE jira_key='EF-29';
UPDATE initiatives SET cost_per_hour=21.63, tech_hour_cost=29.36, third_party_hours=0, third_party_hour_cost=41.39, cloud_infra_cost=0, token_cost=0.16 WHERE jira_key='EF-3';
UPDATE initiatives SET cost_per_hour=21.63, tech_hour_cost=29.36, third_party_hours=0, third_party_hour_cost=41.39, cloud_infra_cost=0, token_cost=0.08 WHERE jira_key='EF-30';
UPDATE initiatives SET cost_per_hour=21.63, tech_hour_cost=29.36, third_party_hours=0, third_party_hour_cost=41.39, cloud_infra_cost=0, token_cost=0.08 WHERE jira_key='EF-31';

-- Page 3
UPDATE initiatives SET cost_per_hour=21.63, tech_hour_cost=29.36, third_party_hours=0, third_party_hour_cost=41.39, cloud_infra_cost=0, token_cost=0.08 WHERE jira_key='EF-32';
UPDATE initiatives SET cost_per_hour=21.63, tech_hour_cost=29.36, third_party_hours=0, third_party_hour_cost=41.39, cloud_infra_cost=0, token_cost=0.08 WHERE jira_key='EF-33';
UPDATE initiatives SET cost_per_hour=21.63, tech_hour_cost=29.36, third_party_hours=0, third_party_hour_cost=41.39, cloud_infra_cost=0, token_cost=0.08 WHERE jira_key='EF-34';
UPDATE initiatives SET cost_per_hour=21.63, tech_hour_cost=29.36, third_party_hours=0, third_party_hour_cost=41.39, cloud_infra_cost=0, token_cost=0.08 WHERE jira_key='EF-35';
UPDATE initiatives SET cost_per_hour=21.63, tech_hour_cost=29.36, third_party_hours=0, third_party_hour_cost=41.39, cloud_infra_cost=0, token_cost=0.08 WHERE jira_key='EF-36';
UPDATE initiatives SET cost_per_hour=21.63, tech_hour_cost=29.36, third_party_hours=0.2, third_party_hour_cost=41.39, cloud_infra_cost=0, token_cost=0.22 WHERE jira_key='EF-39';
UPDATE initiatives SET cost_per_hour=21.63, tech_hour_cost=29.36, third_party_hours=0.5, third_party_hour_cost=49.05, cloud_infra_cost=0, token_cost=0.16 WHERE jira_key='EF-40';
UPDATE initiatives SET cost_per_hour=31.21, tech_hour_cost=29.36, third_party_hours=3, third_party_hour_cost=53.25, cloud_infra_cost=2.72, token_cost=2.00 WHERE jira_key='EF-41';
UPDATE initiatives SET cost_per_hour=31.21, tech_hour_cost=29.36, third_party_hours=1, third_party_hour_cost=53.25, cloud_infra_cost=0, token_cost=5.00 WHERE jira_key='EF-42';
UPDATE initiatives SET cost_per_hour=29.36, tech_hour_cost=29.36, third_party_hours=1, third_party_hour_cost=51.02, cloud_infra_cost=2.72, token_cost=0 WHERE jira_key='EF-43';
UPDATE initiatives SET cost_per_hour=23.92, tech_hour_cost=29.36, third_party_hours=3, third_party_hour_cost=56.01, cloud_infra_cost=2.72, token_cost=8.00 WHERE jira_key='EF-46';
UPDATE initiatives SET cost_per_hour=43.86, tech_hour_cost=29.36, third_party_hours=3, third_party_hour_cost=59.02, cloud_infra_cost=2.72, token_cost=2.00 WHERE jira_key='EF-51';
UPDATE initiatives SET cost_per_hour=139.96, tech_hour_cost=29.36, third_party_hours=10, third_party_hour_cost=98.57, cloud_infra_cost=2.72, token_cost=0 WHERE jira_key='EF-54';
UPDATE initiatives SET cost_per_hour=34.88, tech_hour_cost=29.36, third_party_hours=1, third_party_hour_cost=49.96, cloud_infra_cost=2.72, token_cost=10.00 WHERE jira_key='EF-55';
UPDATE initiatives SET cost_per_hour=21.63, tech_hour_cost=29.36, third_party_hours=6, third_party_hour_cost=42.58, cloud_infra_cost=2.72, token_cost=2.00 WHERE jira_key='EF-59';
UPDATE initiatives SET cost_per_hour=41.92, tech_hour_cost=29.36, third_party_hours=0, third_party_hour_cost=0, cloud_infra_cost=2.72, token_cost=5.00 WHERE jira_key='EF-62';
UPDATE initiatives SET cost_per_hour=20.49, tech_hour_cost=29.36, third_party_hours=0, third_party_hour_cost=0, cloud_infra_cost=2.72, token_cost=0 WHERE jira_key='EF-68';
UPDATE initiatives SET cost_per_hour=57.95, tech_hour_cost=29.36, third_party_hours=0, third_party_hour_cost=0, cloud_infra_cost=2.72, token_cost=10.00 WHERE jira_key='EF-69';
UPDATE initiatives SET cost_per_hour=21.63, tech_hour_cost=29.36, third_party_hours=0, third_party_hour_cost=0, cloud_infra_cost=0, token_cost=4.00 WHERE jira_key='EF-7';
UPDATE initiatives SET cost_per_hour=103.90, tech_hour_cost=29.36, third_party_hours=0, third_party_hour_cost=0, cloud_infra_cost=2.72, token_cost=1.00 WHERE jira_key='EF-72';
UPDATE initiatives SET cost_per_hour=36.66, tech_hour_cost=29.36, third_party_hours=0, third_party_hour_cost=0, cloud_infra_cost=2.72, token_cost=0 WHERE jira_key='EF-73';
UPDATE initiatives SET cost_per_hour=46.05, tech_hour_cost=29.36, third_party_hours=0, third_party_hour_cost=0, cloud_infra_cost=2.72, token_cost=0 WHERE jira_key='EF-81';
UPDATE initiatives SET cost_per_hour=56.05, tech_hour_cost=29.36, third_party_hours=5, third_party_hour_cost=62.01, cloud_infra_cost=2.72, token_cost=3.00 WHERE jira_key='EF-89';
UPDATE initiatives SET cost_per_hour=43.86, tech_hour_cost=29.36, third_party_hours=1, third_party_hour_cost=58.14, cloud_infra_cost=2.72, token_cost=1.00 WHERE jira_key='EF-90';
UPDATE initiatives SET cost_per_hour=50.00, tech_hour_cost=29.36, third_party_hours=4, third_party_hour_cost=62.01, cloud_infra_cost=2.72, token_cost=3.00 WHERE jira_key='EF-91';
UPDATE initiatives SET cost_per_hour=29.36, tech_hour_cost=29.36, third_party_hours=3, third_party_hour_cost=48.55, cloud_infra_cost=2.72, token_cost=2.00 WHERE jira_key='EF-92';
UPDATE initiatives SET cost_per_hour=139.96, tech_hour_cost=29.36, third_party_hours=1, third_party_hour_cost=88.02, cloud_infra_cost=2.72, token_cost=0 WHERE jira_key='EF-93';
UPDATE initiatives SET cost_per_hour=39.50, tech_hour_cost=29.36, third_party_hours=0, third_party_hour_cost=0, cloud_infra_cost=2.72, token_cost=0 WHERE jira_key='EF-94';
UPDATE initiatives SET cost_per_hour=56.05, tech_hour_cost=29.36, third_party_hours=3, third_party_hour_cost=39.02, cloud_infra_cost=2.72, token_cost=50.00 WHERE jira_key='EF-95';

-- Page 4
UPDATE initiatives SET cost_per_hour=38.50, tech_hour_cost=29.36, third_party_hours=0, third_party_hour_cost=0, cloud_infra_cost=2.72, token_cost=2.00 WHERE jira_key='EF-96';
UPDATE initiatives SET cost_per_hour=41.03, tech_hour_cost=29.36, third_party_hours=0, third_party_hour_cost=0, cloud_infra_cost=2.72, token_cost=0 WHERE jira_key='EF-97';
UPDATE initiatives SET cost_per_hour=109.03, tech_hour_cost=29.36, third_party_hours=1, third_party_hour_cost=48.77, cloud_infra_cost=2.72, token_cost=0 WHERE jira_key='EF-98';
UPDATE initiatives SET cost_per_hour=60.71, tech_hour_cost=29.36, third_party_hours=1, third_party_hour_cost=48.77, cloud_infra_cost=2.72, token_cost=0 WHERE jira_key='EF-151';
UPDATE initiatives SET cost_per_hour=25.00, tech_hour_cost=29.36, third_party_hours=0, third_party_hour_cost=0, cloud_infra_cost=2.72, token_cost=0 WHERE jira_key='EF-152';
UPDATE initiatives SET cost_per_hour=38.11, tech_hour_cost=33.64, third_party_hours=0, third_party_hour_cost=0, cloud_infra_cost=2.72, token_cost=0 WHERE jira_key='EF-158';
UPDATE initiatives SET cost_per_hour=38.11, tech_hour_cost=33.64, third_party_hours=0, third_party_hour_cost=0, cloud_infra_cost=2.72, token_cost=0 WHERE jira_key='EF-159';
UPDATE initiatives SET cost_per_hour=60.71, tech_hour_cost=29.36, third_party_hours=0, third_party_hour_cost=0, cloud_infra_cost=2.72, token_cost=0 WHERE jira_key='EF-160';
UPDATE initiatives SET cost_per_hour=63.91, tech_hour_cost=29.36, third_party_hours=0, third_party_hour_cost=0, cloud_infra_cost=2.72, token_cost=0 WHERE jira_key='EF-161';
UPDATE initiatives SET cost_per_hour=59.31, tech_hour_cost=29.36, third_party_hours=7, third_party_hour_cost=35.79, cloud_infra_cost=2.72, token_cost=0 WHERE jira_key='EF-162';
UPDATE initiatives SET cost_per_hour=18.18, tech_hour_cost=29.36, third_party_hours=1, third_party_hour_cost=18.88, cloud_infra_cost=2.72, token_cost=0 WHERE jira_key='EF-164';
UPDATE initiatives SET cost_per_hour=22.73, tech_hour_cost=17.53, third_party_hours=1, third_party_hour_cost=0, cloud_infra_cost=2.72, token_cost=3.00 WHERE jira_key='EF-156';
UPDATE initiatives SET cost_per_hour=18.18, tech_hour_cost=29.36, third_party_hours=0, third_party_hour_cost=0, cloud_infra_cost=2.72, token_cost=1.00 WHERE jira_key='EF-155';
UPDATE initiatives SET cost_per_hour=22.73, tech_hour_cost=33.64, third_party_hours=0, third_party_hour_cost=0, cloud_infra_cost=2.72, token_cost=0 WHERE jira_key='EF-154';
UPDATE initiatives SET cost_per_hour=36.62, tech_hour_cost=36.62, third_party_hours=0, third_party_hour_cost=0, cloud_infra_cost=2.72, token_cost=0 WHERE jira_key='EF-153';
UPDATE initiatives SET cost_per_hour=22.73, tech_hour_cost=33.64, third_party_hours=4, third_party_hour_cost=33.17, cloud_infra_cost=2.72, token_cost=0 WHERE jira_key='EF-150';
UPDATE initiatives SET cost_per_hour=36.62, tech_hour_cost=33.64, third_party_hours=1, third_party_hour_cost=36.62, cloud_infra_cost=2.72, token_cost=0 WHERE jira_key='EF-157';
UPDATE initiatives SET cost_per_hour=18.75, tech_hour_cost=29.36, third_party_hours=0, third_party_hour_cost=0, cloud_infra_cost=2.72, token_cost=0 WHERE jira_key='EF-166';
UPDATE initiatives SET cost_per_hour=14.72, tech_hour_cost=29.36, third_party_hours=0, third_party_hour_cost=0, cloud_infra_cost=2.72, token_cost=0 WHERE jira_key='EF-167';
UPDATE initiatives SET cost_per_hour=14.72, tech_hour_cost=29.36, third_party_hours=0, third_party_hour_cost=0, cloud_infra_cost=2.72, token_cost=3.00 WHERE jira_key='EF-168';
UPDATE initiatives SET cost_per_hour=18.77, tech_hour_cost=29.36, third_party_hours=0, third_party_hour_cost=0, cloud_infra_cost=2.72, token_cost=10.00 WHERE jira_key='EF-169';
UPDATE initiatives SET cost_per_hour=18.77, tech_hour_cost=29.36, third_party_hours=0, third_party_hour_cost=0, cloud_infra_cost=2.72, token_cost=0 WHERE jira_key='EF-170';
UPDATE initiatives SET cost_per_hour=18.77, tech_hour_cost=33.64, third_party_hours=1, third_party_hour_cost=36.62, cloud_infra_cost=2.72, token_cost=1.00 WHERE jira_key='EF-200';
UPDATE initiatives SET cost_per_hour=25.64, tech_hour_cost=33.64, third_party_hours=1, third_party_hour_cost=36.62, cloud_infra_cost=2.72, token_cost=1.00 WHERE jira_key='EF-201';
UPDATE initiatives SET cost_per_hour=20.36, tech_hour_cost=33.64, third_party_hours=1, third_party_hour_cost=36.62, cloud_infra_cost=2.72, token_cost=1.00 WHERE jira_key='EF-202';
UPDATE initiatives SET cost_per_hour=20.36, tech_hour_cost=33.64, third_party_hours=1, third_party_hour_cost=36.62, cloud_infra_cost=2.72, token_cost=0 WHERE jira_key='EF-203';
UPDATE initiatives SET cost_per_hour=36.62, tech_hour_cost=33.64, third_party_hours=0, third_party_hour_cost=0, cloud_infra_cost=2.72, token_cost=0 WHERE jira_key='EF-204';
UPDATE initiatives SET cost_per_hour=37.70, tech_hour_cost=36.36, third_party_hours=1, third_party_hour_cost=37.70, cloud_infra_cost=90, token_cost=10.00 WHERE jira_key='EF-205';
UPDATE initiatives SET cost_per_hour=18.77, tech_hour_cost=18.77, third_party_hours=0, third_party_hour_cost=0, cloud_infra_cost=90, token_cost=10.00 WHERE jira_key='EF-206';
