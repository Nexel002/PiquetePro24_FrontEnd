// O que a pessoa escolheu no registo e precisa de sobreviver até depois do login. Fora de
// `pages/Login.tsx` para o AuthCallback não importar uma página só para ler duas chaves (e
// para o Fast Refresh do Vite continuar a funcionar nesse ficheiro de componente).

export type Canal = 'email' | 'phone'
export type PapelPretendido = 'CLIENT' | 'PROFESSIONAL'
export type TipoProfissionalPretendido = 'SINGULAR' | 'COMPANY'

// signInWithOAuth não deixa passar metadados como o signUp() deixa, por isso a escolha
// "Sou profissional" vai para sessionStorage e o AuthCallback aplica-a quando o Google devolve
// a pessoa à app.
export const INTENDED_ROLE_STORAGE_KEY = 'piquetepro24:intended-role'
export const INTENDED_PROFESSIONAL_TYPE_STORAGE_KEY = 'piquetepro24:intended-professional-type'
