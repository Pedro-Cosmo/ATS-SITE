import { supabase } from "./supabase-client.js";
import { gerarSlug, salvarConteudo } from "./admin-conteudos.js";

const BUCKET = "site-images";
const ASSET_ROOT = "/assets/img/importacao-noticias-2026";
const AUTHOR = "Letícia Welbert";

const paragrafo = (texto) => ({ tipo: "paragrafo", texto });
const imagem = (arquivo, legenda = "") => ({ tipo: "imagem", arquivo, legenda });
const duasImagens = (...imagens) => ({ tipo: "duas_imagens", imagens });
const galeria = (...imagens) => ({ tipo: "galeria", imagens });

const noticias = [
  {
    data: "2026-09-01",
    publicadoEm: "2026-09-01T09:00:00",
    titulo: "Nasce a LIGATS: uma iniciativa na Avaliação de Tecnologias em Saúde na graduação (UFRJ-Macaé)",
    descricaoCurta: "Liga acadêmica surge com foco no fortalecimento do pensamento crítico dos estudantes na área da saúde",
    capa: imagem("image17.png", "Primeira Assembléia Geral da LIGATS"),
    blocos: [
      imagem("image16.png", "Logo criada pelos alunos da LIGATS"),
      paragrafo("No dia 3 de abril de 2025 foi criada a Liga Acadêmica de Avaliação de Tecnologias em Saúde (LIGATS). Uma iniciativa idealizada pelos alunos em uma das aulas da disciplina de Saúde Coletiva em conjunto com a Profa Dra Isabella Piassi, que coordena o Núcleo de Avaliação de Tecnologia em Saúde denominado Gestão, Economia, Educação em Saúde e Serviços Farmacêuticos (GEESFAR/NATS/UFRJ)."),
      paragrafo("A LIGATS surge com o propósito de fortalecer a conexão entre universidade, estudantes e sociedade, com foco na promoção de atividades no tripé da formação universitária (ensino-pesquisa-extensão) aplicadas a diversos temas neste campo de atuação multiprofissional da ATS, desde o uso, a avaliação e o impacto das tecnologias em saúde no cotidiano da população."),
      paragrafo("Com uma proposta inovadora, a LIGATS busca incentivar o pensamento crítico e científico dos acadêmicos, abordando temas como eficácia, segurança e custo-benefício das tecnologias utilizadas na área da saúde. Além disso, pretende atuar ativamente na construção e disseminação do conhecimento, por meio de atividades como palestras, projetos de extensão, eventos e ações educativas."),
      paragrafo("A criação da LIGATS representa um importante passo na formação acadêmica dos estudantes envolvidos, a fim de proporcionar um espaço de aprendizado colaborativo entre seus membros."),
      paragrafo("Mais do que uma liga acadêmica, a LIGATS é criada como um movimento de transformação, com o compromisso de contribuir para uma saúde mais consciente, crítica e acessível para todos."),
    ],
  },
  {
    data: "2026-09-02",
    publicadoEm: "2026-09-02T09:00:00",
    titulo: "A LIGATS tem sua criação divulgada em boletim da REBRATS",
    descricaoCurta: "Reconhecimento reforça a relevância da liga acadêmica no cenário da avaliação de tecnologias em saúde",
    capa: imagem("image1.png", "Registro da divulgação da LIGATS no boletim da REBRATS"),
    blocos: [
      paragrafo("No dia 17 de abril de 2025, a criação da Liga Acadêmica de Avaliação de Tecnologias em Saúde (LIGATS) foi divulgada no boletim da REBRATS (Rede Brasileira de Avaliação de Tecnologias em Saúde)."),
      paragrafo("A divulgação representa um importante reconhecimento institucional, destacando a relevância da iniciativa no campo da avaliação de tecnologias em saúde. A presença da LIGATS em um veículo oficial da REBRATS, reforça o potencial desta liga para poder contribuir para a formação acadêmica crítica e para o fortalecimento das discussões sobre o uso de tecnologias no sistema de saúde."),
      paragrafo("A inclusão da liga no boletim também amplia sua visibilidade no cenário nacional, possibilitando maior integração com outras instituições, pesquisadores e iniciativas voltadas à área."),
      paragrafo("Esse marco evidencia não apenas o início promissor da LIGATS, mas também seu compromisso com a produção e disseminação de conhecimento qualificado, aproximando cada vez mais a universidade da sociedade."),
    ],
  },
  {
    data: "2026-09-03",
    publicadoEm: "2026-09-03T09:00:00",
    titulo: "GEESFAR/NATS/UFRJ é contemplado com curso do Ministério da Saúde",
    descricaoCurta: "Capacitação em avaliação de risco de viés amplia a formação crítica na área de tecnologias em saúde",
    capa: imagem("image15.png", "Divulgação oficial dos selecionados para o curso, incluindo representante do GEESFAR/NATS/UFRJ"),
    blocos: [
      paragrafo("Em meados de abril de 2025, o GEESFAR/NATS/UFRJ vinculado á LIGATS, foi contemplado com a indicação de membro para a realização do curso de Capacitação sobre Ferramentas para Avaliação do Risco de Viés, ofertado pelo Ministério da Saúde."),
      paragrafo("Nesta oportunidade, a professora Danielle Maria de Souza Serio dos Santos realizou o curso que abordou sobre métodos e ferramentas para a identificação de vieses, a fim de melhor contribuir para a avaliação da qualidade e confiabilidade dos dados em estudos divulgados."),
    ],
  },
  {
    data: "2026-09-04",
    publicadoEm: "2026-09-04T09:00:00",
    titulo: "Nova disciplina eletiva amplia formação em Avaliação de Tecnologias em Saúde",
    descricaoCurta: "“Tópicos em ATS” surge como oportunidade inédita para estudantes de Farmácia, Enfermagem e Medicina desde 2025.2”",
    capa: imagem("image3.png", "Divulgação da disciplina eletiva “Tópicos em Avaliação de Tecnologias em Saúde (ATS)”"),
    blocos: [
      paragrafo("A formação acadêmica na área da saúde ganha um importante reforço com a criação da disciplina eletiva “Tópicos em Avaliação de Tecnologias em Saúde (ATS)”, voltada para estudantes interessados em aprofundar seus conhecimentos em uma área multidisciplinar ainda pouco explorada nos cursos de graduação no Brasil."),
      paragrafo("A disciplina é ministrada pela professora Dra. Isabella Piassi, vinculada ao Instituto de Ciências Farmacêuticas da UFRJ-Macaé, com 4 créditos. A proposta integra atividades teóricas e práticas, realizadas em laboratório de informática, incluindo vivências em bancos de dados em saúde e o desenvolvimento de produtos técnicos da ATS. Durante a disciplina os discentes têm a oportunidade de desenvolver uma nota técnica."),
      paragrafo("Destinada a alunos dos cursos de Farmácia, Enfermagem e Medicina, a disciplina tem como principal objetivo promover uma formação mais crítica e qualificada, abordando os mecanismos de avaliação de tecnologias em saúde, fundamentais para a tomada de decisões no contexto do sistema de saúde."),
      paragrafo("A iniciativa reforça o compromisso com a inovação no ensino e com a preparação de estudantes mais conscientes e capacitados para atuar em áreas emergentes da saúde, além de fortalecer a integração entre ensino, pesquisa e prática profissional."),
    ],
  },
  {
    data: "2026-09-07",
    publicadoEm: "2026-09-07T09:00:00",
    titulo: "O GEESFAR/NATS/UFRJ e a LIGATS promovem o Curso de Extensão “Síntese de Evidências - Oficina de inverno”",
    descricaoCurta: "O curso de extensão com sua primeira edição em 2025.2 tem reunido estudantes e profissionais de saúde que atuam em Macaé e demais municípios da região",
    capa: imagem("image13.png"),
    blocos: [
      imagem("image14.png"),
      paragrafo("Com a previsão para realização anual no Campus da UFRJ-Macaé, a atividade teve como proposta capacitar os participantes nos principais fundamentos da ATS, abordando desde a formulação de perguntas estruturadas até a busca e análise de evidências científicas em bases de dados reconhecidas."),
      paragrafo("A oficina contou com a participação das professoras Dra. Flávia Tavares Silva Elias (Fiocruz/Brasília), Dra. Isabella Piassi Dias Godói (GEESFAR/NATS/UFRJ) e da bibliotecária Dra. Maria Eduarda Puga (Unifessp), e tem reunido estudantes da LIGATS e outros do curso de farmácia, residentes em Atenção Primária da UFRJ, bem como profissionais da área da saúde de Macaé e municípios vizinhos em um ambiente de aprendizado colaborativo."),
      paragrafo("A iniciativa tem proporcionado uma experiência prática e aplicada, fortalecendo habilidades essenciais para a análise crítica da literatura científica e para a tomada de decisão baseada em evidências."),
      paragrafo("A promoção desta oficina reforça o papel do GEESFAR/NATS/UFRJ e LIGATS na promoção de atividades acadêmicas e científicas, ampliando as oportunidades de formação e a busca pela consolidação e fortalecimento da Avaliação de Tecnologias em Saúde no processo de formação universitário e educação permanente aos diversos profissionais. ."),
    ],
  },
  {
    data: "2026-09-08",
    publicadoEm: "2026-09-08T09:00:00",
    titulo: "LIGATS marca presença no VI Congresso da REBRATS",
    descricaoCurta: "Participação no evento reforça a inserção da liga no cenário nacional da Avaliação de Tecnologias em Saúde",
    capa: imagem("image7.png"),
    blocos: [
      duasImagens(imagem("image2.png"), imagem("image8.png")),
      paragrafo("Os ligantes Laio Castilho, Letícia Viana e Thiago Tenreiro, juntamente com a professora Isabella Piassi, representaram a Liga Acadêmica de Avaliação de Tecnologias em Saúde (LIGATS) no VI Congresso da REBRATS, um dos principais eventos da área no Brasil."),
      paragrafo("Durante o pré-congresso e o primeiro dia de atividades, os representantes participaram de cursos e capacitações voltados ao aprimoramento técnico. Entre os temas abordados, destacam-se o curso de Avaliação Econômica em Saúde: atualizações e aplicação das recomendações, realizado por Laio Castilho e Letícia Viana, além do curso de Análise de Impacto Orçamentário, realizado por Thiago Tenreiro. A professora Isabella Piassi também participou de curso voltado à elaboração de Notas Técnicas de Revisão Rápida."),
      paragrafo("No segundo dia do congresso, a LIGATS esteve presente na apresentação de trabalhos científicos, abordando temas relevantes para a área. Entre eles, destacam-se o relato de experiência sobre a criação da liga acadêmica na Universidade Federal do Rio de Janeiro e a análise sobre os Núcleos de Avaliação de Tecnologias em Saúde no Brasil, explorando sua distribuição, potencialidades e desafios no contexto da rede nacional."),
      paragrafo("A participação no evento representa um importante marco para a LIGATS, ampliando sua visibilidade e fortalecendo sua atuação no campo da Avaliação de Tecnologias em Saúde."),
      paragrafo("Em avaliação sobre o congresso, a professora Isabella Piassi destacou a relevância da experiência:\n“O evento da REBRATS é, sem dúvida, o mais importante da área da ATS no Brasil, pela qualidade de tudo o que é oferecido e, principalmente, por envolver tantos profissionais qualificados e de relevância científica e profissional.”"),
      galeria(imagem("image10.png"), imagem("image4.png"), imagem("image11.png")),
    ],
  },
  {
    data: "2026-09-09",
    publicadoEm: "2026-09-09T09:00:00",
    titulo: "LIGATS inicia em 2026 a promoção de mini-cursos sobre importantes temas da saúde pública para à formação acadêmica",
    descricaoCurta: "Atividade promovida pelos ligantes abordou temas essenciais da assistência farmacêutica e Avaliação de Tecnologias em Saúde",
    capa: imagem("image19.jpg"),
    blocos: [
      duasImagens(imagem("image20.jpg"), imagem("image18.jpg")),
      paragrafo("A Liga Acadêmica de Avaliação de Tecnologias em Saúde (LIGATS) iniciou 2026 com um ciclo de mini cursos ministrados pelos próprios ligantes, promovendo aprendizado colaborativo e aprofundamento em temas essenciais da área."),
      paragrafo("No primeiro encontro, foram abordados “Acesso a Medicamentos” e “Assistência Farmacêutica”, incluindo os conceitos como bioequivalência, medicamentos genéricos, RENAME, CONITEC e os componentes da assistência farmacêutica."),
      paragrafo("No segundo dia, o foco foi o Componente Especializado da Assistência Farmacêutica (CEAF), com destaque para critérios de acesso, documentação necessária e aplicação prática por meio de estudos de caso."),
      paragrafo("Encerrando o ciclo, o terceiro encontro trouxe discussões sobre Gestão em Saúde e Avaliação de Tecnologias em Saúde (ATS), abordando ferramentas como revisões sistemáticas, pareceres técnico-científicos e notas técnicas rápidas."),
      paragrafo("A iniciativa destaca o protagonismo dos ligantes e reforça o compromisso da LIGATS com a formação crítica e qualificada na área da saúde!"),
    ],
  },
  {
    data: "2026-09-10",
    publicadoEm: "2026-09-10T09:00:00",
    titulo: "LIGATS marca presença na 14ª SIAc com apresentações de alto impacto científico",
    descricaoCurta: "Discentes da Liga Acadêmica de Avaliação de Tecnologias em Saúde (LIGATS) apresentam trabalhos inovadores sobre saúde pública na Semana de Integração Acadêmica da UFRJ 2025.",
    capa: imagem("image5.jpg"),
    blocos: [
      duasImagens(imagem("image6.jpg"), imagem("image12.jpg")),
      paragrafo("Durante a 14ª Semana de Integração Acadêmica da UFRJ (SIAc), os membros da Ligats marcaram presença com a apresentação de importantes temas com a supervisão de docentes do GEESFAR/NATS/UFRJ. O evento serviu como vitrine para demonstrar o que tem sido desenvolvido pela LIGATS no contexto do ensino, pesquisa e extensão no campo da ATS e Saúde Pública."),
      paragrafo("Os trabalhos apresentados abordaram temas cruciais para o Sistema Único de Saúde (SUS), refletindo o compromisso da LIGATS com a formação de profissionais críticos e capacitados para a tomada de decisão baseada em evidências científicas."),
      paragrafo("Trabalhos Apresentados pelos Ligantes:"),
      imagem("image9.jpg"),
      paragrafo("Parabéns aos ligantes Thiago Tenreiro e João Pedro Pacheco que receberam menção honrosa pela apresentação de seus respectivos trabalhos orientados pela Profa. Dra. Isabella Piassi Dias Godói. Ressalta-se que este evento tem previsão para realização anual e foi o primeiro de muitos outros!"),
    ],
  },
];

const button = document.querySelector("#importar");
const status = document.querySelector("#status");
const resultList = document.querySelector("#resultado");

const setStatus = (text, className = "") => {
  status.textContent = text;
  status.className = className;
};

const addResult = (text, className = "") => {
  const item = document.createElement("li");
  item.textContent = text;
  item.className = className;
  resultList.appendChild(item);
};

const collectFiles = (noticia) => {
  const files = new Set([noticia.capa.arquivo]);

  noticia.blocos.forEach((bloco) => {
    if (bloco.arquivo) files.add(bloco.arquivo);
    (bloco.imagens || []).forEach((item) => files.add(item.arquivo));
  });

  return [...files];
};

const uploadFile = async (newsIndex, fileName) => {
  const response = await fetch(`${ASSET_ROOT}/${encodeURIComponent(fileName)}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Não foi possível carregar ${fileName} (${response.status}).`);

  const fileBlob = await response.blob();
  const path = `noticias/importacao-setembro-2026/noticia-${String(newsIndex + 1).padStart(2, "0")}-${fileName.toLowerCase()}`;
  const { data, error } = await supabase.storage.from(BUCKET).upload(path, fileBlob, {
    cacheControl: "3600",
    contentType: fileBlob.type || undefined,
    upsert: true,
  });

  if (error) throw error;
  return data.path;
};

const resolveBlock = (block, paths) => {
  if (block.tipo === "paragrafo") return block;
  if (block.tipo === "imagem") {
    return { tipo: "imagem", path: paths[block.arquivo], legenda: block.legenda || "" };
  }

  return {
    tipo: block.tipo,
    imagens: block.imagens.map((item) => ({
      path: paths[item.arquivo],
      legenda: item.legenda || "",
    })),
  };
};

const importNews = async (noticia, index) => {
  setStatus(`Enviando imagens da notícia ${index + 1} de ${noticias.length}…`);
  const paths = {};

  for (const fileName of collectFiles(noticia)) {
    paths[fileName] = await uploadFile(index, fileName);
  }

  setStatus(`Salvando a notícia ${index + 1} de ${noticias.length}…`);
  const content = {
    id: `noticia-${gerarSlug(noticia.titulo)}`,
    tipo: "noticia",
    titulo: noticia.titulo,
    descricaoCurta: noticia.descricaoCurta,
    descricaoLonga: "",
    imagem: paths[noticia.capa.arquivo],
    legendaCapa: noticia.capa.legenda || "",
    autores: [AUTHOR],
    palavrasChave: [],
    publicadoEm: noticia.publicadoEm,
    data: noticia.data,
    blocos: noticia.blocos.map((block) => resolveBlock(block, paths)),
  };

  return salvarConteudo(content);
};

const validateAdmin = async () => {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  if (!sessionData.session) {
    const redirect = encodeURIComponent(window.location.pathname);
    setStatus("Sessão não encontrada. Entre no painel e volte para esta página.", "erro");
    const link = document.createElement("a");
    link.href = `/pages/login.html?redirect=${redirect}`;
    link.textContent = "Entrar no painel";
    status.append(" ", link);
    return false;
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");
  if (adminError) throw adminError;
  if (isAdmin !== true) throw new Error("A conta conectada não possui permissão administrativa.");
  return true;
};

button.addEventListener("click", async () => {
  button.disabled = true;
  resultList.replaceChildren();

  try {
    if (!(await validateAdmin())) return;

    for (let index = 0; index < noticias.length; index += 1) {
      const saved = await importNews(noticias[index], index);
      addResult(`${index + 1}. ${saved.titulo}`, "sucesso");
    }

    setStatus("Importação concluída: as oito notícias foram salvas no Supabase.", "sucesso");
    button.hidden = true;
  } catch (error) {
    console.error("Erro na importação:", error);
    setStatus(`A importação parou: ${error.message || error}`, "erro");
    button.disabled = false;
  }
});

try {
  if (await validateAdmin()) {
    button.hidden = false;
    setStatus("Sessão administrativa confirmada. Clique no botão para iniciar.");
  }
} catch (error) {
  console.error("Erro ao validar administrador:", error);
  setStatus(`Não foi possível validar a sessão: ${error.message || error}`, "erro");
}
