-- Armazena a posição anterior do item que foi explicitamente arrastado
ALTER TABLE initiatives
  ADD COLUMN IF NOT EXISTS priority_previous_order INTEGER;
