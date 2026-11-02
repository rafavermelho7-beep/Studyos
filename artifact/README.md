# LIFE ENGINE — versão Artefato

Página única publicada no claude.ai (privada), sem servidor, sem cadastros e sem custo de API.

- **IA**: capability `sample` (usa o plano Claude do usuário; sem chave de API).
- **Dados**: capability `db`, área privada `data/users/<id>/…` (só o próprio usuário lê).
- **Agenda**: conector Google Calendar do claude.ai via capability `mcp` (`list_events`, `create_event`; criação só com clique).
- **Exportação**: capability `downloads` (JSON completo).

Diferenças em relação à versão Next.js: sem ingestão automática do Apple Saúde (sono/treino registrados à mão),
Radar sem busca na web (sugere tipos de oportunidade e termos de pesquisa, sem inventar eventos), sem teto em R$
(valem os limites do plano). Para publicar uma nova versão, use a ferramenta Artifact com este arquivo.
