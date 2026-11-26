const DURACOES = {
  foco: 25 * 60,
  curta: 5 * 60,
  longa: 15 * 60,
};
const FOCOS_ATE_LONGA = 4; // depois de 4 focos, vem a pausa longa

let modo = "foco";
let restante = DURACOES[modo];
let rodando = false;
let intervalo = null;
let ciclo = 0; // quantos focos completos já fizemos neste ciclo

const tempoEl = document.querySelector("#time");
const barraEl = document.querySelector("#bar-fill");
const botaoToggle = document.querySelector("#toggle");
const botaoReiniciar = document.querySelector("#reset");
const botaoPular = document.querySelector("#skip");
const modoEl = document.querySelector("#modo");
const proximaEl = document.querySelector("#proxima");
const timerEl = document.querySelector(".timer");
const bolinhas = document.querySelectorAll("#dots span");
const taxiEl = document.querySelector("#taxi"); // o táxi da rua

function formatar(segundos) {
  const min = Math.floor(segundos / 60); // Math.floor arredonda para baixo
  const seg = segundos % 60;
  // padStart(2, '0') completa com zero à esquerda, "5" vira "05"
  return String(min).padStart(2, "0") + ":" + String(seg).padStart(2, "0");
}

function textoProxima() {
  if (modo !== "foco") return "Depois da pausa: volta pro foco";
  // se este for o 4º foco, a próxima parada é a pausa longa
  if (ciclo + 1 >= FOCOS_ATE_LONGA) {
    return "Próxima parada: pausa longa de " + DURACOES.longa / 60 + " min";
  }
  return "Próxima parada: pausa de " + DURACOES.curta / 60 + " min";
}

function desenhar() {
  const total = DURACOES[modo];
  tempoEl.textContent = formatar(restante);
  barraEl.style.width = (1 - restante / total) * 100 + "%";

  // TÁXI: anda pela rua conforme o progresso (0 = começo, 1 = fim)
  const andou = 1 - restante / total;
  // calc() mistura % e px: a rua inteira menos o espaço do táxi e da parada (98px)
  taxiEl.style.left = "calc((100% - 98px) * " + andou + ")";
  taxiEl.classList.toggle("rolando", rodando); // balança só enquanto o timer roda

  if (modo === "foco") modoEl.textContent = "Foco";
  else if (modo === "curta") modoEl.textContent = "Pausa curta";
  else modoEl.textContent = "Pausa longa";

  // classList.toggle("pausa", condição): liga a classe se for true, tira se for false
  timerEl.classList.toggle("pausa", modo !== "foco");

  proximaEl.textContent = textoProxima();

  // as bolinhas com índice menor que "ciclo" ficam amarelas (classe "on")
  bolinhas.forEach(function (b, i) {
    b.classList.toggle("on", i < ciclo);
  });

  botaoToggle.textContent = rodando
    ? "Pausar"
    : restante < total
      ? "Continuar"
      : "Começar";
  document.title = formatar(restante) + " · Foco";
}

// Muda para outro bloco, para o relógio e deixa pronto para começar
function trocarModo(novo) {
  clearInterval(intervalo);
  rodando = false;
  modo = novo;
  restante = DURACOES[modo];
  desenhar();
}

function terminarBloco() {
  if (modo === "foco") {
    registrarFoco(); // anota mais um foco completo nas estatísticas
    ciclo++;
    if (ciclo >= FOCOS_ATE_LONGA) {
      ciclo = 0; // recomeça a contagem das bolinhas
      trocarModo("longa");
    } else {
      trocarModo("curta");
    }
  } else {
    trocarModo("foco");
  }
}

function passarUmSegundo() {
  restante--;
  if (modo === "foco") registrarSegundo(); // só o tempo de FOCO conta nas estatísticas
  if (restante <= 0) {
    terminarBloco();
  } else {
    desenhar();
  }
}

function alternar() {
  if (rodando) {
    clearInterval(intervalo);
    rodando = false;
  } else {
    rodando = true;
    intervalo = setInterval(passarUmSegundo, 1000);
  }
  desenhar();
}

// Reiniciar: volta o bloco ATUAL ao começo
function reiniciar() {
  clearInterval(intervalo);
  rodando = false;
  restante = DURACOES[modo];
  desenhar();
}

// Pular: foco vira pausa curta (sem contar o ciclo); pausa vira foco
function pular() {
  trocarModo(modo === "foco" ? "curta" : "foco");
}

botaoToggle.addEventListener("click", alternar);
botaoReiniciar.addEventListener("click", reiniciar);
botaoPular.addEventListener("click", pular);

desenhar();

// a chave é a data ("2026-11-25") e o valor guarda { segundos, focos } daquele dia.
const CHAVE_HIST = "foco-ny-historico"; // mais uma "gaveta" no navegador

function carregarHistorico() {
  try {
    const texto = localStorage.getItem(CHAVE_HIST);
    return texto ? JSON.parse(texto) : {}; // {} = objeto vazio
  } catch (erro) {
    return {};
  }
}

let historico = carregarHistorico();

const minEl = document.querySelector("#s-min");
const focosEl = document.querySelector("#s-focos");
const feitasEl = document.querySelector("#s-done");
const semanaEl = document.querySelector("#week");
const sequenciaEl = document.querySelector("#streak");
const botaoApagar = document.querySelector("#wipe");

// Transforma uma data em texto "AAAA-MM-DD".
function chaveDoDia(data) {
  return data.toLocaleDateString("sv-SE");
}

// Devolve o registro de HOJE e cria um zerado se ainda não existir
function diaDeHoje() {
  const chave = chaveDoDia(new Date());
  if (!historico[chave]) {
    historico[chave] = { segundos: 0, focos: 0 };
  }
  return historico[chave];
}

// Quantos segundos foram estudados numa data qualquer e 0 se não houver registro
function segundosDoDia(data) {
  const registro = historico[chaveDoDia(data)];
  return registro ? registro.segundos : 0;
}

function salvarHistorico() {
  localStorage.setItem(CHAVE_HIST, JSON.stringify(historico));
}

// Chamada a cada segundo de FOCO
function registrarSegundo() {
  diaDeHoje().segundos++;
  salvarHistorico();
  desenharEstatisticas();
}

// Chamada quando um bloco de foco termina
function registrarFoco() {
  diaDeHoje().focos++;
  salvarHistorico();
  desenharEstatisticas();
}

// Atualiza os números, o gráfico e a sequência
function desenharEstatisticas() {
  const hoje = diaDeHoje();
  minEl.textContent = Math.floor(hoje.segundos / 60) + " min";
  focosEl.textContent = hoje.focos;
  // filter cria uma lista só com as tarefas feitas; .length conta quantas são
  const feitas = tarefas.filter(function (t) {
    return t.feita;
  }).length;
  feitasEl.textContent = feitas + "/" + tarefas.length;

  // ----- gráfico dos 7 dias -----
  const nomes = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"]; // getDay() devolve 0 (domingo) a 6 (sábado)
  const dias = [];
  for (let i = 6; i >= 0; i--) {
    // i = quantos dias atrás: 6, 5, 4... até 0 (hoje)
    const d = new Date();
    d.setDate(d.getDate() - i); // volta i dias a partir de hoje
    dias.push({
      nome: nomes[d.getDay()],
      minutos: Math.floor(segundosDoDia(d) / 60),
    });
  }
  // o maior valor da semana serve de "100%" para calcular a altura das barras
  // (os três pontinhos espalham a lista como argumentos soltos; o 1 evita dividir por zero)
  const maior = Math.max(
    1,
    ...dias.map(function (d) {
      return d.minutos;
    }),
  );

  semanaEl.innerHTML = "";
  dias.forEach(function (d, i) {
    const coluna = document.createElement("div");
    coluna.className = "day" + (i === 6 ? " hoje" : ""); // o último da lista é hoje

    if (d.minutos > 0) {
      const valor = document.createElement("span");
      valor.className = "v";
      valor.textContent = d.minutos + " min";
      coluna.append(valor);
    }

    const barra = document.createElement("div");
    barra.className = "b";
    // altura proporcional: o maior dia ocupa 135px; dia sem estudo fica com 5px
    barra.style.height =
      d.minutos > 0 ? Math.max(8, (d.minutos / maior) * 135) + "px" : "5px";

    coluna.append(barra, d.nome); // append aceita elementos E texto
    semanaEl.append(coluna);
  });

  // ----- sequência: dias seguidos estudando -----
  let sequencia = 0;
  const dia = new Date();
  if (segundosDoDia(dia) === 0) {
    dia.setDate(dia.getDate() - 1); // se hoje ainda não estudou, a contagem começa de ontem
  }
  // enquanto o dia tiver tempo registrado, conta e volta mais um dia
  while (segundosDoDia(dia) > 0) {
    sequencia++;
    dia.setDate(dia.getDate() - 1);
  }
  sequenciaEl.textContent =
    sequencia > 0
      ? "Sequência: " +
        sequencia +
        (sequencia === 1 ? " dia" : " dias") +
        " estudando. Não precisa ser perfeito, só voltar."
      : "Sem sequência ainda. Um bloco de foco já começa uma.";
}

// Botão "Apagar tudo e recomeçar"
botaoApagar.addEventListener("click", function () {
  // confirm() abre uma caixinha com OK/Cancelar e devolve true ou false (igual ao JOptionPane do Java)
  // Botão "Apagar tudo e recomeçar"
botaoApagar.addEventListener("click", function () {
  // confirm() abre uma caixinha com OK/Cancelar e devolve true ou false (igual ao JOptionPane do Java)
  if (!confirm("Apagar tarefas, ideias, plano e histórico? Não dá para desfazer."))
    return;
  localStorage.removeItem(CHAVE); // gaveta das tarefas
  localStorage.removeItem(CHAVE_IDEIAS); // gaveta das ideias
  localStorage.removeItem(CHAVE_HIST); // gaveta do histórico
  localStorage.removeItem(CHAVE_PLANO); // gaveta do organizador
  location.reload(); // recarrega a página já sem nada
});

const CHAVE = "foco-ny-tarefas";

// Lê as tarefas salvas. Se não tiver nada (ou der erro), devolve uma lista vazia.
function carregar() {
  try {
    const texto = localStorage.getItem(CHAVE); // devolve o texto salvo, ou null se não existir
    return texto ? JSON.parse(texto) : []; // JSON.parse: transforma o texto de volta em lista
  } catch (erro) {
    return [];
  }
}

function salvar() {
  // localStorage só guarda TEXTO. JSON.stringify transforma a lista em texto.
  localStorage.setItem(CHAVE, JSON.stringify(tarefas));
}

// Ao abrir a página, já começa com o que estava salvo
let tarefas = carregar();

const listaEl = document.querySelector("#tasks");
const nomeEl = document.querySelector("#t-name");
const minutosEl = document.querySelector("#t-est");
const botaoAdd = document.querySelector("#add-task");

// Cria uma tarefa nova e coloca na lista
// Só cria a tarefa e coloca na lista (o organizador também usa esta função)
function criarTarefa(nome, minutos) {
  tarefas.push({
    id: Date.now(), // Date.now() = hora atual em milissegundos: serve como id único
    nome: nome,
    minutos: minutos,
    feita: false,
  });
}

// Lê o que foi digitado nos campos e chama criarTarefa
function adicionarTarefa() {
  const nome = nomeEl.value.trim(); // trim() tira espaços das pontas
  if (nome === "") return;
  criarTarefa(nome, Number(minutosEl.value) || 25); // se os minutos forem inválidos, usa 25
  nomeEl.value = ""; // limpa o campo
  desenharTarefas();
}

// Redesenha a lista inteira a partir do array "tarefas"
function desenharTarefas() {
  salvar(); // toda vez que a lista é redesenhada, ela também é salva
  listaEl.innerHTML = ""; // esvazia a lista na tela antes de desenhar de novo
  desenharEstatisticas(); // atualiza o "tarefas concluídas" sempre que a lista muda
  listaEl.innerHTML = "";

  if (tarefas.length === 0) {
    const vazio = document.createElement("p"); // createElement cria uma tag nova na memória
    vazio.className = "empty";
    vazio.textContent = "Nenhuma tarefa ainda. Qual é a primeira parada?";
    listaEl.append(vazio); // append coloca dentro da lista
    return;
  }

  // forEach repete o bloco para cada tarefa
  tarefas.forEach(function (t) {
    const linha = document.createElement("div");
    linha.className = "task" + (t.feita ? " done" : ""); // se estiver feita, ganha a classe "done"

    const texto = document.createElement("div");
    texto.className = "tx";
    const nome = document.createElement("div");
    nome.className = "nm";
    nome.textContent = t.nome; // textContent é seguro: mostra como texto, nunca como código
    const sub = document.createElement("div");
    sub.className = "sub";
    sub.textContent = t.minutos + " min estimados";
    texto.append(nome, sub);

    const botaoFeita = document.createElement("button");
    botaoFeita.className = "sm";
    botaoFeita.textContent = t.feita ? "Reabrir" : "Concluir";
    botaoFeita.addEventListener("click", function () {
      t.feita = !t.feita; // ! inverte: true vira false e false vira true
      desenharTarefas();
    });

    const botaoRemover = document.createElement("button");
    botaoRemover.className = "sm";
    botaoRemover.textContent = "×";
    botaoRemover.addEventListener("click", function () {
      // filter cria uma lista nova só com as tarefas que passam no teste (aqui: id diferente)
      tarefas = tarefas.filter(function (x) {
        return x.id !== t.id;
      });
      desenharTarefas();
    });

    linha.append(texto, botaoFeita, botaoRemover);
    listaEl.append(linha);
  });
}

// EVENTOS
botaoAdd.addEventListener("click", adicionarTarefa);
nomeEl.addEventListener("keydown", function (e) {
  if (e.key === "Enter") adicionarTarefa();
});

desenharTarefas();

const cidadeEl = document.querySelector("#sky");
const empireEl = document.querySelector("#empire");

function desenharCidade() {
  const larguraTotal = cidadeEl.clientWidth; // largura da cidade em pixels
  let x = 0; // posição horizontal atual, em % da largura
  let semente = 7; // número inicial do "sorteio". Fixo = o desenho é sempre o mesmo
  let empireColocado = false;

  // Gerador de números "aleatórios" entre 0 e 1 (aqui sempre na mesma sequência)
  function sorteio() {
    semente = (semente * 9301 + 49297) % 233280;
    return semente / 233280;
  }

  while (x < 86) {
    // ao chegar perto de 34%, reserva o espaço EXATO do Empire State
    if (!empireColocado && x >= 34) {
      empireEl.style.left = x + "%";
      x += (30 / larguraTotal) * 100 + 0.4; // 30px do desenho convertidos para % + uma folguinha
      empireColocado = true;
      continue;
    }

    const largura = 3 + sorteio() * 5; // largura entre 3% e 8%
    const altura = 18 + sorteio() * 48; // altura entre 18px e 66px

    const predio = document.createElement("div");
    predio.className = "predio";
    predio.style.left = x + "%";
    predio.style.width = largura + "%";
    predio.style.height = altura + "px";

    // JANELAS: cada uma ocupa 4px + 5px de espaço = 9px.
    const larguraPx = (largura / 100) * larguraTotal; // largura do prédio em pixels
    const colunas = Math.floor((larguraPx - 7) / 9); // quantas cabem na horizontal
    const linhas = Math.floor((altura - 9) / 9); // quantas cabem na vertical

    // for: repete colunas × linhas vezes
    for (let i = 0; i < colunas * linhas; i++) {
      const janela = document.createElement("div");
      // cerca de 40% das janelas ficam acesas (sorteio acima de 0.6)
      janela.className = "janela" + (sorteio() > 0.6 ? " acesa" : "");
      predio.append(janela); // a janela entra DENTRO do prédio
    }

    cidadeEl.append(predio);
    x += largura + 0.2; // anda para o lado e deixa um espacinho entre os prédios
  }
}

desenharCidade();

const CHAVE_IDEIAS = "foco-ny-ideias";

function carregarIdeias() {
  try {
    const texto = localStorage.getItem(CHAVE_IDEIAS);
    return texto ? JSON.parse(texto) : [];
  } catch (erro) {
    return [];
  }
}

let ideias = carregarIdeias();

const ideiasEl = document.querySelector("#ideas");
const ideiaInputEl = document.querySelector("#i-text");
const botaoIdeia = document.querySelector("#add-idea");

function guardarIdeia() {
  const texto = ideiaInputEl.value.trim();
  if (texto === "") return; // não guarda ideia vazia
  ideias.unshift(texto); // unshift coloca no COMEÇO da lista (a mais nova fica em cima). push coloca no fim.
  ideiaInputEl.value = "";
  desenharIdeias();
}

function desenharIdeias() {
  // salva a lista toda vez que ela é redesenhada (mesmo truque das tarefas)
  localStorage.setItem(CHAVE_IDEIAS, JSON.stringify(ideias));
  ideiasEl.innerHTML = "";

  if (ideias.length === 0) {
    const vazio = document.createElement("li");
    vazio.className = "vazio";
    vazio.textContent = "Vazio. Boa, sua cabeça está no foco.";
    ideiasEl.append(vazio);
    return;
  }

  // forEach com 2 parâmetros: o item (texto) e a posição dele na lista (i)
  ideias.forEach(function (texto, i) {
    const item = document.createElement("li");

    const span = document.createElement("span");
    span.textContent = texto; // textContent é seguro: nunca interpreta como código

    const remover = document.createElement("button");
    remover.className = "sm";
    remover.textContent = "×";
    remover.addEventListener("click", function () {
      ideias.splice(i, 1); // splice(posição, quantos) remove, igual ao ArrayList.remove(índice)
      desenharIdeias();
    });

    item.append(span, remover);
    ideiasEl.append(item);
  });
}

botaoIdeia.addEventListener("click", guardarIdeia);
ideiaInputEl.addEventListener("keydown", function (e) {
  if (e.key === "Enter") guardarIdeia();
});

desenharIdeias();
// ============================================================
// ORGANIZADOR DA SEMANA
// ============================================================

// O plano é um OBJETO usado como mapa, igual ao histórico:
// a chave é a data e o valor é a lista de itens daquele dia.
// Parece um HashMap<String, List<Item>> do Java.
// Ex.: { "2026-11-25": [ { id, texto, feito }, ... ] }
const CHAVE_PLANO = "foco-ny-plano";

function carregarPlano() {
  try {
    const texto = localStorage.getItem(CHAVE_PLANO);
    return texto ? JSON.parse(texto) : {};
  } catch (erro) {
    return {};
  }
}

let plano = carregarPlano();

// Quantas semanas estamos afastados da atual: 0 = esta, -1 = passada, 1 = próxima
let semanaOffset = 0;

const planoEl = document.querySelector("#plan");
const rotuloEl = document.querySelector("#w-label");
const botaoAnterior = document.querySelector("#w-prev");
const botaoProxima = document.querySelector("#w-next");

function salvarPlano() {
  localStorage.setItem(CHAVE_PLANO, JSON.stringify(plano));
}

// Devolve uma lista com as 7 datas (segunda a domingo) da semana mostrada
function diasDaSemana() {
  const inicio = new Date();
  // getDay() dá 0 para domingo. (getDay() + 6) % 7 faz a segunda virar 0.
  // Voltamos esse tanto de dias para cair na segunda e somamos as semanas de deslocamento.
  inicio.setDate(
    inicio.getDate() - ((inicio.getDay() + 6) % 7) + semanaOffset * 7,
  );
  const lista = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(inicio); // new Date(outraData) faz uma cópia
    d.setDate(inicio.getDate() + i);
    lista.push(d);
  }
  return lista;
}

// Desenha as 7 colunas
function desenharPlano() {
  const dias = diasDaSemana();
  const nomes = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  const chaveHoje = chaveDoDia(new Date());

  // texto entre as setas
  const formato = { day: "numeric", month: "short" };
  rotuloEl.textContent =
    semanaOffset === 0
      ? "Esta semana"
      : dias[0].toLocaleDateString("pt-BR", formato) +
        " – " +
        dias[6].toLocaleDateString("pt-BR", formato);

  planoEl.innerHTML = "";

  dias.forEach(function (d) {
    const chave = chaveDoDia(d);
    const itens = plano[chave] || []; // se o dia não tem nada ainda, usa uma lista vazia

    const coluna = document.createElement("div");
    coluna.className = "pday" + (chave === chaveHoje ? " hoje" : "");
    coluna.dataset.dia = chave; // dataset guarda um dado dentro da tag: data-dia="2026-11-25"

    const titulo = document.createElement("h3");
    const nomeDia = document.createElement("span");
    nomeDia.textContent = nomes[d.getDay()];
    const numeroDia = document.createElement("span");
    numeroDia.textContent = d.getDate();
    titulo.append(nomeDia, numeroDia);
    coluna.append(titulo);

    // um item por vez
    itens.forEach(function (item) {
      const linha = document.createElement("div");
      linha.className = "pit" + (item.feito ? " done" : "");

      const marcar = document.createElement("button");
      marcar.textContent = item.feito ? "✓" : "○";
      marcar.addEventListener("click", function () {
        item.feito = !item.feito; // inverte: feito vira não feito e vice-versa
        salvarPlano();
        desenharPlano();
      });

      const texto = document.createElement("span");
      texto.textContent = item.texto;

      linha.append(marcar, texto);

      // o botão → só aparece em itens ainda não feitos
      if (!item.feito) {
        const enviar = document.createElement("button");
        enviar.textContent = "→";
        enviar.title = "Levar pro foco"; // title = a dica que aparece ao passar o mouse
        enviar.addEventListener("click", function () {
          criarTarefa(item.texto, 25); // vira uma tarefa de 25 min nas "Tarefas de hoje"
          plano[chave] = plano[chave].filter(function (x) {
            return x.id !== item.id; // tira do plano
          });
          salvarPlano();
          desenharPlano();
          desenharTarefas(); // atualiza também a lista de tarefas
        });
        linha.append(enviar);
      }

      const remover = document.createElement("button");
      remover.textContent = "×";
      remover.addEventListener("click", function () {
        plano[chave] = plano[chave].filter(function (x) {
          return x.id !== item.id;
        });
        salvarPlano();
        desenharPlano();
      });

      linha.append(remover);
      coluna.append(linha);
    });

    // campo para adicionar item no dia (Enter adiciona)
    const campo = document.createElement("input");
    campo.type = "text";
    campo.placeholder = "+ item";
    campo.maxLength = 60;
    campo.addEventListener("keydown", function (e) {
      if (e.key !== "Enter") return;
      const texto = campo.value.trim();
      if (texto === "") return;
      if (!plano[chave]) plano[chave] = []; // primeiro item do dia: cria a lista
      plano[chave].push({ id: Date.now(), texto: texto, feito: false });
      salvarPlano();
      desenharPlano();
      // a tela foi redesenhada, então o campo antigo sumiu: devolve o cursor ao do mesmo dia
      planoEl.querySelector('[data-dia="' + chave + '"] input').focus();
    });
    coluna.append(campo);

    planoEl.append(coluna);
  });
}

botaoAnterior.addEventListener("click", function () {
  semanaOffset--;
  desenharPlano();
});
botaoProxima.addEventListener("click", function () {
  semanaOffset++;
  desenharPlano();
});

desenharPlano();
