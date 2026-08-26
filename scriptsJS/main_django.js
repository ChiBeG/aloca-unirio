import fs from "fs";
import path from "path";
import { carregaPredios } from "./predio.js";
import { carregaSalas } from "./sala.js";
import { carregaDisciplinas } from "./disciplina.js";
import {
  criaGradesHorarias,
  distribuiDisciplinasSalaFixa,
  distribuiDisciplinasSemSalaFixa,
} from "./distribuidor.js";
import { salvaGradesHorarias } from "./publicador.js";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const value = argv[i + 1];
    out[key] = value;
    i++;
  }
  return out;
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const diretorioBase = path.resolve(args.base ?? process.cwd());

  const prediosPath =
    args.predios ?? path.join(diretorioBase, "entrada", "unirio-predios.csv");
  const salasPath =
    args.salas ?? path.join(diretorioBase, "entrada", "unirio-salas.csv");
  const disciplinasPath =
    args.disciplinas ??
    path.join(diretorioBase, "entrada", "unirio-disciplinas-20252.csv");

  const saidaDir = path.join(diretorioBase, "saida");
  ensureDir(saidaDir);

  const predios = carregaPredios(prediosPath);
  const salas = carregaSalas(salasPath, predios);
  const disciplinas = carregaDisciplinas(disciplinasPath, salas, predios);

  criaGradesHorarias(salas);
  const disciplinasSalaFixa = disciplinas.filter((d) => d.salaFixa);
  distribuiDisciplinasSalaFixa(salas, disciplinasSalaFixa);
  const disciplinasSemSalaFixa = disciplinas.filter((d) => !d.salaFixa);
  distribuiDisciplinasSemSalaFixa(salas, disciplinasSemSalaFixa, [
    ...disciplinasSalaFixa,
  ]);

  salvaGradesHorarias(diretorioBase, salas);

  const htmlPath = path.join(saidaDir, "grades_horarias.html");
  const html = fs.readFileSync(htmlPath, "utf-8");
  process.stdout.write(html);
}

main();

