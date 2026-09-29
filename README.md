# Show de Prêmios — aplicativo desktop

Aplicativo Windows independente e local-first.

## Isolamento

A aplicação Desktop não carrega páginas, APIs, bancos, autenticação, arquivos, configurações ou serviços de qualquer outro projeto.

O executável abre exclusivamente os arquivos locais empacotados no próprio aplicativo.

## Dados

Os dados ficam no diretório local da aplicação e possuem rotinas próprias de persistência, backup e recuperação.

## Execução

```bash
npm ci
npm start
```

## Instalador

```bash
npm run pack:win
```

## Validação

```bash
npm run verify
npm audit --audit-level=high
```
