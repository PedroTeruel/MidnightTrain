
const API_URL = 'http://127.0.0.1:3000';

export async function autenticarDemo(email, senha) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const resposta = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        senha,
      }),
      signal: controller.signal,
    });

    if (resposta.status === 401) {
      throw new Error('E-mail ou senha inválidos.');
    }

    if (resposta.status === 429) {
      throw new Error('Muitas tentativas. Tente novamente mais tarde.');
    }

    if (!resposta.ok) {
      throw new Error('Não foi possível autenticar. Tente novamente.');
    }

    const dados = await resposta.json();
    const usuario = dados.usuario;

    if (!dados.token || !usuario) {
      throw new Error('Resposta inválida do servidor.');
    }

    const perfis = {
      EMPLOYEE: 'FUNCIONARIO',
      MANAGER: 'GERENTE',
    };

    const perfil = perfis[usuario.role];

    if (!perfil) {
      throw new Error('Perfil de usuário não autorizado.');
    }

    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil,
      token: dados.token,
    };
  } catch (erro) {
    if (erro.name === 'AbortError') {
      throw new Error('O servidor demorou para responder.');
    }

    if (erro.message === 'Network request failed') {
      throw new Error('Não foi possível conectar ao servidor.');
    }

    throw erro;
  } finally {
    clearTimeout(timeout);
  }
}
