export function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

export function formatarCpf(valor: string): string {
  const digitos = apenasDigitos(valor).slice(0, 11);
  return digitos
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function cpfValido(valor: string): boolean {
  const digitos = apenasDigitos(valor);
  if (digitos.length !== 11) {
    return false;
  }
  if (/^(\d)\1{10}$/.test(digitos)) {
    return false;
  }

  const calcularDigito = (base: string, pesoInicial: number): number => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) {
      soma += parseInt(base[i], 10) * (pesoInicial - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  const digito1 = calcularDigito(digitos.slice(0, 9), 10);
  if (digito1 !== parseInt(digitos[9], 10)) {
    return false;
  }
  const digito2 = calcularDigito(digitos.slice(0, 10), 11);
  return digito2 === parseInt(digitos[10], 10);
}
