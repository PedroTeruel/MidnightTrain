import { useColorScheme } from 'react-native';

export const nomesCondicao = ['Não avaliada', 'Boa', 'Atenção', 'Ruim'];

const claro = {
  condicao: ['#c3c7d0', '#3ea67a', '#f0b04a', '#e0605a'],
  movimento: ['#2a78d6', '#eb6834', '#1baf7a'],
  trilho: '#e6e6ec', borda: '#d8d8de',
  bom: { bg: '#e1f5ea', fg: '#14693a' }, ruim: { bg: '#fde4e3', fg: '#a01f1f' }, neutro: { bg: '#ececf1', fg: '#55555c' },
  pendente: { bg: '#e3edfb', fg: '#0a4fb3' }, aprovado: { bg: '#e1f5ea', fg: '#14693a' }, reprovado: { bg: '#fde4e3', fg: '#a01f1f' },
  aviso: { bg: '#fdf0dc', fg: '#9a5b00' },
};
const escuro = {
  condicao: ['#6b7080', '#4cc38f', '#f5bf63', '#ff7b73'],
  movimento: ['#3987e5', '#d95926', '#199e70'],
  trilho: '#2c2c30', borda: '#38383c',
  bom: { bg: '#143322', fg: '#7fe0a5' }, ruim: { bg: '#3d1c1c', fg: '#ff9a9a' }, neutro: { bg: '#2c2c30', fg: '#b2b2b8' },
  pendente: { bg: '#14284a', fg: '#8ab8ff' }, aprovado: { bg: '#143322', fg: '#7fe0a5' }, reprovado: { bg: '#3d1c1c', fg: '#ff9a9a' },
  aviso: { bg: '#3d2e12', fg: '#f5bf63' },
};

export function usePaleta() {
  return useColorScheme() === 'dark' ? escuro : claro;
}

export function corDaCondicao(paleta, nome) {
  return paleta.condicao[Math.max(0, nomesCondicao.indexOf(nome))];
}

export function formatarSegundos(s) {
  if (s == null) return '—';
  if (s < 120) return `${s} s`;
  return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`;
}
