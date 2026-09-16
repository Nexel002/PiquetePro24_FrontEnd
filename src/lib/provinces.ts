// As 11 províncias de Moçambique (10 províncias + Cidade de Maputo, que tem estatuto
// próprio). Conjunto fechado e estável — ao contrário de distrito/bairro (texto livre
// no backend, users_profile.district/neighborhood não são enum), isto justifica uma
// lista fixa em vez de um campo de texto.
export const MOZAMBIQUE_PROVINCES = [
  'Cidade de Maputo',
  'Maputo',
  'Gaza',
  'Inhambane',
  'Sofala',
  'Manica',
  'Tete',
  'Zambézia',
  'Nampula',
  'Cabo Delgado',
  'Niassa',
] as const
