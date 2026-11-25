const DURACAO = 25 * 60;
let restante = DURACAO;
let rodando = false;
let intervalo = null;

const tempoEl = document.querySelector("#time");
const barraEl = document.querySelector("#bar-fill");
const botaoToggle = document.querySelector("#toggle");
const botaoReiniciar = document.querySelector("#reset");

function formatar(segundos) {
  const min = Math.floor(segundos / 60); // Math.floor arredonda para baixo
  const seg = segundos % 60;
  // padStart(2, '0') completa com zero à esquerda: "5" vira "05"
  return String(min).padStart(2, "0") + ":" + String(seg).padStart(2, "0");
}

function desenhar() {
  tempoEl.textContent = formatar(restante); // troca o texto do relógio
  const progresso = (1 - restante / DURACAO) * 100; // quanto já passou, em %
  barraEl.style.width = progresso + "%"; // muda a largura da barra amarela
  // o texto do botão muda conforme a situação (operador ternário: condição ? se_sim : se_não)
  botaoToggle.textContent = rodando
    ? "Pausar"
    : restante < DURACAO
      ? "Continuar"
      : "Começar";
  document.title = formatar(restante) + " · Foco"; // mostra o tempo na aba do navegador
}

function passarUmSegundo() {
  restante--;
  if (restante <= 0) {
    clearInterval(intervalo); // para o cronômetro
    rodando = false;
    restante = DURACAO;
  }
  desenhar();
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

function reiniciar() {
  clearInterval(intervalo);
  rodando = false;
  restante = DURACAO;
  desenhar();
}

botaoToggle.addEventListener("click", alternar);
botaoReiniciar.addEventListener("click", reiniciar);

desenhar();
// Uma LISTA (array) de objetos. Cada tarefa é assim: { id, nome, minutos, feita }

// Nome da "gaveta" onde guardamos as tarefas no navegador
const CHAVE = "foco-ny-tarefas";

// Lê as tarefas salvas. Se não tiver nada (ou der erro), devolve uma lista vazia.
function carregar() {
  try {
    const texto = localStorage.getItem(CHAVE); // devolve o texto salvo, ou null se não existir
    return texto ? JSON.parse(texto) : []; // JSON.parse: transforma o texto de volta em lista
  } catch (erro) {
    return []; // try/catch igual ao do Java
  }
}

// Guarda a lista de tarefas na gaveta
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
  if (nome === "") return; // se estiver vazio, sai da função sem fazer nada
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
  if (e.key === "Enter") adicionarTarefa(); // apertar Enter também adiciona
});

// Primeira vez: mostra a mensagem de "nenhuma tarefa"
desenharTarefas();
