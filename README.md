# Show de Prêmios — aplicativo desktop

Primeira versão operacional do sistema para Windows, desenvolvida em Electron com JavaScript puro. Funciona offline e grava os dados no perfil local do usuário.

## Módulos incluídos

- painel geral com indicadores, gráfico e movimentações recentes;
- vendas com preços automáticos e geração de cartelas rastreáveis;
- rodadas e prêmios em tabela editável;
- sugestão automática de premiação com 50% das vendas, dividida em 65% e 35%;
- sorteio de 1 a 75 sem repetição, com desfazer;
- modo telão independente, em tela cheia e sem dados do comprador ou aviso de vencedor;
- caixa com entradas, premiações, retiradas e saldo;
- relatórios, auditoria, importação e exportação de backup;
- configurações de evento, prefixo, número de rodadas, preços e modelo de cartela.

## Abrir pela primeira vez

1. Instale o Node.js 22 LTS ou superior.
2. Abra a pasta no Visual Studio Code ou no terminal do Visual Studio.
3. Execute `npm install`.
4. Execute `npm start`.

## Gerar o instalador do Windows

Execute `npm run pack:win`. O instalador será criado na pasta `dist`.

## Observações de segurança

Esta etapa é uma base local de homologação. Antes de uso financeiro real, ainda devem ser implementados autenticação por perfis, assinatura de registros, criptografia de dados pessoais, validação real de ganhadores conforme o modelo definitivo das cartelas, impressão/PDF com QR Code e sincronização autenticada com o servidor web.

Os dados locais ficam no diretório de dados do aplicativo e podem ser copiados pelo menu **Relatórios → Exportar backup**.
