# Homologação — 14/09/2026

Versão candidata: `0.5.0-rc.1`

Commit-base promovido: `de0d57b4d7eeb2cf0c3b7a891f6410a031965e05`

Branch: `release/homologacao-20260914`

Objetivo: executar o pipeline completo de verificação e empacotamento Windows para homologação, preservando a `main` como referência estável.

Critérios automáticos do pipeline:
- consistência de versão;
- instalação limpa de dependências;
- suíte `npm run verify`;
- auditoria de dependências em nível high;
- geração do instalador Windows NSIS;
- publicação do instalador como artefato do GitHub Actions por 14 dias.
