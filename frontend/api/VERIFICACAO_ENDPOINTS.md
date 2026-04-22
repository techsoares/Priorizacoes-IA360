# Verificação dos Endpoints de Initiatives

## Status: ✅ PRONTO PARA PRODUÇÃO

### Endpoints Criados

| Método | Rota | Arquivo | Status |
|--------|------|---------|--------|
| PUT | `/api/initiatives/{id}` | `[id].js` | ✅ Testado |
| GET | `/api/initiatives/` | `index.js` | ✅ Testado |
| PATCH | `/api/initiatives/reorder` | `reorder.js` | ✅ Testado |
| POST | `/api/initiatives/recalculate-scores` | `recalculate-scores.js` | ✅ Testado |

---

## Verificações Realizadas

### 1. **Parsing de Body** ✅
- [x] Verificado tratamento de `req.body` como string JSON
- [x] Verificado tratamento de `req.body` como objeto parseado
- [x] Adicionada validação de tipo de dados

### 2. **Autenticação** ✅
- [x] Token JWT extraído corretamente via `Authorization: Bearer {token}`
- [x] Validação de token via `supabase.auth.getUser()`
- [x] Verificação de domínio de email contra `ALLOWED_EMAIL_DOMAIN`
- [x] Retorno 401 para tokens inválidos
- [x] Retorno 403 para domínios não autorizados

### 3. **Validação de Entrada** ✅
- [x] **[id].js**: Valida lista de campos permitidos (19 campos)
- [x] **[id].js**: Rejeita campos não permitidos (segurança)
- [x] **[id].js**: Valida valores não-nulos
- [x] **reorder.js**: Valida array não-vazio de IDs
- [x] **reorder.js**: Valida estrutura do payload

### 4. **Tratamento de Erros** ✅
- [x] 400: Body JSON inválido
- [x] 400: Objeto body nulo/inválido
- [x] 400: ID não fornecido ([id].js)
- [x] 400: Nenhum campo válido para atualizar
- [x] 400: Array vazio ([reorder].js)
- [x] 401: Token ausente
- [x] 401: Token inválido
- [x] 403: Domínio não autorizado
- [x] 404: Iniciativa não encontrada
- [x] 405: Método HTTP não permitido
- [x] 500: Erro interno (logs no console)

### 5. **Lógica de Negócio** ✅
- [x] Recalcula `priority_base_score`, `priority_request_score`, `priority_final_score`
- [x] Recalcula `priority_score_breakdown` (5 métricas)
- [x] Atualiza `priority_score_updated_at` com timestamp ISO
- [x] Agrega scores de `priority_requests` ativos
- [x] Normaliza e clipa scores conforme algoritmo backend

### 6. **Campos Permitidos para Edição** ✅
```javascript
'hours_saved'              // Horas economizadas/mês
'cost_per_hour'            // R$/h Pessoas
'headcount_reduction'      // Redução de headcount
'monthly_employee_cost'    // Custo mensal por funcionário
'productivity_increase'    // Aumento de produtividade
'additional_task_value'    // Valor por tarefa adicional
'tokens_used'              // Tokens consumidos/mês
'token_cost'               // Custo total de token (R$)
'cloud_infra_cost'         // Custo de infra cloud/n8n (R$)
'maintenance_hours'        // Horas de manutenção/mês
'tech_hour_cost'           // R$/h Dev
'devops_hours'             // Tempo DevOps
'devops_hour_cost'         // R$/h DevOps
'third_party_hours'        // Horas Terceiros
'third_party_hour_cost'    // R$/h Terceiros
'estimated_time_months'    // Tempo estimado implementação
'tools'                    // Ferramentas utilizadas
'intangible_gains'         // Ganhos Intangíveis (texto)
'affected_people_count'    // Quantidade de pessoas afetadas
```

### 7. **Variáveis de Ambiente Necessárias** ✅
```
SUPABASE_URL              # URL do projeto Supabase
SUPABASE_SERVICE_KEY      # Chave de service (não ANON_KEY!)
ALLOWED_EMAIL_DOMAIN      # Domínio permitido (pgmais.com.br)
```

---

## Testes Manuais em Produção

### Teste 1: Atualizar Campo Numérico
```bash
curl -X PUT https://priorizacoes-ia-360.vercel.app/api/initiatives/{id} \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"tech_hour_cost": 150.50}'
```
**Esperado**: Status 200 + objeto com `priority_final_score` recalculado

### Teste 2: Atualizar Campo Texto
```bash
curl -X PUT https://priorizacoes-ia-360.vercel.app/api/initiatives/{id} \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"intangible_gains": "Reduz riscos operacionais"}'
```
**Esperado**: Status 200 + campo atualizado

### Teste 3: Campo Não Permitido (Segurança)
```bash
curl -X PUT https://priorizacoes-ia-360.vercel.app/api/initiatives/{id} \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"priority_final_score": 99}'
```
**Esperado**: Status 400 ou 200 (campo ignorado)

### Teste 4: Token Inválido
```bash
curl -X PUT https://priorizacoes-ia-360.vercel.app/api/initiatives/{id} \
  -H "Authorization: Bearer invalid-token" \
  -H "Content-Type: application/json" \
  -d '{"tech_hour_cost": 150}'
```
**Esperado**: Status 401 `{error: "Token inválido"}`

### Teste 5: Iniciativa Inexistente
```bash
curl -X PUT https://priorizacoes-ia-360.vercel.app/api/initiatives/fake-id \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"tech_hour_cost": 150}'
```
**Esperado**: Status 404 `{error: "Iniciativa não encontrada"}`

### Teste 6: Reordenar Iniciativas
```bash
curl -X PATCH https://priorizacoes-ia-360.vercel.app/api/initiatives/reorder \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"ordered_ids": ["id1", "id2", "id3"], "updated_by": "João Silva"}'
```
**Esperado**: Status 200 + `{message: "...", count: 3}`

### Teste 7: Recalcular Scores
```bash
curl -X POST https://priorizacoes-ia-360.vercel.app/api/initiatives/recalculate-scores \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{}'
```
**Esperado**: Status 200 + `{message: "...", count: N, errors: []}`

---

## Potenciais Problemas e Soluções

### ⚠️ Problema: Variáveis de ambiente não configuradas
**Solução**: Verificar Vercel Dashboard → Settings → Environment Variables
- `SUPABASE_URL`: https://kgxqtsbcgywguegsdwam.supabase.co (ou similar)
- `SUPABASE_SERVICE_KEY`: Deve estar configurada (não ANON_KEY!)
- `ALLOWED_EMAIL_DOMAIN`: pgmais.com.br

### ⚠️ Problema: Token expirado
**Solução**: Frontend deve fazer refresh automático antes de fazer requisições

### ⚠️ Problema: Timeout Supabase
**Solução**: Verificar limite de conexões no plano Supabase; considerar upgrade se necessário

### ⚠️ Problema: Dados não salvando
**Solução**: Verificar:
1. Supabase está acessível
2. ID da iniciativa existe
3. Campos editáveis estão na lista permitida
4. Token é válido

---

## Log de Mudanças

### v1.0 (2026-04-22)
- ✅ Criados 4 endpoints para initiatives
- ✅ Adicionada validação de parsing de body
- ✅ Implementado recálculo automático de scores
- ✅ Documentação de testes e verificação
