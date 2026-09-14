# Show de Prêmios — aplicativo desktop

Versão 0.4 do sistema para Windows, desenvolvida em Electron com JavaScript puro. O aplicativo é offline-first, mantém os dados no perfil local do Windows e possui autenticação por usuário.

## Módulos incluídos

- primeiro acesso protegido, com criação obrigatória da senha do Administrador Master e sem senha padrão;
- login com senha derivada por `scrypt`, sessão local, bloqueio temporário após tentativas repetidas e permissões por perfil;
- painel geral com indicadores, gráfico e movimentações recentes;
- dashboard gerencial com lucro, margem, ticket médio e recebimentos PIX;
- central do Dia Atual, início/encerramento do evento e ações rápidas;
- vendas com preços automáticos e geração de cartelas rastreáveis;
- pagamentos em dinheiro, PIX, débito e crédito, preservando o preço histórico;
- cancelamento controlado de vendas, com invalidação das cartelas vinculadas e bloqueio quando já houver premiação;
- cadastros de vendedores, comissões, desempenho, usuários e perfis;
- proteção do Administrador Master e das credenciais fora do estado exposto à interface;
- área de banco exclusiva do Master, com consulta, filtro, edição/exclusão controlada e auditoria protegida no aplicativo;
- rodadas progressivas e múltiplos prêmios por rodada;
- padrões de vitória por cartela cheia, linha horizontal e quatro cantos;
- apuração automática de vencedores e empates, com registro da cartela, prêmio, bola e operador;
- sorteio automático, por clique na bola ou por digitação manual;
- sorteio de 1 a 75 sem repetição, sem travamento após a 75ª bola e com desfazer protegido;
- registro da ordem, horário, modo e operador de cada bola;
- cartelas BINGO 75 com colunas B/I/N/G/O, centro livre e numeração única;
- gerador de cartelas físicas e digitais, lotes de até 1.000 e impressão de 1, 2 ou 4 por A4;
- telão independente em tela cheia, com botão de saída, PIX e aviso **TEMOS CARTELA VENCEDORA**, sem exibir nome ou dados pessoais do comprador;
- caixa com entradas, retiradas, prêmios pendentes e prêmios efetivamente pagos;
- fechamento de caixa com valor contado e cálculo de divergência;
- PIX BR Code/EMVCo com chave normalizada, CRC16-CCITT e QR Code de teste;
- relatórios legíveis, auditoria e importação/exportação de backup;
- persistência atômica, backup local automático e recuperação da base quando o arquivo principal estiver corrompido;
- testes automatizados de PIX e das regras BINGO 75;
- CI no GitHub com checagem de sintaxe, testes, `npm audit --audit-level=high` e geração do instalador Windows NSIS.

## Abrir pela primeira vez

1. Instale o Node.js 22.12 ou superior.
2. Abra a pasta do projeto no terminal.
3. Execute `npm ci`.
4. Execute `npm start`.
5. No primeiro acesso, o sistema solicitará a criação da senha do **Administrador Master**. O login inicial é `admin`; não existe senha padrão.

## Gerar o instalador do Windows

Execute:

```bash
npm run pack:win
```

O instalador NSIS será criado na pasta `dist`.

## Validação antes de publicar

Execute:

```bash
npm run verify
npm audit --audit-level=high
```

O mesmo conjunto de verificações roda automaticamente no GitHub Actions, inclusive em ambiente Windows.

## Dados e backup

Os dados locais ficam no diretório de dados do aplicativo. A gravação usa arquivo temporário, cópia de segurança local e recuperação automática quando possível.

Backups manuais podem ser exportados em **Relatórios → Exportar backup** e importados somente por perfis autorizados. O backup JSON contém os dados necessários para restauração e, por isso, deve ser armazenado em local protegido.

## Segurança de distribuição

A versão 0.4 corrige os pontos críticos de autenticação, autorização, integridade operacional, apuração e dependências identificados na auditoria da versão 0.3. Para distribuição pública ampla, a assinatura digital do instalador com certificado de code signing continua recomendada para reduzir alertas do Windows SmartScreen.
