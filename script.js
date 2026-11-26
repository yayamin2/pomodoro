const CHAVE_CONFIG = "foco-ny-config";
// valores padrão, em MINUTOS
const config = { foco: 25, curta: 5, longa: 15, auto: false, som: true };
try {
  // mistura o que estava salvo por cima dos padrões
  Object.assign(config, JSON.parse(localStorage.getItem(CHAVE_CONFIG)));
} catch (erro) {}

// Duração de cada bloco em SEGUNDOS, calculada a partir das configurações
const DURACOES = {
  foco: config.foco * 60,
  curta: config.curta * 60,
  longa: config.longa * 60,
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
  if (config.som) beep(); // avisa com um som que o bloco acabou
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
  if (config.auto) alternar(); // se marcou "iniciar sozinho", já começa o próximo bloco
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
// Botão "Apagar tudo e recomeçar"
botaoApagar.addEventListener("click", function () {
  // confirm() abre uma caixinha com OK/Cancelar e devolve true ou false (igual ao JOptionPane do Java)
  if (
    !confirm("Apagar tarefas, ideias, plano e histórico? Não dá para desfazer.")
  )
    return;
  localStorage.removeItem(CHAVE); // gaveta das tarefas
  localStorage.removeItem(CHAVE_IDEIAS); // gaveta das ideias
  localStorage.removeItem(CHAVE_HIST); // gaveta do histórico
  localStorage.removeItem(CHAVE_PLANO); // gaveta do organizador
  localStorage.removeItem(CHAVE_CARTOES); // gaveta dos cartões
  localStorage.removeItem(CHAVE_APRENDI); // gaveta do "o que aprendi"
  localStorage.removeItem(CHAVE_CONFIG); // gaveta dos ajustes
  localStorage.removeItem(CHAVE_PERFIL); // gaveta do nome e da cor
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

// Só cria a tarefa e coloca na lista (o organizador também usa esta função)
function criarTarefa(nome, minutos, passo) {
  tarefas.push({
    id: Date.now(),
    nome: nome,
    minutos: minutos,
    passo: passo || "", // o primeiro passinho de 2 minutos (pode ficar vazio)
    feita: false,
  });
}

// Abre uma caixinha pedindo o primeiro passo. Devolve o texto, ou "" se cancelar
const passoEl = document.querySelector("#t-step");

function adicionarTarefa() {
  const nome = nomeEl.value.trim();
  if (nome === "") return;
  const passo = passoEl.value.trim(); // lê o campo opcional; se estiver vazio, fica ""
  criarTarefa(nome, Number(minutosEl.value) || 25, passo);
  nomeEl.value = "";
  passoEl.value = "";
  desenharTarefas();
}
function adicionarTarefa() {
  const nome = nomeEl.value.trim();
  if (nome === "") return;
  const passo = passoEl ? passoEl.value.trim() : "";
  criarTarefa(nome, Number(minutosEl.value) || 25, passo);
  nomeEl.value = "";
  if (passoEl) passoEl.value = "";
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

    // mostra o primeiro passinho, se a tarefa tiver um
    if (t.passo) {
      const passo = document.createElement("div");
      passo.className = "passo";
      passo.textContent = "Primeiro passo: " + t.passo;
      texto.append(passo);
    }

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
  // se a função rodar de novo (ao redimensionar a janela), apaga os prédios antigos antes
  cidadeEl.querySelectorAll(".predio").forEach(function (p) {
    p.remove();
  });

  const larguraTotal = cidadeEl.clientWidth; // largura da cidade em pixels
  const limite = larguraTotal - 100; // os prédios param aqui, para deixar espaço para a Estátua
  let x = 0; // posição horizontal atual, agora em PIXELS
  let semente = 7; // número inicial do "sorteio". Fixo = o desenho é sempre o mesmo
  let empireColocado = false;

  // Gerador de números "aleatórios" entre 0 e 1 (aqui sempre na mesma sequência)
  function sorteio() {
    semente = (semente * 9301 + 49297) % 233280;
    return semente / 233280;
  }

  while (x < limite - 20) {
    // ao chegar perto de 34% da largura, reserva o espaço do Empire State (30px)
    if (!empireColocado && x >= larguraTotal * 0.34) {
      empireEl.style.left = x + "px";
      x += 30 + 4; // 30px do desenho + uma folguinha
      empireColocado = true;
      continue;
    }

    let largura = 34 + sorteio() * 40; // largura entre 34px e 74px (antes era em %)
    const altura = 22 + sorteio() * 52; // altura entre 22px e 74px
    largura = Math.min(largura, limite - x); // o último prédio não passa do limite

    const predio = document.createElement("div");
    predio.className = "predio";
    predio.style.left = x + "px";
    predio.style.width = largura + "px";
    predio.style.height = altura + "px";

    // JANELAS: cada uma ocupa 4px + 5px de espaço = 9px.
    const colunas = Math.floor((largura - 7) / 9); // quantas cabem na horizontal
    const linhas = Math.floor((altura - 9) / 9); // quantas cabem na vertical

    for (let i = 0; i < colunas * linhas; i++) {
      const janela = document.createElement("div");
      // cerca de 40% das janelas ficam acesas (sorteio acima de 0.6)
      janela.className = "janela" + (sorteio() > 0.6 ? " acesa" : "");
      predio.append(janela);
    }

    cidadeEl.append(predio);
    x += largura + 3; // anda para o lado e deixa 3px entre os prédios
  }
}

desenharCidade();
// se a janela mudar de tamanho, a cidade é desenhada de novo para continuar preenchendo a tela
window.addEventListener("resize", desenharCidade);

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
          criarTarefa(item.texto, 25, perguntarPasso(item.texto)); // vira tarefa e pergunta o primeiro passo
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

const CHAVE_PERFIL = "foco-ny-perfil";

// As cores que a pessoa pode escolher: uma lista de objetos
const CORES = [
  { nome: "Táxi", valor: "#fbc22e" },
  { nome: "Néon", valor: "#ff5fa2" },
  { nome: "Hudson", valor: "#5ab0ff" },
  { nome: "Lavanda", valor: "#b794f6" },
];

function carregarPerfil() {
  try {
    const texto = localStorage.getItem(CHAVE_PERFIL);
    return texto ? JSON.parse(texto) : {};
  } catch (erro) {
    return {};
  }
}

// O perfil é um objeto com dois atributos. O "||" usa o valor padrão se não houver nada salvo
const perfilSalvo = carregarPerfil();
let perfil = {
  nome: perfilSalvo.nome || "",
  cor: perfilSalvo.cor || "#fbc22e",
};

const leadEl = document.querySelector("#lead");
const nomeInputEl = document.querySelector("#c-name");
const coresEl = document.querySelector("#sw");

function salvarPerfil() {
  localStorage.setItem(CHAVE_PERFIL, JSON.stringify(perfil));
}

// Aplica o perfil na tela, cor do site, saudação e bolinhas de cor
function aplicarPerfil() {
  // setProperty troca o valor da variável CSS --taxi, o site inteiro muda de cor de uma vez
  document.documentElement.style.setProperty("--taxi", perfil.cor);

  // saudação conforme a hora do dia
  const hora = new Date().getHours();
  const saudacao =
    hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  leadEl.textContent =
    saudacao +
    (perfil.nome ? ", " + perfil.nome : "") +
    ". Uma coisa de cada vez. Escolha a linha, aperte o play e vá até a próxima parada.";

  // bolinhas de cor, uma para cada item da lista CORES
  coresEl.innerHTML = "";
  CORES.forEach(function (c) {
    const bolinha = document.createElement("button");
    bolinha.style.background = c.valor;
    bolinha.className = c.valor === perfil.cor ? "on" : "";
    bolinha.title = c.nome; // dica ao passar o mouse
    bolinha.setAttribute("aria-label", c.nome); // para leitores de tela
    bolinha.addEventListener("click", function () {
      perfil.cor = c.valor;
      salvarPerfil();
      aplicarPerfil();
    });
    coresEl.append(bolinha);
  });
}

// "input" dispara a cada letra digitada
nomeInputEl.addEventListener("input", function () {
  perfil.nome = nomeInputEl.value.trim();
  salvarPerfil();
  aplicarPerfil();
});

nomeInputEl.value = perfil.nome; // preenche o campo com o nome salvo
aplicarPerfil();
// Toca dois "bips" com a Web Audio API: o som é gerado por código, sem arquivo de áudio
function beep() {
  try {
    const audio = new (window.AudioContext || window.webkitAudioContext)();
    [660, 880].forEach(function (frequencia, i) {
      const osc = audio.createOscillator(); // gera a onda sonora
      const vol = audio.createGain(); // controla o volume
      osc.frequency.value = frequencia;
      osc.connect(vol);
      vol.connect(audio.destination); // destination = os alto-falantes
      const inicio = audio.currentTime + i * 0.25; // o segundo bip começa 0,25s depois
      vol.gain.setValueAtTime(0.15, inicio);
      vol.gain.exponentialRampToValueAtTime(0.001, inicio + 0.22); // o volume vai sumindo
      osc.start(inicio);
      osc.stop(inicio + 0.22);
    });
  } catch (erro) {} // se o navegador não permitir som, simplesmente não toca
}

function salvarConfig() {
  localStorage.setItem(CHAVE_CONFIG, JSON.stringify(config));
}

// Cada item liga uma chave (foco, curta, longa) ao seu campo na tela
const campos = [
  { chave: "foco", el: document.querySelector("#c-foco") },
  { chave: "curta", el: document.querySelector("#c-curta") },
  { chave: "longa", el: document.querySelector("#c-longa") },
];
const autoEl = document.querySelector("#c-auto");
const somEl = document.querySelector("#c-som");

campos.forEach(function (campo) {
  campo.el.value = config[campo.chave]; // mostra o valor atual
  // "change" dispara quando a pessoa termina de editar o campo
  campo.el.addEventListener("change", function () {
    let minutos = Number(campo.el.value) || config[campo.chave]; // se for inválido, mantém o que estava
    minutos = Math.max(1, Math.min(minutos, 120)); // limita entre 1 e 120
    config[campo.chave] = minutos;
    campo.el.value = minutos;
    // const não impede de mudar os ATRIBUTOS do objeto (igual ao final do Java)
    DURACOES[campo.chave] = minutos * 60;
    salvarConfig();
    // se o timer está parado e este é o bloco atual, atualiza o relógio
    if (!rodando && campo.chave === modo) restante = DURACOES[modo];
    desenhar();
  });
});

autoEl.checked = config.auto;
autoEl.addEventListener("change", function () {
  config.auto = autoEl.checked;
  salvarConfig();
});
somEl.checked = config.som;
somEl.addEventListener("change", function () {
  config.som = somEl.checked;
  salvarConfig();
});
const CHAVE_CARTOES = "foco-ny-cartoes";

// A cada acerto seguido, o cartão volta num intervalo maior (em DIAS).
// É uma versão simples do sistema Leitner. Apps como o Anki usam contas mais sofisticadas.
const INTERVALOS = [1, 3, 7, 14, 30];

// Cada cartão é um objeto: { id, frente, verso, nivel, proxima }
//   nivel   = quantos acertos seguidos ele já teve
//   proxima = a data da próxima revisão ("AAAA-MM-DD")
function carregarCartoes() {
  try {
    const texto = localStorage.getItem(CHAVE_CARTOES);
    return texto ? JSON.parse(texto) : [];
  } catch (erro) {
    return [];
  }
}

let cartoes = carregarCartoes();
let mostrandoResposta = false; // a resposta do cartão atual já foi revelada?

const frenteEl = document.querySelector("#c-front");
const versoEl = document.querySelector("#c-back");
const botaoCartao = document.querySelector("#add-card");
const revisaoEl = document.querySelector("#review");
const contagemEl = document.querySelector("#card-count");
const listaCartoesEl = document.querySelector("#card-list");
const resumoListaEl = document.querySelector("#card-summary");

// Devolve a data de daqui a "dias" dias, no formato "AAAA-MM-DD"
function somarDias(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias); // setDate lida sozinho com virada de mês e de ano
  return chaveDoDia(d);
}

// Só cria o cartão e coloca na lista (o "O que aprendi hoje" também usa esta função)
function adicionarCartao(frente, verso) {
  cartoes.push({
    id: Date.now(),
    frente: frente,
    verso: verso,
    nivel: 0,
    proxima: chaveDoDia(new Date()), // cartão novo já entra para revisar hoje
  });
}

// Lê os campos da tela e chama adicionarCartao
function criarCartao() {
  const frente = frenteEl.value.trim();
  const verso = versoEl.value.trim();
  if (frente === "" || verso === "") return; // precisa de pergunta E resposta
  adicionarCartao(frente, verso);
  frenteEl.value = "";
  versoEl.value = "";
  frenteEl.focus(); // devolve o cursor para a pergunta, para criar o próximo
  desenharCartoes();
}

// Chamada quando a pessoa clica em "Acertei" ou "Errei"
function responder(cartao, acertou) {
  if (acertou) {
    // pega o intervalo do nível atual (e usa o último se o nível passar do tamanho da lista)
    const dias = INTERVALOS[Math.min(cartao.nivel, INTERVALOS.length - 1)];
    cartao.proxima = somarDias(dias);
    cartao.nivel++;
  } else {
    cartao.nivel = 0; // errou: recomeça do zero
    cartao.proxima = chaveDoDia(new Date()); // continua valendo para hoje
    // vai para o FIM da fila, para os outros cartões aparecerem antes dele
    cartoes = cartoes.filter(function (x) {
      return x.id !== cartao.id;
    });
    cartoes.push(cartao);
  }
  mostrandoResposta = false; // o próximo cartão começa com a resposta escondida
  desenharCartoes();
}

// "2026-11-25" vira "25/11"
function formatarData(chave) {
  return chave.slice(8) + "/" + chave.slice(5, 7); // slice(início, fim) recorta um pedaço do texto
}

function desenharCartoes() {
  localStorage.setItem(CHAVE_CARTOES, JSON.stringify(cartoes));
  const hoje = chaveDoDia(new Date());

  // "vencidos" = cartões cuja data de revisão já chegou.
  // Datas no formato AAAA-MM-DD podem ser comparadas como texto com <=
  const vencidos = cartoes.filter(function (c) {
    return c.proxima <= hoje;
  });

  // frase de resumo
  if (cartoes.length === 0) {
    contagemEl.textContent = "Nenhum cartão ainda. Crie o primeiro acima.";
  } else if (vencidos.length === 0) {
    contagemEl.textContent = "Nada para revisar hoje. Volte amanhã!";
  } else {
    contagemEl.textContent =
      vencidos.length +
      (vencidos.length === 1
        ? " cartão para revisar hoje"
        : " cartões para revisar hoje");
  }

  revisaoEl.innerHTML = "";
  if (vencidos.length > 0) {
    const atual = vencidos[0];

    const pergunta = document.createElement("div");
    pergunta.className = "q";
    pergunta.textContent = atual.frente;
    revisaoEl.append(pergunta);

    if (mostrandoResposta) {
      // 2º momento: a resposta aparece, com os botões de acertei / errei
      const resposta = document.createElement("div");
      resposta.className = "a";
      resposta.textContent = atual.verso;

      const botoes = document.createElement("div");
      botoes.className = "rev-btns";

      const errei = document.createElement("button");
      errei.textContent = "Errei";
      errei.addEventListener("click", function () {
        responder(atual, false);
      });

      const acertei = document.createElement("button");
      acertei.className = "go";
      acertei.textContent = "Acertei";
      acertei.addEventListener("click", function () {
        responder(atual, true);
      });

      botoes.append(errei, acertei);
      revisaoEl.append(resposta, botoes);
    } else {
      // 1º momento: só a pergunta. Tente lembrar ANTES de clicar!
      const botoes = document.createElement("div");
      botoes.className = "rev-btns";
      const mostrar = document.createElement("button");
      mostrar.className = "go";
      mostrar.textContent = "Mostrar resposta";
      mostrar.addEventListener("click", function () {
        mostrandoResposta = true;
        desenharCartoes();
      });
      botoes.append(mostrar);
      revisaoEl.append(botoes);
    }
  }

  resumoListaEl.textContent = "Todos os cartões (" + cartoes.length + ")";
  listaCartoesEl.innerHTML = "";
  cartoes.forEach(function (c) {
    const item = document.createElement("li");

    const texto = document.createElement("span");
    texto.textContent =
      c.frente +
      " · " +
      (c.proxima <= hoje
        ? "revisar hoje"
        : "volta em " + formatarData(c.proxima));

    const remover = document.createElement("button");
    remover.className = "sm";
    remover.textContent = "×";
    remover.addEventListener("click", function () {
      cartoes = cartoes.filter(function (x) {
        return x.id !== c.id;
      });
      mostrandoResposta = false;
      desenharCartoes();
    });

    item.append(texto, remover);
    listaCartoesEl.append(item);
  });
}

botaoCartao.addEventListener("click", criarCartao);
versoEl.addEventListener("keydown", function (e) {
  if (e.key === "Enter") criarCartao(); // Enter no campo da resposta cria o cartão
});

desenharCartoes();

const CHAVE_APRENDI = "foco-ny-aprendi";

// Cada anotação é um objeto: { id, texto, dia, cartao }
//   dia    = a data em que foi anotada ("AAAA-MM-DD")
//   cartao = true se já virou cartão de revisão
function carregarAprendizados() {
  try {
    const texto = localStorage.getItem(CHAVE_APRENDI);
    return texto ? JSON.parse(texto) : [];
  } catch (erro) {
    return [];
  }
}

let aprendizados = carregarAprendizados();

const aprendiInputEl = document.querySelector("#l-text");
const botaoAprendi = document.querySelector("#add-learn");
const aprendiContagemEl = document.querySelector("#learn-count");
const aprendiHojeEl = document.querySelector("#learn-today");
const aprendiAntesEl = document.querySelector("#learn-before");
const aprendiAntigosEl = document.querySelector("#learn-old"); // o <details> inteiro
const aprendiResumoEl = document.querySelector("#learn-summary");

function anotarAprendizado() {
  const texto = aprendiInputEl.value.trim();
  if (texto === "") return;
  aprendizados.unshift({
    id: Date.now(),
    texto: texto,
    dia: chaveDoDia(new Date()),
    cartao: false,
  }); // unshift: a mais nova fica em cima
  aprendiInputEl.value = "";
  desenharAprendizados();
}

// Transforma uma anotação em cartão de revisão
function virarCartao(item) {
  const pergunta = prompt(
    "Que pergunta faz você lembrar disso?\n\nA resposta do cartão será:\n" +
      item.texto,
  );
  if (pergunta === null || pergunta.trim() === "") return; // cancelou ou deixou vazio
  adicionarCartao(pergunta.trim(), item.texto); // a anotação vira a RESPOSTA do cartão
  item.cartao = true;
  desenharCartoes(); // atualiza a seção dos cartões
  desenharAprendizados();
}

// Monta uma linha da lista. "comData" = mostra a data antes do texto (usado nos dias anteriores)
function linhaAprendizado(item, comData) {
  const linha = document.createElement("li");

  const texto = document.createElement("span");
  texto.textContent =
    (comData ? formatarData(item.dia) + " · " : "") + item.texto;

  const acoes = document.createElement("div");
  acoes.className = "acoes";

  if (item.cartao) {
    const feito = document.createElement("span");
    feito.className = "sub";
    feito.textContent = "✓ virou cartão";
    acoes.append(feito);
  } else {
    const virar = document.createElement("button");
    virar.className = "sm";
    virar.textContent = "→ cartão";
    virar.addEventListener("click", function () {
      virarCartao(item);
    });
    acoes.append(virar);
  }

  const remover = document.createElement("button");
  remover.className = "sm";
  remover.textContent = "×";
  remover.addEventListener("click", function () {
    aprendizados = aprendizados.filter(function (x) {
      return x.id !== item.id;
    });
    desenharAprendizados();
  });
  acoes.append(remover);

  linha.append(texto, acoes);
  return linha;
}

function desenharAprendizados() {
  localStorage.setItem(CHAVE_APRENDI, JSON.stringify(aprendizados));
  const hoje = chaveDoDia(new Date());

  // separa as anotações de hoje das dos outros dias
  const deHoje = aprendizados.filter(function (a) {
    return a.dia === hoje;
  });
  const antigos = aprendizados.filter(function (a) {
    return a.dia !== hoje;
  });

  aprendiContagemEl.textContent =
    "Hoje: " +
    deHoje.length +
    "/3 (uma meta leve: três coisas, mesmo pequenas)";

  aprendiHojeEl.innerHTML = "";
  if (deHoje.length === 0) {
    const vazio = document.createElement("li");
    vazio.className = "vazio";
    vazio.textContent = "Nada ainda. O que você aprendeu hoje, mesmo pequeno?";
    aprendiHojeEl.append(vazio);
  }
  deHoje.forEach(function (item) {
    aprendiHojeEl.append(linhaAprendizado(item, false));
  });

  // dias anteriores: só aparece se houver alguma anotação antiga
  aprendiAntigosEl.hidden = antigos.length === 0; // hidden = true esconde o elemento
  aprendiResumoEl.textContent = "Dias anteriores (" + antigos.length + ")";
  aprendiAntesEl.innerHTML = "";
  antigos.forEach(function (item) {
    aprendiAntesEl.append(linhaAprendizado(item, true));
  });
}

botaoAprendi.addEventListener("click", anotarAprendizado);
aprendiInputEl.addEventListener("keydown", function (e) {
  if (e.key === "Enter") anotarAprendizado();
});

desenharAprendizados();

const CHAVE_RITUAL = "foco-ny-ritual";
const ITENS_RITUAL_PADRAO = [
  "Celular longe",
  "Água por perto",
  "Caderno aberto",
];

function carregarRitual() {
  try {
    const texto = localStorage.getItem(CHAVE_RITUAL);
    if (texto) return JSON.parse(texto);
  } catch (erro) {}

  return ITENS_RITUAL_PADRAO.map(function (texto, indice) {
    return { id: indice + 1, texto: texto, pronto: false };
  });
}

let ritual = carregarRitual();

const ritualListaEl = document.querySelector("#ritual-list");
const ritualStatusEl = document.querySelector("#ritual-status");
const ritualResetEl = document.querySelector("#ritual-reset");

function salvarRitual() {
  localStorage.setItem(CHAVE_RITUAL, JSON.stringify(ritual));
}

function desenharRitual() {
  if (!ritualListaEl || !ritualStatusEl) return;
  salvarRitual();

  const prontos = ritual.filter(function (item) {
    return item.pronto;
  }).length;

  ritualStatusEl.textContent =
    prontos === ritual.length && ritual.length > 0
      ? "Tudo pronto para o foco"
      : prontos + "/" + ritual.length + " prontos";

  ritualListaEl.innerHTML = "";
  ritual.forEach(function (item) {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "ritual-item" + (item.pronto ? " pronto" : "");
    botao.textContent = (item.pronto ? "✓ " : "○ ") + item.texto;
    botao.addEventListener("click", function () {
      item.pronto = !item.pronto;
      desenharRitual();
    });
    ritualListaEl.append(botao);
  });
}

if (ritualResetEl) {
  ritualResetEl.addEventListener("click", function () {
    ritual.forEach(function (item) {
      item.pronto = false;
    });
    desenharRitual();
  });
}
