# Show de Prêmios — aplicativo desktop

Versão 0.3 operacional do sistema para Windows, desenvolvida em Electron com JavaScript puro. Funciona offline e grava os dados no perfil local do usuário.

## Módulos incluídos

- painel geral com indicadores, gráfico e movimentações recentes;
- dashboard gerencial com lucro, margem, ticket médio e recebimentos PIX;
- central do Dia Atual, início/encerramento do evento e ações rápidas;
- vendas com preços automáticos e geração de cartelas rastreáveis;
- pagamentos em dinheiro, PIX, débito e crédito, preservando o preço histórico;
- cadastros de vendedores, comissões, desempenho, usuários e perfis;
- edição de vendedores e usuários, mantendo o Administrador Master protegido;
- área de banco exclusiva do Master, com consulta, filtro, edição e exclusão auditada;
- vendedores e operadores com nome, telefone e e-mail;
- rodadas progressivas, iniciadas em 1 e sem limite fixo;
- múltiplos prêmios por rodada e padrões de vitória;
- sorteio automático, por clique na bola ou por digitação manual;
- registro da ordem, horário, modo e operador de cada bola;
- gerador de cartelas físicas e digitais, lotes de até 1.000 e impressão de 1, 2 ou 4 por A4;
- rodadas e prêmios em tabela editável;
- sugestão automática de premiação com 50% das vendas, dividida em 65% e 35%;
- sorteio de 1 a 75 sem repetição, com desfazer;
- modo telão independente, em tela cheia e sem dados do comprador ou aviso de vencedor;
- caixa com entradas, premiações, retiradas e saldo;
- fechamento de caixa com valor contado e cálculo de divergência;
- PIX BR Code/EMVCo com chave normalizada, CRC16-CCITT e QR Code de teste;
- QR PIX configurável e ticker de preços no telão;
- relatórios, auditoria, importação e exportação de backup;
- central de relatórios com seleção individual de resumo, vendas, rodadas, vendedores, fechamentos e auditoria;
- configurações de evento, prefixo, número de rodadas, preços e modelo de cartela.

## Abrir pela primeira vez

1. Instale o Node.js 22 LTS ou superior.
2. Abra a pasta no Visual Studio Code ou no terminal do Visual Studio.
3. Execute `npm install`.
4. Execute `npm start`.

## Gerar o instalador do Windows

Execute `npm run pack:win`. O instalador será criado na pasta `dist`.

## Observações de segurança

Esta etapa é uma base local de homologação. Antes de uso financeiro real, ainda devem ser implementados login efetivo por senha, assinatura de registros, criptografia de dados pessoais, impressão definitiva das cartelas com QR Code e sincronização autenticada com o servidor web.

Os dados locais ficam no diretório de dados do aplicativo e podem ser copiados pelo menu **Relatórios → Exportar backup**.
