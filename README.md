# Foco · Nova York

Aplicação web de foco, estudo e organização com temática de Nova York, construída com **HTML5, CSS3 e JavaScript puro (Vanilla JS)**, sem dependências externas e com persistência de dados no navegador via `localStorage`.

## O que já está implementado

- **Cenário e Táxi Animado (`#sky`, `#taxi`):** Skyline gerado dinamicamente em pixels com prédios e janelas acesas ao redor de SVG do Empire State Building e da Estátua da Liberdade, acompanhado de um táxi que desliza pela rua conforme o progresso do bloco.
- **Timer de Foco e Pausas (`.timer`):** Ciclos de _Foco_, _Pausa curta_ e _Pausa longa_ (a cada 4 focos), barra de progresso (`#bar-fill`), título da aba atualizado em tempo real, controles (_Começar/Pausar_, _Pular_, _Reiniciar_) e alerta sonoro via **Web Audio API** (`beep()`).
- **Ajustes e Personalização (`<details>`):** Configuração da duração de foco, pausa curta e pausa longa, início automático do próximo ciclo (`#c-auto`), som (`#c-som`), nome com saudação por horário (`#lead`) e troca dinâmica da cor de destaque `--taxi` (_Táxi_, _Néon_, _Hudson_ e _Lavanda_).
- **Tarefas de Hoje (`#tasks`):** Cadastro de tarefas com estimativa em minutos, marcação de concluída, remoção e atualização automática das estatísticas.
- **Estacionamento de Ideias (`#ideas`):** Campo rápido para registrar distrações ou dúvidas durante o foco e revisar depois na pausa.
- **Cartões de Revisão (`#review`, `#card-list`):** Repetição espaçada estilo Leitner com intervalos de `1, 3, 7, 14` e `30` dias. Cartões respondidos corretamente avançam de nível; os errados voltam ao nível inicial e seguem na fila do dia.
- **Organizador da Semana (`#plan`):** Grade semanal de segunda a domingo com navegação entre semanas (`‹` e `›`), marcação de itens, envio direto para as tarefas de hoje (`→`) e remoção.
- **O que Aprendi Hoje (`#learn-today`, `#learn-before`):** Registro diário com meta leve (`0/3`), histórico de dias anteriores recolhido em `<details>` e conversão direta de uma anotação em cartão de revisão (`→ cartão`).
- **Estatísticas e Sequência (`#s-min`, `#s-focos`, `#s-done`, `#week`, `#streak`):** Resumo do dia, gráfico de barras dos últimos 7 dias, contagem de dias consecutivos estudando e botão para limpar os dados (`#wipe`).

## Roadmap (Próximas etapas)

- [ ] **16 · Primeiro passinho:** Apoio para destravar e iniciar tarefas com mais facilidade.
- [ ] **17 · Ritual de começo:** Mini-checklist pré-foco (celular longe, água, caderno aberto) para entrar no ritmo de estudo.
- [ ] **18 · Mapa do metrô:** Gamificação leve em que cada bloco de foco concluído avança uma estação até concluir destinos como _Times Square_ e _Brooklyn Bridge_.
- [ ] **19 · Sons de ambiente:** Geração de sons ambientes via código (chuva, ruído marrom ou clima de _"café em Manhattan"_), na mesma linha do `beep()` com Web Audio API.
- [ ] **20 · Backup dos dados:** Exportação e importação dos dados salvos no `localStorage` para não perder o progresso.

## Armazenamento Local (`localStorage`)

Os dados ficam salvos no próprio navegador nas seguintes chaves:

- `foco-ny-config` — Durações dos blocos, início automático e som
- `foco-ny-historico` — Segundos e blocos de foco registrados por data (`AAAA-MM-DD`)
- `foco-ny-tarefas` — Tarefas do dia
- `foco-ny-ideias` — Ideias rápidas
- `foco-ny-plano` — Planejamento por data na semana
- `foco-ny-perfil` — Nome e cor de destaque
- `foco-ny-cartoes` — Cartões, nível de repetição e data da próxima revisão
- `foco-ny-aprendi` — Anotações diárias e status de conversão em cartão
