"""Análise do Painel de Controle ON - dados reais do Supabase"""

# Dados reais do banco
time_saved_per_day = 1.00
affected_people_count = 1.00
execution_days_per_month = 26.00
cost_per_hour = 36.62
dev_seconds = 144000.00
tech_hour_cost = 33.64
cloud_infra_cost = 2.72

# Ganhos
hours_per_person = time_saved_per_day * execution_days_per_month
total_hours_saved = hours_per_person * affected_people_count
gain_hours = total_hours_saved * cost_per_hour
total_gains = gain_hours  # HC e Produtividade = 0

# Custos
dev_hours = dev_seconds / 3600
cost_dev = dev_hours * tech_hour_cost
total_costs = cost_dev + cloud_infra_cost

# ROI e Payback
annual_gains = total_gains * 12
roi = ((annual_gains - total_costs) / total_costs) * 100
payback = total_costs / total_gains

print("=" * 55)
print("  PAINEL DE CONTROLE ON - DADOS REAIS DO BANCO")
print("=" * 55)
print()
print("INPUTS DO BANCO:")
print(f"  time_saved_per_day      = {time_saved_per_day} h/dia")
print(f"  affected_people_count   = {affected_people_count} pessoa(s)")
print(f"  execution_days_per_month= {execution_days_per_month} dias")
print(f"  cost_per_hour           = R$ {cost_per_hour}")
print(f"  dev_hours               = {dev_hours} h")
print(f"  tech_hour_cost          = R$ {tech_hour_cost}")
print(f"  cloud_infra_cost        = R$ {cloud_infra_cost}")
print()
print("ECONOMIA:")
print(f"  Horas econ./mes = {time_saved_per_day} x {affected_people_count} x {execution_days_per_month} = {total_hours_saved} h")
print(f"  Ganho mensal    = {total_hours_saved} x R$ {cost_per_hour} = R$ {total_gains:.2f}")
print()
print("CUSTOS:")
print(f"  Custo dev  = {dev_hours} x R$ {tech_hour_cost} = R$ {cost_dev:.2f}")
print(f"  Custo infra= R$ {cloud_infra_cost}")
print(f"  TOTAL      = R$ {total_costs:.2f}")
print()
print("RESULTADOS:")
print(f"  ROI Anual  = (({total_gains:.2f} x 12) - {total_costs:.2f}) / {total_costs:.2f} x 100")
print(f"             = ({annual_gains:.2f} - {total_costs:.2f}) / {total_costs:.2f} x 100")
print(f"             = +{roi:.1f}%  (POSITIVO!)")
print(f"  Payback    = {total_costs:.2f} / {total_gains:.2f} = {payback:.1f} meses")
print()
print("=" * 55)
print("  COMPARACAO COM A APRESENTACAO")
print("=" * 55)
print()
print("                  BANCO          APRESENTACAO")
print(f"  H/mes econ:     {total_hours_saved:.0f} h           104 h")
print(f"  Economia/mes:   R$ {total_gains:.2f}     R$ 3.808,00")
print(f"  ROI:            +{roi:.0f}%          +3.791%")
print(f"  Payback:        {payback:.1f} meses       0,3 meses")
print()
print("CAUSA DA DIFERENCA:")
print(f"  No banco: affected_people_count = {affected_people_count}")
print(f"  Na apresentacao, 104h / 26 dias = 4 pessoas (ou 4h/dia)")
print(f"  O campo 'affected_people_count' ou 'time_saved_per_day' esta incorreto no Jira/banco!")
