# Show de Prêmios Windows — Prova de Fogo 14/09/2026

Versão: **0.5.0-rc.1**.

## Objetivo desta versão

O aplicativo Windows passa a funcionar como cliente sincronizado da versão Web oficial em `https://showdepremios.mskpoeira.com.br`.

Isso elimina divergência entre duas bases: vendas, cartelas, eventos futuros, sorteios, caixa, usuários, relatórios e registros da prova de fogo são os mesmos na Web e no Windows.

## Instalação da versão de teste

### Pelo artefato do GitHub Actions

1. Abra o repositório `mskpoeira/show-de-premios-desktop` no GitHub.
2. Entre em **Actions**.
3. Abra o CI mais recente da branch `release/fire-test-20260914`.
4. Aguarde os jobs **verify** e **windows-package** ficarem verdes.
5. Na seção **Artifacts**, baixe o artefato `show-de-premios-windows-<número-do-run>`.
6. Extraia o ZIP.
7. Execute `Show-de-Premios-Setup-0.5.0-rc.1.exe`.
8. Se o Windows SmartScreen avisar que o editor ainda não é reconhecido, use **Mais informações → Executar assim mesmo** apenas se o arquivo tiver sido baixado do workflow oficial deste repositório.

### Para desenvolvimento local

```powershell
npm ci
npm run verify
npm start
```

## Módulo de testes

Não existe instalador separado para o módulo de testes nesta versão. Ele faz parte da aplicação Web sincronizada.

Depois do login, abra:

`https://showdepremios.mskpoeira.com.br/fire-test.php`

ou clique em **🧪 Prova de Fogo** no cabeçalho.

O módulo permite cadastrar eventos futuros, registrar problemas manualmente, acompanhar status, imprimir e exportar a relação em CSV.

## Comportamento sem internet

Para proteger integridade de vendas, sorteio e caixa, a versão 0.5.0-rc.1 não cria operações em uma base paralela quando a conexão cai. O Windows mostra uma tela de reconexão e retoma a mesma base assim que o acesso à Web voltar.

## Teste de sincronização obrigatório

1. Na Web, cadastre um evento futuro.
2. Abra o Windows e confirme que o evento aparece na mesma Central de Prova de Fogo.
3. Registre uma venda pela Web e confirme a mesma informação no Windows.
4. Registre um problema pelo Windows e confirme que aparece na Web.
5. Gere e imprima relatório gerencial em ambos.
6. Teste reconexão de rede sem duplicar operação.
