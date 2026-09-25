// Curated emoji set for subjects, covering a Brazilian medical school
// curriculum from the basic cycle through internship. Subject.emoji only
// ever holds one of these (validated on write), so the picker, the
// suggestion and the stored value never drift apart.

export type SubjectEmoji = { emoji: string; label: string };

export const EMOJI_GROUPS: { title: string; items: SubjectEmoji[] }[] = [
  {
    title: "Ciclo básico",
    items: [
      { emoji: "💀", label: "Anatomia" },
      { emoji: "🔬", label: "Histologia / Patologia" },
      { emoji: "🧫", label: "Biologia celular" },
      { emoji: "🐣", label: "Embriologia" },
      { emoji: "⚡", label: "Fisiologia" },
      { emoji: "🧪", label: "Bioquímica" },
      { emoji: "🧬", label: "Genética" },
      { emoji: "⚛️", label: "Biofísica" },
      { emoji: "🦠", label: "Microbiologia" },
      { emoji: "🪱", label: "Parasitologia" },
      { emoji: "🛡️", label: "Imunologia" },
      { emoji: "💊", label: "Farmacologia" },
    ],
  },
  {
    title: "Clínica",
    items: [
      { emoji: "🩺", label: "Clínica médica / Semiologia" },
      { emoji: "🫀", label: "Cardiologia" },
      { emoji: "🫁", label: "Pneumologia" },
      { emoji: "🧠", label: "Neurologia" },
      { emoji: "🫘", label: "Nefrologia" },
      { emoji: "🦋", label: "Endocrinologia" },
      { emoji: "🍽️", label: "Gastroenterologia" },
      { emoji: "🩸", label: "Hematologia" },
      { emoji: "🎗️", label: "Oncologia" },
      { emoji: "🤲", label: "Reumatologia" },
      { emoji: "🤒", label: "Infectologia" },
      { emoji: "🦟", label: "Doenças tropicais" },
      { emoji: "🧴", label: "Dermatologia" },
      { emoji: "🤧", label: "Alergia" },
    ],
  },
  {
    title: "Cirurgia",
    items: [
      { emoji: "✂️", label: "Cirurgia geral" },
      { emoji: "🧤", label: "Técnica operatória" },
      { emoji: "😴", label: "Anestesiologia" },
      { emoji: "🦴", label: "Ortopedia / Traumatologia" },
      { emoji: "👁️", label: "Oftalmologia" },
      { emoji: "👂", label: "Otorrinolaringologia" },
      { emoji: "💧", label: "Urologia" },
      { emoji: "✨", label: "Cirurgia plástica" },
    ],
  },
  {
    title: "Mulher e criança",
    items: [
      { emoji: "🌸", label: "Ginecologia / Saúde da mulher" },
      { emoji: "🤰", label: "Obstetrícia" },
      { emoji: "👶", label: "Pediatria / Saúde da criança" },
      { emoji: "🍼", label: "Neonatologia / Puericultura" },
    ],
  },
  {
    title: "Mente, sociedade e ética",
    items: [
      { emoji: "💭", label: "Psiquiatria / Psicologia médica" },
      { emoji: "🌍", label: "Saúde coletiva" },
      { emoji: "🏡", label: "Medicina de família" },
      { emoji: "📊", label: "Epidemiologia / Bioestatística" },
      { emoji: "⚖️", label: "Ética / Medicina legal" },
      { emoji: "👴", label: "Geriatria" },
      { emoji: "👷", label: "Medicina do trabalho" },
      { emoji: "🥗", label: "Nutrologia" },
      { emoji: "🏃", label: "Medicina esportiva" },
      { emoji: "☠️", label: "Toxicologia" },
    ],
  },
  {
    title: "Urgência, internato e carreira",
    items: [
      { emoji: "🚑", label: "Urgência e emergência" },
      { emoji: "🚨", label: "Terapia intensiva / UTI" },
      { emoji: "🩻", label: "Radiologia / Imagem" },
      { emoji: "🏥", label: "Internato" },
      { emoji: "🎯", label: "Residência" },
      { emoji: "📚", label: "Metodologia / Pesquisa" },
      { emoji: "🎓", label: "TCC" },
    ],
  },
];

export const ALL_SUBJECT_EMOJIS = EMOJI_GROUPS.flatMap((g) => g.items.map((i) => i.emoji));

export function isSubjectEmoji(value: string) {
  return ALL_SUBJECT_EMOJIS.includes(value);
}

// Name → emoji, first match wins, so more specific patterns come first
// ("cirurgia pediátrica" is surgery; "saúde da mulher" isn't generic).
const SUGGESTIONS: [RegExp, string][] = [
  [/plastic/, "✨"],
  [/cirurg/, "✂️"],
  [/\btcc\b|conclusao de curso/, "🎓"],
  [/saude da mulher|ginec/, "🌸"],
  [/saude da crianca|pediat|infantil/, "👶"],
  [/neonat|puericult/, "🍼"],
  [/obstet|gestac|pre-?natal/, "🤰"],
  [/operat|tecnica/, "🧤"],
  [/anestes/, "😴"],
  [/ortop|traumato/, "🦴"],
  [/oftalm|olho/, "👁️"],
  [/otorr/, "👂"],
  [/urolog/, "💧"],
  [/cardio/, "🫀"],
  [/pneumo|respirat/, "🫁"],
  [/psiq|psicol|saude mental/, "💭"],
  [/neuro/, "🧠"],
  [/nefro|renal/, "🫘"],
  [/endocr|metabol|tireo/, "🦋"],
  [/gastro|digest|hepat/, "🍽️"],
  [/hemato/, "🩸"],
  [/onco|cancer/, "🎗️"],
  [/reumat/, "🤲"],
  [/tropica/, "🦟"],
  [/infect/, "🤒"],
  [/dermat/, "🧴"],
  [/alerg/, "🤧"],
  [/familia|comunidade|mfc/, "🏡"],
  [/coletiva|saude publica/, "🌍"],
  [/epidemio|bioestat|estatist/, "📊"],
  [/\b(bio)?etica\b|legal|deontolog/, "⚖️"],
  [/geriat|idoso/, "👴"],
  [/trabalho|ocupacion/, "👷"],
  [/nutri/, "🥗"],
  [/esport/, "🏃"],
  [/toxic/, "☠️"],
  [/urgen|emergen|trauma|atls/, "🚑"],
  [/\buti\b|intensiv/, "🚨"],
  [/radiol|imagem/, "🩻"],
  [/internato/, "🏥"],
  [/residen/, "🎯"],
  [/metodolog|pesquisa|cientific/, "📚"],
  [/anatom/, "💀"],
  [/histol|patolog/, "🔬"],
  [/celular|citolog/, "🧫"],
  [/embriol/, "🐣"],
  [/fisiol/, "⚡"],
  [/bioquim/, "🧪"],
  [/genet|molecular/, "🧬"],
  [/biofis/, "⚛️"],
  [/microbio/, "🦠"],
  [/parasit/, "🪱"],
  [/imuno/, "🛡️"],
  [/farmaco/, "💊"],
  [/semiol|clinica|propedeut/, "🩺"],
];

/** Best-guess emoji for a subject name, or null when nothing matches. */
export function suggestSubjectEmoji(name: string): string | null {
  const normalized = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  return SUGGESTIONS.find(([pattern]) => pattern.test(normalized))?.[1] ?? null;
}

export function emojiLabel(emoji: string) {
  return EMOJI_GROUPS.flatMap((g) => g.items).find((i) => i.emoji === emoji)?.label ?? "";
}
