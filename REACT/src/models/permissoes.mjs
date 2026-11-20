// Ponto único para controlar quem acessa o dashboard. Hoje é livre; quando o login existir,
// basta decidir aqui (por exemplo, usuario?.perfil === 'Gerente').
export function podeVerDashboard() {
  return true;
}
