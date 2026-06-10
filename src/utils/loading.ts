// Garante um tempo mínimo de exibição para a Promise informada, evitando que
// spinners de carregamento pisquem na tela quando a resposta é muito rápida.
export async function withMinDuration<T>(promise: Promise<T>, ms = 400): Promise<T> {
  const [result] = await Promise.all([promise, new Promise(resolve => setTimeout(resolve, ms))])
  return result
}
