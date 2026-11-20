import { createContext, useContext } from 'react';

// Banco, usuário (nulo até existir login) e ação para recarregar o estoque depois de uma operação.
export const SessaoContext = createContext({ db: null, usuario: null, recarregar: async () => {} });
export const useSessao = () => useContext(SessaoContext);
