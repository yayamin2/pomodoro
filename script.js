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
function adicionarTarefa() {
  const nome = nomeEl.value.trim(); // .value = o que foi digitado; trim() tira espaços das pontas
  if (nome === "") return;
  const minutos = Number(minutosEl.value) || 25; // Number converte texto em número; se for inválido, usa 25
  tarefas.push({
    // push = add do ArrayList
    id: Date.now(), // Date.now() = hora atual em milissegundos: serve como id único
    nome: nome,
    minutos: minutos,
    feita: false,
  });
  nomeEl.value = ""; // limpa o campo
  desenharTarefas();
}

// Redesenha a lista inteira a partir do array "tarefas"
function desenharTarefas() {
  salvar(); // toda vez que a lista é redesenhada, ela também é salva
  listaEl.innerHTML = ""; // esvazia a lista na tela antes de desenhar de novo

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
